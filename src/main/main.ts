/**
 * ProCAD by AlgaMax - Main Electron Process
 */

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'ProCAD by AlgaMax'
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
        { label: 'About ProCAD', click: () => showAbout() }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });
