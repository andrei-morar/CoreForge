# Master Upgrade Tracker

## Infrastructure & Dependencies
- [x] Pull `qwen2.5-coder` via Ollama (Done by user)
- [x] Pull `mistral` via Ollama (Done by user)
- [x] Pull `llama3.1` via Ollama (Done by user)
- [x] Install `@monaco-editor/react` & `reactflow` in frontend (Done by user)
- [x] Install `docker` python package in backend (Done by user)

## Phase 1: Agent Customization Hub
- [x] Update SQLite schema in `main.py` (add `agents` table)
- [x] Create CRUD API routes for agents
- [x] Create `GET /api/models` to fetch Ollama tags
- [x] Refactor `build_agents()` to dynamically load from DB
- [x] Build Agent Hub UI in `page.tsx`

## Phase 2: Built-in Code Editor (IDE)
- [x] Create `GET /api/job/{job_id}/files` endpoint
- [x] Build IDE Tab in `page.tsx` with file explorer and Monaco editor

## Phase 3: Live Multi-Agent Visualization
- [x] Implement `step_callback` tracking in CrewAI
- [x] Add execution logs & active agent to `JobResponse`
- [x] Build React Flow node graph in frontend to replace static spinner

## Phase 7: Clean Outputs & Instructions
- [x] Strip raw XML code blocks from response text
- [x] Strip raw XML code blocks from SQLite history
- [x] Append dynamic run instructions to the swarm output

## Phase 6: ChatGPT-Style Local Interface
- [x] Create `POST /api/chat/local` endpoint in `main.py`
- [x] Add "Direct Chat" tab in `page.tsx`
- [x] Add Model Selector Dropdown
- [x] Build Chat UI

## Phase 6.5: Chat Sessions & Memory
- [x] Create `local_sessions` & `local_messages` tables in SQLite
- [x] Update `local_chat` endpoint to load historical context from DB
- [x] Build Sessions Sidebar UI in `page.tsx`
- [x] Create "New Chat" and session-switching logic
- [x] Add Delete Session button to sidebar

## Phase 8: Ephemeral Agent Orchestration
- [x] Ask Gemini for JSON array of required agents
- [x] Dynamically construct those agents in memory
- [x] Send ephemeral agent list to UI for ReactFlow rendering
- [x] Run the Crew & delete agents

## Phase 9: VSCode-Style IDE & Readable Names
- [x] Intercept job outputs and ask Gemini for a readable `project_name`
- [x] Save generated files in a named persistent directory
- [x] Build `GET /api/projects` endpoint
- [x] Build Project History Sidebar in `page.tsx`

## Phase 4: Docker Sandbox Preview
- [x] Create `POST /api/sandbox/run/{project_name}` endpoint using Python Docker SDK
- [x] Detect `package.json` vs `requirements.txt` vs basic scripts and mount volume
- [x] Capture terminal output synchronously
- [x] Build Sandbox Terminal UI in `page.tsx` below Monaco Editor

## Phase 5: Agent Tool Integration
- [x] Integrate `crewai_tools` in backend
- [x] Add tools column to DB
- [x] Update Agent Hub UI for tool selection

## Phase 10: Zero-Cloud Local Mode & Hardware Diagnostics
- [x] Create 100% Local Manager (Ollama / Qwen2.5-Coder & Llama3.1) to replace Gemini API
- [x] Build `GET /api/system/specs` hardware scanner with NVIDIA GPU & RAM detection
- [x] Compute mathematical compatibility scores (% OK) per AI model size
- [x] Implement In-App Model Downloader (`/api/models/pull` with real-time stream status)
- [x] Build Local AI & Hardware Hub tab in `page.tsx` with 1-click downloads
- [x] Setup GitHub Actions CI, Issue/PR templates, and Docker Compose stack
- [x] Create comprehensive `FEATURES.md` and update `README.md`

## Phase 11: VS Code IDE Overhaul, Multi-Tier Agent Swarm & Automated Tests
- [x] Full VS Code-style edge-to-edge IDE interface with project selector and breadcrumbs
- [x] Recursive collapsible file tree (`FileTreeItem`) with directory nesting and extension badges
- [x] File operations: Save to disk (`Ctrl+S`), create new file/folder modals, delete files/folders
- [x] Multi-tab document management with unsaved change detection dots (`●`) and close actions
- [x] VS Code status bar with lines/char counters, UTF-8 encoding, and NVIDIA RTX 4060 GPU badge
- [x] Multi-tier hierarchical Swarm DAG in ReactFlow (Manager -> Architecture -> Engineering -> Validation/DB)
- [x] Automated test suite in `tests/test_api.py` with 11 comprehensive tests (100% pass rate)

