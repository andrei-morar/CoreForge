# 📖 Catalog Complet de Funcționalități — Nexus AI Studio 2026
> **Documentație tehnică și ghid exhaustiv pentru toate funcționalitățile implementate în platforma Nexus AI Studio.**

---

## 📑 Cuprins
1. [Modul 100% Local & Decuplare Totală de Cloud (Zero-Cloud Mode)](#1-modul-100-local--decuplare-totală-de-cloud-zero-cloud-mode)
2. [Diagnostic Hardware & Scanare Compatibilitate Modele AI](#2-diagnostic-hardware--scanare-compatibilitate-modele-ai)
3. [Descărcare Integrată de Modele AI (In-App Model Downloader)](#3-descărcare-integrată-de-modele-ai-in-app-model-downloader)
4. [Sistemul de Agenți Efemeri & Orchestrare Ierarhică CrewAI](#4-sistemul-de-agenți-efemeri--orchestrare-ierarhică-crewai)
5. [Agent Customization Hub & Integrare CrewAI Tools](#5-agent-customization-hub--integrare-crewai-tools)
6. [Vizualizare Multi-Agent în Timp Real (ReactFlow Live Graph)](#6-vizualizare-multi-agent-în-timp-real-reactflow-live-graph)
7. [Direct Chat cu Memorie Persistentă (ChatGPT-Style)](#7-direct-chat-cu-memorie-persistentă-chatgpt-style)
8. [Editor de Cod Încorporat (Monaco Editor / VSCode-Style IDE)](#8-editor-de-cod-încorporat-monaco-editor--vscode-style-ide)
9. [Docker Execution Sandbox (Rulare Izolată și Securizată)](#9-docker-execution-sandbox-rulare-izolată-și-securizată)
10. [Procesare Inteligentă a Codului & Instrucțiuni Automate de Lansare](#10-procesare-inteligentă-a-codului--instrucțiuni-automate-de-lansare)
11. [Telemetrie Live a Sistemului & Monitorizare Resurse](#11-telemetrie-live-a-sistemului--monitorizare-resurse)
12. [Ecosistem GitHub Profesional (CI/CD, Templates & Docker Compose)](#12-ecosistem-github-profesional-cicd-templates--docker-compose)

---

## 1. Modul 100% Local & Decuplare Totală de Cloud (Zero-Cloud Mode)

### 🎯 Ce problemă rezolvă?
Tradițional, orchestrarea agenților CrewAI depindea de un Manager LLM în cloud (Google Gemini API), ceea ce implica necesitatea unei chei API, riscul de a depăși limitele de rată (rate limits) sau costuri financiare recurente.

### ⚙️ Cum funcționează?
- **Comutator Manager în Interfață:** Utilizatorul poate alege oricând între `🏠 100% Local (Fără Costuri)` și `☁️ Cloud (Gemini API)`.
- **Manager Local Autonom:** Când este activat modul local, Team Manager-ul este alimentat de un model instalat în Ollama (recomandat: `qwen2.5-coder:latest` sau `llama3.1:latest`).
- **Planificare & Naming Offline:** Întreaga descompunere a cerinței, crearea agenților efemeri și generarea numelui de proiect se realizează pe GPU-ul laptopului, fără a trimite niciun octet de date pe internet.

---

## 2. Diagnostic Hardware & Scanare Compatibilitate Modele AI

### 🎯 Ce problemă rezolvă?
Utilizatorii nu știu adesea ce modele pot rula pe laptopul lor fără să blocheze sistemul sau să intre în memorie swap pe disc.

### ⚙️ Cum funcționează?
- **Scanare Automată a Resurselor (`GET /api/system/specs`):**
  - **GPU:** Detectează automat plăcile dedicate NVIDIA via `nvidia-smi` (nume GPU, VRAM total și VRAM liber).
  - **RAM:** Monitorizează memoria totală și memoria disponibilă prin `psutil`.
  - **CPU:** Identifică numărul total de nuclee logice.
- **Scor de Compatibilitate (% OK):**
  - Fiecare model din catalog primește un scor calculat matematic în funcție de VRAM și cerințele de memorie:
    - **98% OK (Verde):** Modelul încape 100% în VRAM (viteze de 40–70+ tokens/secundă pe RTX 4060).
    - **78% OK (Galben):** Modelul rulează în regim hibrid VRAM + RAM (offload parțial).
    - **55% OK (Albastru):** Rulare exclusiv pe procesor (CPU-only).
    - **25% OK (Roșu):** Memorie insuficientă, risc de instabilitate.

---

## 3. Descărcare Integrată de Modele AI (In-App Model Downloader)

### 🎯 Ce problemă rezolvă?
Pentru a descărca un model, utilizatorul trebuia să deschidă un terminal separat și să tasteze comenzi de tip `ollama pull model`.

### ⚙️ Cum funcționează?
- **Descărcare cu 1-Click din Dashboard:** Fiecare card de model din tabul `Local AI & Hardware` are un buton dedicat de descărcare.
- **Worker Asincron în Background (`POST /api/models/pull`):** Serverul FastAPI pornește un thread dedicat care comunică cu API-ul Ollama prin stream JSON.
- **Bară de Progres în Timp Real (`GET /api/models/pull/status`):** Dashboard-ul Next.js afișează procentul descărcat, cantitatea de MB transferată și statusul curent (descărcare straturi, extragere, finalizare).

---

## 4. Sistemul de Agenți Efemeri & Orchestrare Ierarhică CrewAI

### 🎯 Ce problemă rezolvă?
Sistemele clasice de agenți folosesc roluri fixe (ex: mereu aceiași 3 agenți), indiferent dacă utilizatorul cere o aplicație React, un script de baze de date sau un web scraper.

### ⚙️ Cum funcționează?
- **Generare Dinamică la Nevoie:** La primirea cerinței, Managerul analizează promptul și generează dinamic un JSON cu exact specialiștii necesari (ex: "FastAPI Backend Developer", "Tailwind CSS Expert", "Security Auditor").
- **Selecție Inteligentă de Modele:** Managerul asociază fiecărui agent modelul local optim (ex: `qwen2.5-coder` pentru cod, `mistral` pentru baze de date, `llama3.1` pentru documentație).
- **Curățare Automată:** După ce sarcina este finalizată, agenții efemeri sunt distruși, eliberând resursele de calcul.

---

## 5. Agent Customization Hub & Integrare CrewAI Tools

### 🎯 Ce problemă rezolvă?
Utilizatorii au nevoie de agenți permanenți cu roluri customizate și instrumente externe (citire de fișiere, navigare web).

### ⚙️ Cum funcționează?
- **CRUD Complet în SQLite (`/api/agents`):** Permite adăugarea, editarea, ștergerea și activarea/dezactivarea agenților din interfață.
- **Suport pentru `crewai-tools`:**
  - `FileReadTool`: Permite agentului să inspecteze fișiere din proiect.
  - `DirectoryReadTool`: Permite agentului să exploreze structura directoarelor.
  - `ScrapeWebsiteTool`: Permite agentului să extragă date din pagini web.
- **Selector Vizual:** Uneltele se activează prin simple click-uri pe badge-uri în formularul de creare al agentului.

---

## 6. Vizualizare Multi-Agent în Timp Real (ReactFlow Live Graph)

### 🎯 Ce problemă rezolvă?
Procesul de gândire al agenților AI este adesea o "cutie neagră" în care utilizatorul doar așteaptă un spinner static.

### ⚙️ Cum funcționează?
- **Noduri Interactive & Muchii Animate:** Dashboard-ul folosește biblioteca `reactflow` pentru a desena un grafic complet al echipei (Manager în vârf, agenții specialiști dedesubt).
- **Feedback Vizual prin `step_callback`:** Când un agent preia execuția, nodul său începe să pulseze în verde neon (`active_agent`), iar conexiunea dintre el și Manager devine animată în timp real.

---

## 7. Direct Chat cu Memorie Persistentă (ChatGPT-Style)

### 🎯 Ce problemă rezolvă?
Nevoia de a purta o discuție directă, rapidă cu un model local fără a porni un întreg roi de agenți CrewAI.

### ⚙️ Cum funcționează?
- **Tab Dedicat (`Direct Chat`):** Interfață curată și fluidă tip ChatGPT.
- **Sesiuni Multiple cu Salvare în SQLite:** Suport pentru conversații separate, redenumire automată a titlului pe baza primului prompt și buton de ștergere.
- **Selector Dinamic de Model:** Poți comuta instantaneu între `qwen2.5-coder`, `mistral` sau `llama3.1` în cadrul aceleiași sesiuni.

---

## 8. Editor de Cod Încorporat (Monaco Editor / VSCode-Style IDE)

### 🎯 Ce problemă rezolvă?
Pentru a vizualiza fișierele create de AI, utilizatorul trebuia să iasă din aplicație și să deschidă un editor extern.

### ⚙️ Cum funcționează?
- **Monaco Editor Integrat:** Același motor de editare care stă la baza Visual Studio Code (syntax highlighting complet, numere de linii, autocomplete).
- **Sidebar cu Istoric de Proiecte:** Explorează toate aplicațiile generate vreodată în folderul `generations/`.
- **Tree View & File Switching:** Click pe oricare fișier (ex: `app.py`, `package.json`, `index.html`) pentru a-l încărca instantaneu în editor.
- **Descărcare Arhivă `.zip`:** Buton dedicat pentru a descărca proiectul complet cu un singur click.

---

## 9. Docker Execution Sandbox (Rulare Izolată și Securizată)

### 🎯 Ce problemă rezolvă?
Rularea de cod generat de AI direct pe sistemul gazdă poate fi periculoasă (comenzi distructive accidentale, conflicte de pachete).

### ⚙️ Cum funcționează?
- **Detectare Automată a Limbajului:** Backend-ul identifică dacă proiectul conține `package.json` (Node.js), `requirements.txt` (Python) sau scripturi individuale.
- **Lansare Container Izolat:** Folosind Python Docker SDK, se pornește un container ușor (`node:18-alpine` sau `python:3.10-slim`), se montează folderul proiectului în mod izolat și se execută instrucțiunile.
- **Panou de Terminal Dedicat:** Ieșirea standard (`stdout`) și erorile (`stderr`) din container sunt afișate live într-o fereastră de terminal chiar sub editorul Monaco.

---

## 10. Procesare Inteligentă a Codului & Instrucțiuni Automate de Lansare

### 🎯 Ce problemă rezolvă?
Răspunsurile brute ale LLM-urilor conțin tag-uri XML, marcaje de cod repetitive și nu explică utilizatorului cum să pornească proiectul.

### ⚙️ Cum funcționează?
- **Filtrare Regex a Codului:** Blocurile `<file path="...">` sunt extrase automat, salvate pe disc în fișiere reale și eliminate din textul conversației.
- **Generare Nume Lizibil:** Modelul atribuie un nume intuitiv proiectului (ex: `snake-game`, `todo-flask`) în loc de identificatori compuși din caractere aleatorii.
- **Ghid de Pornire Personalizat:** La finalul fiecărui răspuns, sistemul adaugă automat comenzile exacte de terminal necesare pentru a rula aplicația (ex: `npm install && npm run dev` sau `pip install -r requirements.txt && python app.py`).

---

## 11. Telemetrie Live a Sistemului & Monitorizare Resurse

### 🎯 Ce problemă rezolvă?
Monitorizarea încărcării sistemului în timp ce modelele locale mari rulează inferență pe mașină.

### ⚙️ Cum funcționează?
- **Polling la 1 secundă (`GET /api/telemetry`):**
  - Măsoară procentul CPU și memoria RAM ocupată vs totală prin `psutil`.
  - Afișează metrici animate în dashboard pentru a ști în orice moment dacă resursele laptopului sunt solicitate la maximum.

---

## 12. Ecosistem GitHub Profesional (CI/CD, Templates & Docker Compose)

### 🎯 Ce problemă rezolvă?
Transformarea proiectului dintr-un script local într-un depozit open-source de nivel Enterprise, gata de colaborare pe GitHub.

### ⚙️ Cum funcționează?
- **GitHub Actions Pipeline (`.github/workflows/ci.yml`):** Testează automat backend-ul Python și compilează frontend-ul Next.js la fiecare Push sau PR.
- **Șabloane Standardizate:**
  - `.github/ISSUE_TEMPLATE/bug_report.md`
  - `.github/ISSUE_TEMPLATE/feature_request.md`
  - `.github/PULL_REQUEST_TEMPLATE.md`
- **Docker Compose Complet (`docker-compose.yml`):** Permite oricărui colaborator să pornească întregul sistem (Ollama cu GPU NVIDIA, Backend FastAPI și Frontend Next.js) cu o singură comandă:
  ```bash
  docker compose up --build
  ```

---

## 13. Token Analytics & Cost Intelligence Locală (100% Offline)

### 🎯 Ce problemă rezolvă?
Când rulezi modele AI local fără un cont cloud, nu ai un panou de control unde să vezi câți tokeni consumă fiecare cerință, cât de repede generează GPU-ul tău și câți bani ai economisit rulând pe propriul hardware în loc să plătești API-uri comerciale scumpe.

### ⚙️ Cum funcționează?
- **Contorizare precisă în Direct Chat:**
  - Extrage automat din Ollama `prompt_eval_count` (input), `eval_count` (output), durata și viteza în `tokens/second`.
  - Afișează un badge detaliat sub fiecare răspuns: `⚡ 214 tokeni (48 in • 166 out) • 73.8 tok/s • 2.2s`.
  - Contorizează tokenii cumulați per sesiune de chat direct în antet: `🪙 Total Sesiune: 1,098 tokeni`.
- **Contorizare precisă în Agent Command (Swarm):**
  - Măsoară timpul total de rulare a roiului și agregă tokenii procesați de Manager și toți Lucrătorii (`crew.usage_metrics` cu fallback euristic).
  - Afișează un banner de rezumat la finalul execuției: `⚡ Consum Roi Agenți: 6,380 tokeni | ⏱️ 38.4s | 💰 $0.06 economisiți vs Cloud`.
- **Dashboard dedicat "Token Analytics":**
  - **4 KPI-uri cheie:** Total tokeni, Economie totală ($ și RON), distribuție Direct Chat vs Swarm, viteză medie GPU.
  - **Grafic Cronologic:** Bar chart orizontal interactiv cu istoricul consumului zilnic.
  - **Distribuție Modele:** Bare de progres cu ponderea fiecărui model (ex: `qwen2.5-coder:latest`).
  - **Comparație de Costuri:** Comparație în timp real cu tarifele oficiale OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet și Google Gemini 1.5 Pro arătând costul tău: `$0.00 / 0.00 RON`.
  - **Jurnal Detaliat de Evenimente:** Tabel complet cu data/ora, modelul, defalcarea in/out, durata și viteza fiecărei interacțiuni.

