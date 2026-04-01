const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  loadData: () => ipcRenderer.invoke('load-data'),
  refreshData: () => ipcRenderer.invoke('refresh-data'),
  getPatientDetails: (code) => ipcRenderer.invoke('get-patient-details', code),
  addRecords: (data) => ipcRenderer.invoke('add-records', data),
  exportExcel: (data) => ipcRenderer.invoke('export-excel', data),
  onProgress: (callback) => ipcRenderer.on('download-progress', (_event, msg) => callback(msg)),
});
