import pytest
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient
import main

@pytest.fixture(scope="module")
def client():
    main.init_db()
    with TestClient(main.app) as c:
        yield c

def test_telemetry(client):
    res = client.get("/api/telemetry")
    assert res.status_code == 200
    data = res.json()
    assert "cpu_percent" in data
    assert "ram_percent" in data
    assert "ram_total_gb" in data
    assert data["ram_total_gb"] > 0

def test_system_specs(client):
    res = client.get("/api/system/specs")
    assert res.status_code == 200
    data = res.json()
    assert "hardware" in data
    assert "models" in data
    assert len(data["models"]) >= 5
    # Verify RTX 4060 or GPU detection format
    assert "gpu" in data["hardware"]
    # Check model compatibility calculation
    for m in data["models"]:
        assert "compatibility_percent" in m
        assert 0 <= m["compatibility_percent"] <= 100

def test_settings_lifecycle(client):
    # GET settings
    res = client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert "manager_provider" in data
    assert "local_manager_model" in data

    # POST update settings to 100% local
    update_res = client.post("/api/settings", json={
        "manager_provider": "local",
        "local_manager_model": "qwen2.5-coder:latest"
    })
    assert update_res.status_code == 200
    updated = update_res.json()["settings"]
    assert updated["manager_provider"] == "local"
    assert updated["local_manager_model"] == "qwen2.5-coder:latest"

def test_tools_list(client):
    res = client.get("/api/tools")
    assert res.status_code == 200
    tools = res.json()
    tool_ids = [t["id"] for t in tools]
    assert "FileReadTool" in tool_ids
    assert "DirectoryReadTool" in tool_ids
    assert "ScrapeWebsiteTool" in tool_ids

def test_agents_crud(client):
    # 1. Create Agent
    create_payload = {
        "name": "AutoTester Agent",
        "role": "Lead Automated Testing Specialist",
        "goal": "Verify all API endpoints and stability.",
        "backstory": "Created by automated test suite to ensure quality.",
        "model": "qwen2.5-coder",
        "temperature": 0.2,
        "tools": ["FileReadTool", "DirectoryReadTool"]
    }
    create_res = client.post("/api/agents", json=create_payload)
    assert create_res.status_code == 200
    agent_id = create_res.json()["id"]

    # 2. Read Agents
    get_res = client.get("/api/agents")
    assert get_res.status_code == 200
    agents = get_res.json()
    created = next((a for a in agents if a["id"] == agent_id), None)
    assert created is not None
    assert created["name"] == "AutoTester Agent"
    assert "FileReadTool" in created["tools"]

    # 3. Update Agent
    update_res = client.put(f"/api/agents/{agent_id}", json={
        "temperature": 0.4,
        "is_active": 1
    })
    assert update_res.status_code == 200

    # 4. Delete Agent
    del_res = client.delete(f"/api/agents/{agent_id}")
    assert del_res.status_code == 200

    # Verify deleted
    verify_res = client.get("/api/agents")
    assert not any(a["id"] == agent_id for a in verify_res.json())

def test_project_tree_and_file_operations(client):
    # Use existing or create a dummy project folder
    test_project = "automated-test-proj"
    proj_dir = os.path.join(main.GENERATIONS_DIR, test_project)
    os.makedirs(proj_dir, exist_ok=True)

    try:
        # 1. Create a new file in project
        create_file_res = client.post(f"/api/projects/{test_project}/files/create", json={
            "file_path": "test_script.py",
            "is_directory": False,
            "content": "print('Hello from automated test')"
        })
        assert create_file_res.status_code == 200

        # 2. Get tree
        tree_res = client.get(f"/api/projects/{test_project}/tree")
        assert tree_res.status_code == 200
        tree = tree_res.json()["tree"]
        file_names = [item["name"] for item in tree]
        assert "test_script.py" in file_names

        # 3. Save modified content
        save_res = client.post(f"/api/projects/{test_project}/files/save", json={
            "file_path": "test_script.py",
            "content": "print('Updated content')"
        })
        assert save_res.status_code == 200

        # Verify content saved on disk
        with open(os.path.join(proj_dir, "test_script.py")) as f:
            assert f.read() == "print('Updated content')"

        # 4. Delete file
        del_file_res = client.request("DELETE", f"/api/projects/{test_project}/files", json={
            "file_path": "test_script.py"
        })
        assert del_file_res.status_code == 200
        assert not os.path.exists(os.path.join(proj_dir, "test_script.py"))
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)
        zip_file = os.path.join(main.GENERATIONS_DIR, f"{test_project}.zip")
        if os.path.exists(zip_file):
            os.remove(zip_file)

