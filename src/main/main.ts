/**
 * ProCAD by AlgaMax - Main Electron Process
 */

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// ===== WINDOWS RENDERING FIXES =====
// Add these command line switches BEFORE app.whenReady()
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('force-cpu-draw');
app.commandLine.appendSwitch('disable-gpu-compositing');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Don't show until ready - IMPORTANT FIX
    backgroundColor: '#ffffff', // Set background color
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // ===== RENDERING FIXES =====
      hardwareAcceleration: false, // Disable hardware acceleration
      webSecurity: false, // Fix for blank dialogs
      allowRunningInsecureContent: true,
      offscreen: false
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'ProCAD by AlgaMax'
  });

  // ===== SHOW WINDOW ONLY WHEN READY - PREVENTS BLANK SCREEN =====
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow?.show();
    mainWindow?.focus();
  });

  // ===== ADDITIONAL FIX: Wait for DOM to be ready =====
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Content loaded');
    // Inject CSS to ensure white background
    mainWindow?.webContents.insertCSS('body { background-color: white !important; }');
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  
  createMenu();
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new') },
        { label: 'Open Project', accelerator: 'CmdOrCtrl+O', click: () => openProject() },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => saveProjectAs() },
        { type: 'separator' },
        { label: 'Import Pattern', click: () => importPattern() },
        { label: 'Export Marker', submenu: [
          { label: 'Export as HPGL', click: () => mainWindow?.webContents.send('export', 'hpgl') },
          { label: 'Export as PLT', click: () => mainWindow?.webContents.send('export', 'plt') },
          { label: 'Export as DXF', click: () => mainWindow?.webContents.send('export', 'dxf') },
          { label: 'Export as SVG', click: () => mainWindow?.webContents.send('export', 'svg') },
          { label: 'Export as PDF', click: () => mainWindow?.webContents.send('export', 'pdf') }
        ]},
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => mainWindow?.webContents.send('menu-undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', click: () => mainWindow?.webContents.send('menu-redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Delete', accelerator: 'Delete', click: () => mainWindow?.webContents.send('menu-delete') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow?.webContents.send('zoom', 'in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow?.webContents.send('zoom', 'out') },
        { label: 'Fit to Window', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.send('zoom', 'fit') },
        { type: 'separator' },
        { label: 'Show Grid', type: 'checkbox', checked: true, click: (item) => mainWindow?.webContents.send('toggle-grid', item.checked) },
        { label: 'Show Rulers', type: 'checkbox', checked: true, click: (item) => mainWindow?.webContents.send('toggle-rulers', item.checked) }
      ]
    },
    {
      label: 'Pattern',
      submenu: [
        { label: 'Capture Pattern', click: () => mainWindow?.webContents.send('open-capture') },
        { label: 'Edit Pattern', click: () => mainWindow?.webContents.send('open-editor') },
        { label: 'Add Seam Allowance', click: () => mainWindow?.webContents.send('add-seam') },
        { label: 'Add Notches', click: () => mainWindow?.webContents.send('add-notches') },
        { label: 'Set Grain Line', click: () => mainWindow?.webContents.send('set-grain') }
      ]
    },
    {
      label: 'Grading',
      submenu: [
        { label: 'Grade Pattern', click: () => mainWindow?.webContents.send('open-grading') },
        { label: 'Size Range...', click: () => mainWindow?.webContents.send('size-range') },
        { label: 'Grading Rules...', click: () => mainWindow?.webContents.send('grading-rules') }
      ]
    },
    {
      label: 'Marker',
      submenu: [
        { label: 'Create Marker', click: () => mainWindow?.webContents.send('create-marker') },
        { label: 'Auto Nest', accelerator: 'F5', click: () => mainWindow?.webContents.send('auto-nest') },
        { label: 'Fabric Settings...', click: () => mainWindow?.webContents.send('fabric-settings') },
        { type: 'separator' },
        { label: 'Generate Report', click: () => mainWindow?.webContents.send('generate-report') },
        { label: 'Cost Analysis', click: () => mainWindow?.webContents.send('cost-analysis') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => require('electron').shell.openExternal('https://algamax.com/procad/docs') },
        { label: 'License Manager', click: () => showLicenseDialog() }, // Added license option
        { label: 'About ProCAD', click: () => showAbout() }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ===== LICENSE DIALOG WITH RENDERING FIXES =====
function showLicenseDialog() {
  const licenseWindow = new BrowserWindow({
    width: 500,
    height: 400,
    parent: mainWindow!,
    modal: true,
    show: false, // Don't show until ready
    resizable: false,
    backgroundColor: '#f0f0f0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      hardwareAcceleration: false, // IMPORTANT FIX
      webSecurity: false,
      offscreen: false
    },
    title: 'ProCAD License Manager'
  });

  // Create license dialog HTML
  const licenseHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ProCAD License Manager</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          padding: 20px;
        }
        .container { 
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 400px;width: 100%;
        }
        h2 { 
          color: #333;
          margin-bottom: 10px;
          text-align: center;
        }
        .subtitle {
          color: #666;
          text-align: center;
          margin-bottom: 30px;font-size: 14px;
        }
        .input-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
        }
        input { 
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 25px;
        }
        button { 
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        }
        .btn-primary {
          background: #667eea;
          color: white;
        }
        .btn-primary:hover {
          background: #5568d3;
          transform: translateY(-2px);box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
          background: #e0e0e0;
          color: #666;
        }
        .btn-secondary:hover {
          background: #d0d0d0;
        }
        .status {
          margin-top: 15px;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
          font-size: 13px;
          display: none;
        }
        .status.success {
          background: #d4edda;
          color: #155724;
          display: block;
        }
        .status.error {
          background: #f8d7da;
          color: #721c24;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🔐 ProCAD License</h2>
        <p class="subtitle">Enter your license key to activate</p>
        
        <div class="input-group">
          <label for="licenseKey">License Key</label>
          <input type="text" id="licenseKey" placeholder="XXXX-XXXX-XXXX-XXXX" />
        </div>
        
        <div class="input-group">
          <label for="email">Email (Optional)</label>
          <input type="email" id="email" placeholder="your@email.com" />
        </div>
        
        <div class="button-group">
          <button class="btn-secondary" onclick="skipLicense()">Trial Mode</button>
          <button class="btn-primary" onclick="activateLicense()">Activate</button>
        </div>
        
        <div id="status" class="status"></div>
      </div>
      
      <script>
        function activateLicense() {
          const key = document.getElementById('licenseKey').value.trim();
          const email = document.getElementById('email').value.trim();
          const status = document.getElementById('status');
          
          if (!key) {
            status.className = 'status error';
            status.textContent = '❌ Please enter a license key';
            return;
          }
          
          // Simple validation (you can add more complex validation)
          if (key.length < 10) {
            status.className = 'status error';
            status.textContent = '❌ Invalid license key format';
            return;
          }
          
          status.className = 'status success';
          status.textContent = '✅ License activated successfully!';
          
          setTimeout(() => {
            window.close();
          }, 1500);
        }
        
        function skipLicense() {
          if (confirm('Continue in Trial Mode? Some features may be limited.')) {
            window.close();
          }
        }
        
        // Enter key to activate
        document.getElementById('licenseKey').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') activateLicense();
        });
      </script>
    </body>
    </html>
  `;

  // Load the license dialog
  licenseWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(licenseHTML));
  
  // Show only when ready - PREVENTS BLANK DIALOG
  licenseWindow.once('ready-to-show', () => {
    licenseWindow.show();
  });
}

async function openProject() {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'ProCAD Project', extensions: ['pcad'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const data = fs.readFileSync(result.filePaths[0], 'utf-8');
    mainWindow?.webContents.send('project-opened', JSON.parse(data), result.filePaths[0]);
  }
}

async function saveProjectAs() {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'ProCAD Project', extensions: ['pcad'] }]
  });
  if (!result.canceled && result.filePath) {
    mainWindow?.webContents.send('save-project-as', result.filePath);
  }
}

async function importPattern() {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [
      { name: 'Pattern Files', extensions: ['dxf', 'svg', 'plt', 'hpgl'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });
  if (!result.canceled) {
    mainWindow?.webContents.send('import-patterns', result.filePaths);
  }
}

function showAbout() {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'About ProCAD',
    message: 'ProCAD by AlgaMax',
    detail: 'Version 1.0.0\n\nProfessional Pattern CAD Software\nPattern Capture • Pattern Making • Grading • Marker Making\n\n© 2024 AlgaMax. All rights reserved.'
  });
}

// IPC Handlers
ipcMain.handle('save-file', async (_, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content);
  return true;
});

ipcMain.handle('read-file', async (_, filePath: string) => {
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('show-save-dialog', async (_, options: Electron.SaveDialogOptions) => {
  return dialog.showSaveDialog(mainWindow!, options);
});

ipcMain.handle('show-open-dialog', async (_, options: Electron.OpenDialogOptions) => {
  return dialog.showOpenDialog(mainWindow!, options);
});

// ===== APP INITIALIZATION =====
app.whenReady().then(() => {
  createWindow();
  
  // Show license dialog after main window is ready (optional - remove if you don't want auto-show)
  setTimeout(() => {
    showLicenseDialog();
  }, 2000);
});

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});

app.on('activate', () => { 
  if (mainWindow === null) createWindow(); 
});
