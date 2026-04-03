const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  loadData: () => ipcRenderer.invoke('load-data'),
  refreshData: () => ipcRenderer.invoke('refresh-data'),
  getPatientDetails: (code) => ipcRenderer.invoke('get-patient-details', code),
  getICData: (code) => ipcRenderer.invoke('get-ic-data', code),
  getFrameworkData: (code) => ipcRenderer.invoke('get-framework-data', code),
  getDataVersion: () => ipcRenderer.invoke('get-data-version'),
  addRecords: (data) => ipcRenderer.invoke('add-records', data),
  getFilterOptions: () => ipcRenderer.invoke('get-filter-options'),
  getDashboardStats: (filters) => ipcRenderer.invoke('get-dashboard-stats', filters),
  getSearchStats: (filters) => ipcRenderer.invoke('get-search-stats', filters),
  getProfileServices: (ccode, pcode) => ipcRenderer.invoke('get-profile-services', ccode, pcode),
  exportExcel: (data) => ipcRenderer.invoke('export-excel', data),
  onProgress: (callback) => ipcRenderer.on('download-progress', (_event, msg) => callback(msg)),
});