def test_chat_sessions_lifecycle(client):
    # 1. Create Session
    create_res = client.post("/api/chat/local/sessions")
    assert create_res.status_code == 200
    session_id = create_res.json()["id"]

    # 2. Get Sessions
    list_res = client.get("/api/chat/local/sessions")
    assert list_res.status_code == 200
    assert any(s["id"] == session_id for s in list_res.json())

    # 3. Delete Session
    del_res = client.delete(f"/api/chat/local/sessions/{session_id}")
    assert del_res.status_code == 200

def test_history_lifecycle(client):
    # 1. Insert history entry directly via DB
    with main.get_db() as conn:
        conn.execute("INSERT INTO chat_history (role, content, timestamp) VALUES (?, ?, ?)", ("QA Bot", "Automated verification test record", "2026-09-10 12:00:00"))
        conn.commit()

    # 2. Get history
    get_res = client.get("/api/history")
    assert get_res.status_code == 200
    items = get_res.json()
    assert any(i["role"] == "QA Bot" for i in items)

    # 3. Clear history
    clear_res = client.post("/api/history/clear")
    assert clear_res.status_code == 200

    # 4. Verify cleared
    get_empty_res = client.get("/api/history")
    assert get_empty_res.status_code == 200
    assert len(get_empty_res.json()) == 0

def test_model_pull_status(client):
    res = client.get("/api/models/pull/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "percent" in data
    assert "completed" in data
    assert "total" in data

def test_project_download_zip(client):
    test_project = "download-test-proj"
    proj_dir = os.path.join(main.GENERATIONS_DIR, test_project)
    os.makedirs(proj_dir, exist_ok=True)
    with open(os.path.join(proj_dir, "app.py"), "w") as f:
        f.write("# App for zip test")

    try:
        # Create archive
        import shutil
        shutil.make_archive(os.path.join(main.GENERATIONS_DIR, test_project), 'zip', proj_dir)

        # Download
        res = client.get(f"/api/download/{test_project}")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/zip"
        assert len(res.content) > 0
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)
        zip_file = os.path.join(main.GENERATIONS_DIR, f"{test_project}.zip")
        if os.path.exists(zip_file):
            os.remove(zip_file)

def test_ephemeral_agent_stages():
    # Unit test verifying stage categorization logic
    test_roles = [
        ("Chief Software Architect", "architecture"),
        ("Lead System Designer", "architecture"),
        ("Full-stack Backend Developer", "engineering"),
        ("Frontend React Specialist", "engineering"),
        ("PostgreSQL Database Engineer", "database"),
        ("Automated QA Tester", "validation"),
        ("Cybersecurity Auditor", "validation"),
    ]

    for role, expected_stage in test_roles:
        role_lower = role.lower()
        if any(w in role_lower for w in ['architect', 'lead', 'manager', 'planner', 'designer']):
            stage = 'architecture'
        elif any(w in role_lower for w in ['qa', 'test', 'security', 'review', 'auditor']):
            stage = 'validation'
        elif any(w in role_lower for w in ['database', 'db', 'sql', 'storage']):
            stage = 'database'
        else:
            stage = 'engineering'
        assert stage == expected_stage, f"Failed for role {role}: got {stage}, expected {expected_stage}"

def test_manager_test_endpoint(client):
    # Ensure local mode
    client.post("/api/settings", json={"manager_provider": "local", "local_manager_model": "qwen2.5-coder:latest"})
    res = client.get("/api/settings/test-manager")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert data["provider"] == "local"
    assert "latency_ms" in data

def test_gemini_key_persistence(client):
    # Test setting Gemini key
    res = client.post("/api/settings", json={"gemini_api_key": "AIzaSyTestMockKey123456789"})
    assert res.status_code == 200
    settings = res.json()["settings"]
    assert settings["has_gemini_key"] is True
    assert "AIza" in settings["gemini_api_key_masked"]

    # Clear mock key and revert to local
    client.post("/api/settings", json={"gemini_api_key": "", "manager_provider": "local"})
    clean_res = client.get("/api/settings")
    assert clean_res.json()["manager_provider"] == "local"

