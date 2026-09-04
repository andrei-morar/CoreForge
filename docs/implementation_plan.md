# Nexus AI Studio 2026 — Phase 4 & 9 Plan

You asked what the **Docker Sandbox** is for, and requested a complete overhaul of the Code Editor to make it behave more like VSCode (with readable folder names and a history of all your generated projects). 

Here is the technical plan to build exactly that.

---

## What is the Docker Sandbox?
When the AI generates code (like a Python web scraper or a Node.js server), running it directly on your computer can be dangerous or messy (it might install conflicting dependencies or hallucinate a destructive command). 

The **Docker Sandbox** solves this. When you click "Run", the Python backend spins up a temporary, isolated Linux "container" using Docker. It securely copies your generated code inside the container, installs the requirements, and runs it. If the code breaks, the container is instantly destroyed, keeping your actual computer 100% safe.

---

## Phase 9: VSCode-Style IDE & Readable Names (NEW)
Currently, the Swarm saves apps inside folders named with random gibberish (e.g., `89182349-3824-5239...`). And the Code Editor only shows the files from the *current* job.

- **Backend Updates (`main.py`)**:
  - We will prompt Gemini to generate a readable `project_name` (like `snake-game` or `react-dashboard`) and save the output folder using that name instead of a UUID.
  - Create a new endpoint `GET /api/projects` that scans your `generations/` folder and returns a list of all apps you have ever generated.
- **Frontend Updates (`page.tsx`)**:
  - In the **Code Editor** tab, we will add a **Sidebar** (just like VSCode).
  - This sidebar will list all of your previously generated apps (e.g., `snake-game`, `todo-list`).
  - Clicking on a folder will expand it to show its files, allowing you to seamlessly switch between all the different apps you've built with the Swarm.

## Phase 4: Docker Sandbox Execution
The "Run in Sandbox" button currently doesn't work because we haven't built the backend execution logic yet.

- **Backend Updates**:
  - Create a `POST /api/sandbox/run/{project_name}` endpoint.
  - This endpoint will use the Docker API to pull a lightweight image (like Python or Node), mount the selected project folder, execute the code, and stream the terminal logs back to the frontend.
- **Frontend Updates**:
  - A terminal output panel below the Monaco editor that displays the live output of your running Sandbox.

---

## User Review Required

Does this plan make sense? I recommend we build **Phase 9 (Readable Names & VSCode Sidebar)** first, because it will organize all of your code files perfectly, making it much easier to test the Sandbox afterward.

**Click Approve, and I will immediately build the VSCode-style file history!**
