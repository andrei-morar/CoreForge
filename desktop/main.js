const { app, BrowserWindow, shell, ipcMain, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

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

const APP_VERSION = '2.2.0';
let activeFrontendUrl = process.env.NEXUS_FRONTEND_URL || 'http://127.0.0.1:3000';
const BACKEND_URL = process.env.NEXUS_BACKEND_URL || 'http://127.0.0.1:8000';

// Check if an HTTP service is responding
function checkHttpReady(url, timeoutMs = 1200) {
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

// Poll server readiness
async function waitForServer(maxAttempts = 15, intervalMs = 600) {
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

function getOfflineHtml() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html lang="ro">
      <head>
        <meta charset="utf-8">
        <title>CoreForge 2026 — Hub Offline</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 40px 20px;
            background: #07090e;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            user-select: none;
          }
          .card {
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(148, 163, 184, 0.15);
            border-radius: 16px;
            padding: 36px 40px;
            max-width: 640px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
          }
          .logo {
            font-size: 38px;
            margin-bottom: 12px;
          }
          h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #06b6d4, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          p.subtitle {
            margin: 0 0 24px 0;
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.5;
          }
          .status-box {
            background: rgba(2, 6, 23, 0.6);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: left;
            font-size: 13px;
          }
          .status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.06);
          }
          .status-row:last-child { border-bottom: none; }
          .badge-off {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
          }
          .instructions {
            background: rgba(15, 23, 42, 0.9);
            border-radius: 8px;
            padding: 14px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            color: #38bdf8;
            text-align: left;
            margin-bottom: 24px;
            overflow-x: auto;
          }
          .btn-group {
            display: flex;
            gap: 12px;
            justify-content: center;
          }
          button {
            background: linear-gradient(135deg, #06b6d4, #4f46e5);
            color: #ffffff;
            border: none;
            padding: 11px 24px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.1s;
          }
          button:hover { opacity: 0.9; transform: translateY(-1px); }
          button:active { transform: translateY(0); }
          .spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">⚡</div>
          <h1>CoreForge 2026 v${APP_VERSION}</h1>
          <p class="subtitle">Nucleul local de agenți AI nu este pornit sau nu răspunde pe portul 3000.<br>Pornește serviciul local pentru a încărca spațiul de lucru.</p>

          <div class="status-box">
            <div class="status-row">
              <span>🌐 Web IDE Dashboard (Port 3000)</span>
              <span class="badge-off" id="fe-status">Offline</span>
            </div>
            <div class="status-row">
              <span>🔌 FastAPI Engine (Port 8000)</span>
              <span class="badge-off" id="be-status">Verificare...</span>
            </div>
          </div>

          <div class="instructions">
            # Pe Windows (PowerShell / Command Prompt):<br>
            start_coreforge.bat<br><br>
            # Pe Linux / WSL (Ubuntu):<br>
            ./start_coreforge.sh<br><br>
            # Sau cu Docker Compose:<br>
            docker compose up
          </div>

          <div class="btn-group">
            <button onclick="checkNow()">
              <span class="spinner" id="spin" style="display:none;"></span>
              Reîncearcă Conexiunea
            </button>
          </div>
        </div>

        <script>
          async function checkNow() {
            document.getElementById('spin').style.display = 'inline-block';
            try {
              const res = await fetch('http://127.0.0.1:3000', { mode: 'no-cors' });
              window.location.href = 'http://127.0.0.1:3000';
            } catch (e) {
              setTimeout(() => {
                document.getElementById('spin').style.display = 'none';
              }, 1200);
            }
          }

          // Auto-poll every 2 seconds to transition smoothly when servers start
          setInterval(async () => {
            try {
              await fetch('http://127.0.0.1:3000', { mode: 'no-cors' });
              window.location.href = 'http://127.0.0.1:3000';
            } catch (e) {}
          }, 2000);
        </script>
      </body>
    </html>
  `)}`;
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
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle load errors gracefully
  mainWindow.webContents.on('did-fail-load', (event, errorCode) => {
    // -3 = ABORTED (e.g. redirected or manual stop), ignore
    if (errorCode !== -3 && mainWindow) {
      mainWindow.loadURL(getOfflineHtml());
    }
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Initial connection attempt with brief splash
  const isReady = await waitForServer(12, 500);
  if (isReady && mainWindow) {
    mainWindow.loadURL(activeFrontendUrl);
  } else if (mainWindow) {
    mainWindow.loadURL(getOfflineHtml());
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance event handling: restore window when launched again
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// IPC Handlers
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

app.whenReady().then(() => {
  createTray();
  createWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