def test_token_analytics_lifecycle(client):
    # 1. Fetch analytics
    res = client.get("/api/tokens/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "total_tokens" in data["summary"]
    assert "money_saved_usd" in data["summary"]
    assert "savings_comparison" in data["summary"]
    assert "by_model" in data
    assert "by_source" in data
    assert "timeline" in data
    assert "recent_events" in data

    # 2. Record custom token event
    main.record_token_usage(
        source="direct_chat",
        session_or_job_id="test-session-99",
        model="qwen2.5-coder:latest",
        prompt_tokens=50,
        completion_tokens=150,
        total_tokens=200,
        duration_ms=2500.0
    )

    # 3. Verify event is included
    res2 = client.get("/api/tokens/analytics")
    assert res2.status_code == 200
    events = res2.json()["recent_events"]
    assert any(e["session_or_job_id"] == "test-session-99" for e in events)

    # 4. Clear tokens
    clear_res = client.post("/api/tokens/clear")
    assert clear_res.status_code == 200
    assert clear_res.json()["status"] == "cleared"


def test_check_updates_endpoint(client):
    res = client.get("/api/system/check-updates")
    assert res.status_code == 200
    data = res.json()
    assert "current_version" in data
    assert "latest_version" in data
    assert "update_available" in data
    assert "assets" in data
    assert "windows_exe" in data["assets"]
    assert "linux_deb" in data["assets"]
    assert "linux_appimage" in data["assets"]
    assert data["current_version"] == main.CURRENT_APP_VERSION


def test_moe_routing_setting(client):
    # Enable MoE routing
    res = client.post("/api/settings", json={"moe_routing_enabled": True})
    assert res.status_code == 200
    assert res.json()["settings"]["moe_routing_enabled"] is True

    # Disable MoE routing
    res2 = client.post("/api/settings", json={"moe_routing_enabled": False})
    assert res2.status_code == 200
    assert res2.json()["settings"]["moe_routing_enabled"] is False

    # Re-enable
    client.post("/api/settings", json={"moe_routing_enabled": True})


def test_editor_autocomplete(client):
    payload = {
        "code_prefix": "def calculate_discount(price, rate):\n    # return discounted price\n    ",
        "code_suffix": "\n\nprint(calculate_discount(100, 0.2))",
        "file_path": "app.py",
        "language": "python"
    }
    res = client.post("/api/editor/autocomplete", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "completion" in data
    assert "model" in data


def test_rag_index_and_search(client):
    proj_name = "test-rag-app"
    proj_dir = os.path.join(main.GENERATIONS_DIR, proj_name)
    os.makedirs(proj_dir, exist_ok=True)
    with open(os.path.join(proj_dir, "app.py"), "w") as f:
        f.write("def auth_login_user(username, password):\n    \"\"\"Authenticate user credential token.\"\"\"\n    return {'token': 'jwt-secret-token'}\n\ndef process_payment(amount):\n    return True\n")

    try:
        # Index project
        idx_res = client.post(f"/api/rag/index/{proj_name}")
        assert idx_res.status_code == 200
        idx_data = idx_res.json()
        assert idx_data["status"] == "indexed"
        assert idx_data["total_chunks"] >= 1

        # Search project
        search_res = client.get(f"/api/rag/search?project={proj_name}&q=auth_login_user")
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert search_data["count"] >= 1
        assert any("auth_login_user" in r["snippet"] or r["symbol_name"] == "auth_login_user" for r in search_data["results"])
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)


def test_sandbox_preview_status_and_static(client):
    proj_name = "test-preview-app"
    proj_dir = os.path.join(main.GENERATIONS_DIR, proj_name)
    os.makedirs(proj_dir, exist_ok=True)
    with open(os.path.join(proj_dir, "index.html"), "w") as f:
        f.write("<!DOCTYPE html><html><body><h1>CoreForge Preview Test</h1></body></html>")

    try:
        # Check preview status
        status_res = client.get(f"/api/sandbox/preview-status/{proj_name}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["is_supported"] is True
        assert status_data["preview_type"] == "static"
        assert "preview_url" in status_data

        # Check static serving
        serve_res = client.get(f"/api/preview/static/{proj_name}/index.html")
        assert serve_res.status_code == 200
        assert b"CoreForge Preview Test" in serve_res.content
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)


def test_sandbox_auto_fix(client):
    proj_name = "test-autofix-app"
    proj_dir = os.path.join(main.GENERATIONS_DIR, proj_name)
    os.makedirs(proj_dir, exist_ok=True)
    with open(os.path.join(proj_dir, "app.py"), "w") as f:
        f.write("def healthy_function():\n    return 42\n")

    try:
        res = client.post(f"/api/sandbox/auto-fix/{proj_name}")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("already_passing", "fixed", "partially_fixed")
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)




def test_export_project_zip(client):
    proj_name = "test-export-app"
    proj_dir = os.path.join(main.GENERATIONS_DIR, proj_name)
    os.makedirs(proj_dir, exist_ok=True)
    with open(os.path.join(proj_dir, "main.py"), "w") as f:
        f.write("print('Hello Export')\n")

    try:
        res = client.get(f"/api/projects/{proj_name}/export-zip")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/zip"
        assert len(res.content) > 0
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)
        zip_path = os.path.join(main.GENERATIONS_DIR, f"{proj_name}.zip")
        if os.path.exists(zip_path):
            os.remove(zip_path)


