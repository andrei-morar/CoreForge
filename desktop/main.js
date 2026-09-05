const { app, BrowserWindow, shell, ipcMain, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

// Bypass Chromium setuid sandbox helper on Linux / Ubuntu 24.04
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow = null;
let tray = null;
app.isQuitting = false;

const FRONTEND_URL = process.env.NEXUS_FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.NEXUS_BACKEND_URL || 'http://localhost:8000';

function checkServerReady(url, maxRetries = 30, interval = 1000) {
  return new Promise((resolve) => {
    let retries = 0;
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        resolve(false);
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'CoreForge 2026 v2.1.0', enabled: false },
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

  tray.setToolTip('CoreForge 2026 — Local Autonomous AI Swarm');
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
    title: 'CoreForge 2026',
    icon: iconPath,
    backgroundColor: '#090d16',
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

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Load sleek connecting splash while backend/frontend initialize
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Lansare CoreForge...</title>
        <style>
          body {
            margin: 0;
            background: #090d16;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            user-select: none;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 24px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: 600; }
          p { margin: 0; color: #94a3b8; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Pornire CoreForge 2026</h2>
        <p>Se conectează la nucleul local de agenți...</p>
      </body>
    </html>
  `)}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isReady = await checkServerReady(FRONTEND_URL, 40, 500);
  if (isReady) {
    mainWindow.loadURL(FRONTEND_URL);
  } else {
    mainWindow.loadURL(FRONTEND_URL);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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
