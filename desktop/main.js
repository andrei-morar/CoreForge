const { app, BrowserWindow, shell, ipcMain, Tray, Menu, Notification, nativeImage, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

// Linux-only sandbox adjustments (Ubuntu 24.04 unprivileged user namespace restrictions)
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// Single Instance Lock: prevent duplicate invisible processes on Windows/Linux
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
app.isQuitting = false;

const APP_VERSION = '2.3.0';
let activeFrontendUrl = process.env.NEXUS_FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.NEXUS_BACKEND_URL || 'http://127.0.0.1:8000';

// Track spawned child processes for clean termination on quit
const spawnedChildren = [];

function isValidCoreForgeDir(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') return false;
  try {
    return fs.existsSync(path.join(dirPath, 'main.py')) &&
           fs.existsSync(path.join(dirPath, 'ai-dashboard'));
  } catch (e) {
    return false;
  }
}

function getSavedProjectPath() {
  try {
    const configPath = path.join(app.getPath('userData'), 'coreforge_config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.projectPath && isValidCoreForgeDir(data.projectPath)) {
        return data.projectPath;
      }
    }
  } catch (e) {}
  return null;
}

function saveProjectPath(projectPath) {
  try {
    const configPath = path.join(app.getPath('userData'), 'coreforge_config.json');
    fs.writeFileSync(configPath, JSON.stringify({ projectPath }, null, 2), 'utf8');
  } catch (e) {}
}

function findProjectRoot() {
  // 1. Saved config
  const saved = getSavedProjectPath();
  if (saved) return saved;

  // 2. Explicit environment variable
  if (process.env.COREFORGE_PATH && isValidCoreForgeDir(process.env.COREFORGE_PATH)) {
    return process.env.COREFORGE_PATH;
  }

  // 3. Dev source tree (relative to main.js)
  const devDir = path.resolve(__dirname, '..');
  if (isValidCoreForgeDir(devDir)) {
    return devDir;
  }

  // 4. Common standard paths on Linux, macOS, and Windows
  const home = os.homedir();
  const candidates = [
    path.join(home, 'CoreForge'),
    path.join(home, 'AiAgents'),
    path.join(home, 'Projects', 'CoreForge'),
    path.join(home, 'Desktop', 'CoreForge'),
    path.join(home, 'Documents', 'CoreForge'),
    path.join(home, 'Downloads', 'CoreForge'),
    'C:\\CoreForge',
    'C:\\Projects\\CoreForge',
    'D:\\CoreForge',
    path.join(home, 'AppData', 'Local', 'CoreForge')
  ];

  for (const c of candidates) {
    if (isValidCoreForgeDir(c)) {
      saveProjectPath(c);
      return c;
    }
  }

  return null;
}

function findPythonExecutable(rootDir) {
  const isWin = process.platform === 'win32';
  const candidates = isWin
    ? [
        path.join(rootDir, 'agent_env', 'Scripts', 'python.exe'),
        path.join(rootDir, 'venv', 'Scripts', 'python.exe'),
        path.join(rootDir, 'env', 'Scripts', 'python.exe'),
        'python'
      ]
    : [
        path.join(rootDir, 'agent_env', 'bin', 'python'),
        path.join(rootDir, 'agent_env', 'bin', 'python3'),
        path.join(rootDir, 'venv', 'bin', 'python'),
        path.join(rootDir, 'venv', 'bin', 'python3'),
        'python3',
        'python'
      ];

  for (const p of candidates) {
    if (p === 'python' || p === 'python3') continue;
    if (fs.existsSync(p)) return p;
  }
  return isWin ? 'python' : 'python3';
}

function checkHttpReady(url, timeoutMs = 1000) {
  return new Promise((resolve) => {
    let resolved = false;
    const req = http.get(url, (res) => {
      if (!resolved) {
        resolved = true;
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    });

    req.on('error', () => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });
  });
}