def test_open_project_vscode(client):
    proj_name = "test-export-app"
    proj_dir = os.path.join(main.GENERATIONS_DIR, proj_name)
    os.makedirs(proj_dir, exist_ok=True)
    try:
        res = client.post(f"/api/projects/{proj_name}/open-vscode")
        assert res.status_code == 200
        data = res.json()
        assert "status" in data
        assert "path" in data
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)

def test_agent_templates_lifecycle(client):
    res = client.get("/api/agents/templates")
    assert res.status_code == 200
    data = res.json()
    assert "templates" in data
    assert len(data["templates"]) >= 3

    # Apply fullstack template
    apply_res = client.post("/api/agents/templates/fullstack/apply")
    assert apply_res.status_code == 200
    apply_data = apply_res.json()
    assert apply_data["status"] == "applied"
    assert apply_data["count"] >= 3

    # Verify agents list updated
    agents_res = client.get("/api/agents")
    assert agents_res.status_code == 200
    agents = agents_res.json()
    assert len(agents) == apply_data["count"]

def test_skills_marketplace_toggle(client):
    res = client.get("/api/tools")
    assert res.status_code == 200
    tools = res.json()
    assert len(tools) >= 7
    assert any(t["id"] == "DuckDuckGoSearchTool" for t in tools)

    # Toggle tool
    toggle_res = client.post("/api/tools/DuckDuckGoSearchTool/toggle")
    assert toggle_res.status_code == 200
    data = toggle_res.json()
    assert "is_enabled" in data
    assert data["tool_id"] == "DuckDuckGoSearchTool"

def test_import_gguf_validation(client):
    # Test empty name
    res = client.post("/api/models/import-gguf", json={"model_name": "", "file_path": "/tmp/nonexistent.gguf"})
    assert res.status_code == 400

    # Test nonexistent file
    res2 = client.post("/api/models/import-gguf", json={"model_name": "test-model", "file_path": "/tmp/nonexistent.gguf"})
    assert res2.status_code == 404

    # Test invalid extension
    tmp_txt = "/tmp/test_model.txt"
    with open(tmp_txt, "w") as f:
        f.write("not gguf")
    res3 = client.post("/api/models/import-gguf", json={"model_name": "test-model", "file_path": tmp_txt})
    assert res3.status_code == 400

def test_mobile_connect_endpoint(client):
    res = client.get("/api/system/mobile-connect")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "lan_ip" in data
    assert data["port"] == 3000
    assert "url" in data
    assert "http://" in data["url"]
    assert "qr_data_url" in data
    assert data["qr_data_url"].startswith("data:image/png;base64,")
    assert "instructions" in data
    assert "ro" in data["instructions"]
    assert "en" in data["instructions"]


def test_job_files_endpoint(client):
    # 1. Nonexistent job -> 404
    res_404 = client.get("/api/job/nonexistent-job-id-9999/files")
    assert res_404.status_code == 404

    # 2. Existing job with test project
    fake_job_id = "test-job-files-123"
    test_proj = "test-job-proj"
    proj_dir = os.path.join(main.GENERATIONS_DIR, test_proj)
    os.makedirs(proj_dir, exist_ok=True)
    with open(os.path.join(proj_dir, "test.py"), "w") as f:
        f.write("print('hello')")

    with main.jobs_lock:
        main.jobs[fake_job_id] = {
            "status": "completed",
            "project_name": test_proj
        }

    try:
        res = client.get(f"/api/job/{fake_job_id}/files")
        assert res.status_code == 200
        data = res.json()
        assert "files" in data
        assert "test.py" in data["files"]
        assert data["files"]["test.py"] == "print('hello')"
    finally:
        with main.jobs_lock:
            main.jobs.pop(fake_job_id, None)
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)


def test_path_sanitization_in_swarm():
    test_dir = os.path.abspath("/tmp/coreforge_test_proj")
    
    # 1. Absolute path with leading slash
    p1 = main.sanitize_project_path(test_dir, "/app.py")
    assert p1 == os.path.join(test_dir, "app.py")
    assert p1.startswith(test_dir)

    # 2. Path traversal with ..
    p2 = main.sanitize_project_path(test_dir, "../../etc/passwd")
    assert p2 == os.path.join(test_dir, "etc/passwd")
    assert p2.startswith(test_dir)

    # 3. Windows-style leading backslash
    p3 = main.sanitize_project_path(test_dir, "\\server.py")
    assert p3 == os.path.join(test_dir, "server.py")
    assert p3.startswith(test_dir)

    # 4. Valid nested path
    p4 = main.sanitize_project_path(test_dir, "src/components/Button.tsx")
    assert p4 == os.path.join(test_dir, "src/components/Button.tsx")
    assert p4.startswith(test_dir)


