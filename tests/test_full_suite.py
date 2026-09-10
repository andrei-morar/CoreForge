import pytest
import os
import sys
import json
import uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient
import main

@pytest.fixture(scope="module")
def client():
    main.init_db()
    with TestClient(main.app) as c:
        yield c

def test_run_agent_validation(client):
    # Test empty prompt returns 400
    res = client.post("/api/run-agent", json={"prompt": ""})
    assert res.status_code == 400
    assert "Prompt cannot be empty" in res.json()["detail"]

    res_whitespace = client.post("/api/run-agent", json={"prompt": "   "})
    assert res_whitespace.status_code == 400

def test_job_polling_endpoint(client):
    # Test non-existent job returns 404
    fake_job_id = str(uuid.uuid4())
    res_404 = client.get(f"/api/job/{fake_job_id}")
    assert res_404.status_code == 404

    # Manually register a dummy job and poll it
    with main.jobs_lock:
        main.jobs[fake_job_id] = {
            "status": "running",
            "result": None,
            "error": None,
            "created_at": "2026-09-10T12:00:00"
        }
    
    res_200 = client.get(f"/api/job/{fake_job_id}")
    assert res_200.status_code == 200
    data = res_200.json()
    assert data["job_id"] == fake_job_id
    assert data["status"] == "running"
    
    # Cleanup
    with main.jobs_lock:
        main.jobs.pop(fake_job_id, None)

def test_history_crud_lifecycle(client):
    # 1. Insert a message into history
    main.save_message("User", "Test user question")
    main.save_message("Assistant", "Test AI response")

    # 2. Retrieve history
    res = client.get("/api/history")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert any(m["role"] == "User" and "Test user question" in m["content"] for m in data)

    # 3. Clear history
    clear_res = client.post("/api/history/clear")
    assert clear_res.status_code == 200
    assert clear_res.json()["status"] == "cleared"

    # 4. Verify cleared
    res_after = client.get("/api/history")
    assert res_after.status_code == 200
    assert len(res_after.json()) == 0

