import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ElectronAPI } from '../renderer/src/types/electron.d'

// Custom APIs for renderer — typed IPC bridge
const api: ElectronAPI = {
  // Auth
  checkAuth: () => ipcRenderer.invoke('auth:check'),
  openLogin: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Fetch
  fetchUsers: (screenNames) => ipcRenderer.invoke('fetch:users', screenNames),
  onFetchProgress: (callback) => {
    ipcRenderer.on('fetch:progress', (_, progress) => callback(progress))
  },

  // Config
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),

  // Export & Files
  exportImage: (dataUrl) => ipcRenderer.invoke('export:save', dataUrl),
  readFileBase64: (filePath) => ipcRenderer.invoke('file:readBase64', filePath),

  // Theme
  getSystemTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeChange: (callback) => {
    ipcRenderer.on('theme:change', (_, theme) => callback(theme))
  },

  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// Expose in main world
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