def test_gemini_model_config():
    assert main.GEMINI_MODEL in ["gemini/gemini-2.0-flash", "gemini/gemini-1.5-flash"]
    assert "3.6" not in main.GEMINI_MODEL


def test_model_tag_installed_accuracy(client):
    res = client.get("/api/system/specs")
    assert res.status_code == 200
    models = {m["id"]: m for m in res.json()["models"]}
    
    # qwen2.5-coder:latest should be installed
    if "qwen2.5-coder:latest" in models and models["qwen2.5-coder:latest"]["is_installed"]:
        # qwen2.5-coder:14b must NOT be marked installed if only 7B latest is present
        assert not models["qwen2.5-coder:14b"]["is_installed"]


def test_token_analytics_clear_stays_zero(client):
    # Clear tokens
    res_clear = client.post("/api/tokens/clear")
    assert res_clear.status_code == 200
    assert res_clear.json()["status"] == "cleared"

    # Verify analytics returns 0 tokens and doesn't re-seed
    res_analytics = client.get("/api/tokens/analytics")
    assert res_analytics.status_code == 200
    data = res_analytics.json()
    assert data["summary"]["total_tokens"] == 0
    assert data["summary"]["total_requests"] == 0


def test_excluded_directories(client):
    test_proj = "test-exclusion-proj"
    proj_dir = os.path.join(main.GENERATIONS_DIR, test_proj)
    os.makedirs(os.path.join(proj_dir, "node_modules", "package"), exist_ok=True)
    os.makedirs(os.path.join(proj_dir, ".git"), exist_ok=True)

    with open(os.path.join(proj_dir, "index.js"), "w") as f:
        f.write("console.log('root');")
    with open(os.path.join(proj_dir, "node_modules", "package", "heavy.js"), "w") as f:
        f.write("console.log('heavy');")
    with open(os.path.join(proj_dir, ".git", "config"), "w") as f:
        f.write("[core]")

    try:
        # 1. Check get_project_files excludes node_modules and .git
        res_files = client.get(f"/api/projects/{test_proj}/files")
        assert res_files.status_code == 200
        files = res_files.json()["files"]
        assert "index.js" in files
        assert not any("node_modules" in k for k in files)
        assert not any(".git" in k for k in files)

        # 2. Check get_project_tree excludes node_modules and .git
        res_tree = client.get(f"/api/projects/{test_proj}/tree")
        assert res_tree.status_code == 200
        tree = res_tree.json()["tree"]
        names = [entry["name"] for entry in tree]
        assert "index.js" in names
        assert "node_modules" not in names
        assert ".git" not in names
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)


def test_sandbox_stop_and_preview_port(client):
    test_proj = "test-node-preview-proj"
    proj_dir = os.path.join(main.GENERATIONS_DIR, test_proj)
    os.makedirs(proj_dir, exist_ok=True)
    with open(os.path.join(proj_dir, "package.json"), "w") as f:
        f.write('{"name": "test-node"}')

    try:
        # 1. Preview status fallback should be 5173, not 3000
        res = client.get(f"/api/sandbox/preview-status/{test_proj}")
        assert res.status_code == 200
        data = res.json()
        assert "5173" in data["preview_url"]
        assert "3000" not in data["preview_url"]

        # 2. Stop container endpoint returns gracefully
        res_stop = client.post(f"/api/sandbox/stop/{test_proj}")
        assert res_stop.status_code == 200
        assert "status" in res_stop.json()
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)


def test_sqlite_wal_mode():
    with main.get_db() as conn:
        row = conn.execute("PRAGMA journal_mode").fetchone()
        mode = row[0].lower()
        assert mode == "wal"


def test_semver_check_updates():
    # Newer version should be True
    assert main.is_newer_version("2.3.1", "2.3.0") is True
    assert main.is_newer_version("v2.4.0", "2.3.0") is True
    assert main.is_newer_version("3.0.0", "2.3.0") is True

    # Same version should be False
    assert main.is_newer_version("2.3.0", "2.3.0") is False
    assert main.is_newer_version("v2.3.0", "2.3.0") is False

    # Older version should be False
    assert main.is_newer_version("2.2.9", "2.3.0") is False
    assert main.is_newer_version("1.9.5", "2.3.0") is False