def test_chat_sessions_and_messages_endpoints(client):
    # 1. Create a session
    create_res = client.post("/api/chat/local/sessions", json={"title": "Full Suite Session"})
    assert create_res.status_code == 200
    session_data = create_res.json()
    assert "id" in session_data
    session_id = session_data["id"]
    assert session_data["title"] == "New Chat"

    # 2. List sessions
    list_res = client.get("/api/chat/local/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert any(s["id"] == session_id for s in sessions)

    # 3. Add a message directly to DB for this session
    with main.get_db() as conn:
        conn.execute(
            "INSERT INTO local_messages (session_id, role, content, model) VALUES (?, ?, ?, ?)",
            (session_id, "user", "Hello test session", "qwen2.5-coder")
        )
        conn.commit()

    # 4. Fetch messages
    msg_res = client.get(f"/api/chat/local/sessions/{session_id}/messages")
    assert msg_res.status_code == 200
    msgs = msg_res.json()
    assert len(msgs) >= 1
    assert msgs[0]["content"] == "Hello test session"

    # 5. Delete session
    del_res = client.delete(f"/api/chat/local/sessions/{session_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # 6. Verify messages cascade-deleted or empty
    msg_res2 = client.get(f"/api/chat/local/sessions/{session_id}/messages")
    list_res2 = client.get("/api/chat/local/sessions")
    assert not any(s["id"] == session_id for s in list_res2.json())

def test_projects_listing_and_not_found(client):
    res = client.get("/api/projects")
    assert res.status_code == 200
    assert "projects" in res.json()
    assert isinstance(res.json()["projects"], list)

    # Request non-existent project files
    res_404 = client.get("/api/projects/non-existent-proj-abc-999/files")
    assert res_404.status_code == 404

    # Request non-existent project tree
    tree_404 = client.get("/api/projects/non-existent-proj-abc-999/tree")
    assert tree_404.status_code == 404

def test_file_operations_security_and_deletion(client):
    test_proj = "sec-test-proj"
    proj_dir = os.path.join(main.GENERATIONS_DIR, test_proj)
    os.makedirs(proj_dir, exist_ok=True)

    try:
        # 1. Test path traversal rejection in save
        bad_save = client.post(f"/api/projects/{test_proj}/files/save", json={
            "file_path": "../evil.py",
            "content": "bad code"
        })
        assert bad_save.status_code == 400
        assert "Invalid file path" in bad_save.json()["detail"]

        # 2. Test path traversal rejection in create
        bad_create = client.post(f"/api/projects/{test_proj}/files/create", json={
            "file_path": "../../evil.txt",
            "is_directory": False,
            "content": ""
        })
        assert bad_create.status_code == 400
        assert "Invalid file path" in bad_create.json()["detail"]

        # 3. Test path traversal rejection in delete
        bad_delete = client.request("DELETE", f"/api/projects/{test_proj}/files", json={
            "file_path": "../../etc/passwd"
        })
        assert bad_delete.status_code == 400

        # 4. Valid create, read, and delete
        create_ok = client.post(f"/api/projects/{test_proj}/files/create", json={
            "file_path": "subfolder/module.py",
            "is_directory": False,
            "content": "val = 123"
        })
        assert create_ok.status_code == 200

        files_res = client.get(f"/api/projects/{test_proj}/files")
        assert files_res.status_code == 200
        assert "subfolder/module.py" in files_res.json()["files"]

        # Delete file
        del_ok = client.request("DELETE", f"/api/projects/{test_proj}/files", json={
            "file_path": "subfolder/module.py"
        })
        assert del_ok.status_code == 200
        assert del_ok.json()["status"] == "deleted"
        assert not os.path.exists(os.path.join(proj_dir, "subfolder", "module.py"))
    finally:
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)
        zip_path = os.path.join(main.GENERATIONS_DIR, f"{test_proj}.zip")
        if os.path.exists(zip_path):
            os.remove(zip_path)

def test_models_endpoints(client):
    # GET /api/models returns a list
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert isinstance(data["models"], list)

    # Check pull status endpoint returns dictionary
    status_res = client.get("/api/models/pull/status")
    assert status_res.status_code == 200
    assert "status" in status_res.json()

    # Empty model name returns 400 Bad Request
    pull_bad = client.post("/api/models/pull", json={"model": ""})
    assert pull_bad.status_code == 400

def test_sandbox_not_found_endpoints(client):
    fake_proj = "non-existent-sandbox-proj-12345"
    
    # Auto-fix non-existent
    fix_res = client.post(f"/api/sandbox/auto-fix/{fake_proj}")
    assert fix_res.status_code == 404

    # Preview-status non-existent
    prev_res = client.get(f"/api/sandbox/preview-status/{fake_proj}")
    assert prev_res.status_code == 404

def test_shell_scripts_and_config_integrity():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Check start scripts exist and are executable
    for script in ["start_coreforge.sh", "scripts/build_desktop.sh"]:
        full_path = os.path.join(root_dir, script)
        assert os.path.exists(full_path), f"Missing script {script}"
        assert os.access(full_path, os.X_OK), f"Script {script} is not executable"

    # Check desktop package.json
    desktop_pkg = os.path.join(root_dir, "desktop", "package.json")
    assert os.path.exists(desktop_pkg)
    with open(desktop_pkg, "r") as f:
        pkg_data = json.load(f)
    assert pkg_data["name"] == "coreforge-desktop"
    assert "main.js" in pkg_data["main"]

    # Check ai-dashboard package.json
    dash_pkg = os.path.join(root_dir, "ai-dashboard", "package.json")
    assert os.path.exists(dash_pkg)
    with open(dash_pkg, "r") as f:
        dash_data = json.load(f)
    assert "dependencies" in dash_data
    assert "next" in dash_data["dependencies"]
    assert "react" in dash_data["dependencies"]
    assert "@monaco-editor/react" in dash_data["dependencies"]


def test_system_updater_endpoints(client):
    # 1. Check download status endpoint
    status_res = client.get("/api/system/update/download-status")
    assert status_res.status_code == 200
    data = status_res.json()
    assert "status" in data
    assert "percent" in data

    # 2. Attempt install when not downloaded yet -> returns 400
    install_res = client.post("/api/system/update/install")
    assert install_res.status_code == 400
