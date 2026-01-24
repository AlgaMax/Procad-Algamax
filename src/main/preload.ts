/**
 * ProCAD by AlgaMax - Preload Script
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('save-file', filePath, content),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Menu events
  onMenuNew: (callback: () => void) => ipcRenderer.on('menu-new', callback),
  onMenuSave: (callback: () => void) => ipcRenderer.on('menu-save', callback),
  onMenuUndo: (callback: () => void) => ipcRenderer.on('menu-undo', callback),
  onMenuRedo: (callback: () => void) => ipcRenderer.on('menu-redo', callback),
  onMenuDelete: (callback: () => void) => ipcRenderer.on('menu-delete', callback),
  
  // Project events
  onProjectOpened: (callback: (data: any, path: string) => void) => 
    ipcRenderer.on('project-opened', (_, data, path) => callback(data, path)),
  onSaveProjectAs: (callback: (path: string) => void) => 
    ipcRenderer.on('save-project-as', (_, path) => callback(path)),
  onImportPatterns: (callback: (paths: string[]) => void) => 
    ipcRenderer.on('import-patterns', (_, paths) => callback(paths)),
  
  // View events
  onZoom: (callback: (action: string) => void) => ipcRenderer.on('zoom', (_, action) => callback(action)),
  onToggleGrid: (callback: (show: boolean) => void) => ipcRenderer.on('toggle-grid', (_, show) => callback(show)),
  onToggleRulers: (callback: (show: boolean) => void) => ipcRenderer.on('toggle-rulers', (_, show) => callback(show)),
  
  // Pattern events
  onOpenCapture: (callback: () => void) => ipcRenderer.on('open-capture', callback),
  onOpenEditor: (callback: () => void) => ipcRenderer.on('open-editor', callback),
  onAddSeam: (callback: () => void) => ipcRenderer.on('add-seam', callback),
  onAddNotches: (callback: () => void) => ipcRenderer.on('add-notches', callback),
  onSetGrain: (callback: () => void) => ipcRenderer.on('set-grain', callback),
  
  // Grading events
  onOpenGrading: (callback: () => void) => ipcRenderer.on('open-grading', callback),
  onSizeRange: (callback: () => void) => ipcRenderer.on('size-range', callback),
  onGradingRules: (callback: () => void) => ipcRenderer.on('grading-rules', callback),
  
  // Marker events
  onCreateMarker: (callback: () => void) => ipcRenderer.on('create-marker', callback),
  onAutoNest: (callback: () => void) => ipcRenderer.on('auto-nest', callback),
  onFabricSettings: (callback: () => void) => ipcRenderer.on('fabric-settings', callback),
  onGenerateReport: (callback: () => void) => ipcRenderer.on('generate-report', callback),
  onCostAnalysis: (callback: () => void) => ipcRenderer.on('cost-analysis', callback),
  
  // Export events
  onExport: (callback: (format: string) => void) => ipcRenderer.on('export', (_, format) => callback(format))
});