// 1-Click Launch: Auto-start backend and frontend
async function ensureServicesRunning(forceStart = false) {
  const rootDir = findProjectRoot();
  if (!rootDir) {
    console.warn('CoreForge project directory not found.');
    return { success: false, reason: 'project_not_found' };
  }

  const backendMainPy = path.join(rootDir, 'main.py');
  const frontendDir = path.join(rootDir, 'ai-dashboard');

  // Check backend
  const backendReady = await checkHttpReady('http://127.0.0.1:8000/api/telemetry', 800);
  if (!backendReady && (forceStart || true) && fs.existsSync(backendMainPy)) {
    const pythonExe = findPythonExecutable(rootDir);
    try {
      const logFd = fs.openSync(path.join(rootDir, 'backend.log'), 'a');
      const backendProc = spawn(pythonExe, [backendMainPy], {
        cwd: rootDir,
        detached: false,
        stdio: ['ignore', logFd, logFd],
        windowsHide: true,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });
      spawnedChildren.push(backendProc);
    } catch (e) {
      console.error('Failed to spawn backend:', e);
    }
  }

  // Check frontend
  const frontendReady = await checkHttpReady('http://localhost:3000', 800);
  if (!frontendReady && (forceStart || true) && fs.existsSync(path.join(frontendDir, 'package.json'))) {
    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npm.cmd' : 'npm';
    try {
      const logFd = fs.openSync(path.join(rootDir, 'frontend.log'), 'a');
      const frontendProc = spawn(npmCmd, ['run', 'dev'], {
        cwd: frontendDir,
        detached: false,
        stdio: ['ignore', logFd, logFd],
        windowsHide: true,
        env: { ...process.env }
      });
      spawnedChildren.push(frontendProc);
    } catch (e) {
      console.error('Failed to spawn frontend:', e);
    }
  }

  return { success: true, rootDir };
}

function cleanupChildProcesses() {
  for (const proc of spawnedChildren) {
    try {
      if (proc && !proc.killed) {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
        } else {
          proc.kill('SIGTERM');
        }
      }
    } catch (e) {}
  }
}

// Poll server readiness
async function waitForServer(maxAttempts = 30, intervalMs = 600) {
  const candidateUrls = [
    activeFrontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  for (let i = 0; i < maxAttempts; i++) {
    for (const url of candidateUrls) {
      const ready = await checkHttpReady(url);
      if (ready) {
        activeFrontendUrl = url;
        return true;
      }
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: `CoreForge 2026 v${APP_VERSION}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Deschide Panou Principal',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Reîncarcă Aplicația',
      click: () => {
        if (mainWindow) mainWindow.reload();
      }
    },
    { type: 'separator' },
    {
      label: 'Închide CoreForge',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip(`CoreForge 2026 v${APP_VERSION} — Autonomous Multi-Agent IDE`);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

async function createWindow() {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: `CoreForge 2026 v${APP_VERSION}`,
    icon: iconPath,
    backgroundColor: '#07090e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle load errors: fallback to offline screen
  mainWindow.webContents.on('did-fail-load', (event, errorCode) => {
    if (errorCode !== -3 && mainWindow) {
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 1-Click Launch: ensure backend and frontend are triggered
  ensureServicesRunning();

  const isReady = await waitForServer(25, 600);
  if (isReady && mainWindow) {
    mainWindow.loadURL(activeFrontendUrl);
  } else if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance event handling
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// IPC Handlers
ipcMain.handle('start-services', async () => {
  return await ensureServicesRunning(true);
});

ipcMain.handle('get-services-status', async () => {
  const rootDir = findProjectRoot();
  const backendReady = await checkHttpReady('http://127.0.0.1:8000/api/telemetry', 500);
  const frontendReady = await checkHttpReady('http://localhost:3000', 500);
  return {
    rootDir,
    backendReady,
    frontendReady,
    found: Boolean(rootDir)
  };
});

ipcMain.handle('select-project-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selectează Folderul Proiectului CoreForge',
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selected = result.filePaths[0];
    if (isValidCoreForgeDir(selected)) {
      saveProjectPath(selected);
      return { success: true, path: selected };
    } else {
      return {
        success: false,
        error: 'Folderul selectat nu conține fișierele CoreForge (main.py și ai-dashboard).'
      };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    new Notification({
      title: title || 'CoreForge 2026',
      body: body || '',
      icon: iconPath
    }).show();
    return true;
  }
  return false;
});

ipcMain.handle('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
    return true;
  }
  return false;
});

ipcMain.handle('check-updates', async () => {
  return new Promise((resolve) => {
    http.get(`${BACKEND_URL}/api/system/check-updates`, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
});

ipcMain.handle('apply-update', async (event, { filePath }) => {
  if (!filePath) return false;
  try {
    if (process.platform === 'win32') {
      shell.openPath(filePath);
    } else if (filePath.endsWith('.AppImage')) {
      spawn(filePath, [], { detached: true, stdio: 'ignore' }).unref();
    } else {
      shell.openPath(filePath);
    }
    setTimeout(() => {
      app.isQuitting = true;
      app.quit();
    }, 1200);
    return true;
  } catch (err) {
    return false;
  }
});

app.whenReady().then(() => {
  createTray();
  createWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  cleanupChildProcesses();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupChildProcesses();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});
