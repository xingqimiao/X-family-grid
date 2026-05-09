import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getSessionManager } from './session-manager'
import { getFileManager } from './file-manager'
import { getFetchQueue } from './fetch-queue'
import { getExportManager } from './export-manager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f1729' : '#fafbff',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: true,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Register all IPC handlers */
function registerIpcHandlers(): void {
  const sm = getSessionManager()
  const fm = getFileManager()
  const fq = getFetchQueue()
  const em = getExportManager()

  // ===== Auth =====
  ipcMain.handle('auth:check', async () => {
    return await sm.checkAuth()
  })

  ipcMain.handle('auth:login', async () => {
    if (!mainWindow) return { isAuthenticated: false }
    await sm.openLoginWindow(mainWindow)
    const result = await sm.checkAuth()
    return result
  })

  // ===== Fetch =====
  ipcMain.handle('fetch:users', async (_, screenNames: string[]) => {
    return new Promise((resolve) => {
      fq.processQueue(screenNames, {
        onProgress: (current, total, screenName, status, error) => {
          mainWindow?.webContents.send('fetch:progress', {
            current,
            total,
            screenName,
            status,
            errorMessage: error
          })
        },
        onComplete: (results) => {
          resolve(results)
        }
      })
    })
  })

  // ===== Config =====
  ipcMain.handle('config:load', async () => {
    return await fm.loadConfig()
  })

  ipcMain.handle('config:save', async (_, config) => {
    await fm.saveConfig(config)
  })

  // ===== Export =====
  ipcMain.handle('export:save', async (_, dataUrl: string) => {
    if (!mainWindow) return null
    return await em.saveExportedImage(mainWindow, dataUrl)
  })

  // ===== File Reading =====
  ipcMain.handle('file:readBase64', async (_, filePath: string) => {
    try {
      const buffer = await fs.readFile(filePath)
      // Determine mime type from extension
      const ext = filePath.split('.').pop()?.toLowerCase() || 'jpeg'
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      return `data:${mime};base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error('[Main] Failed to read file as base64:', filePath, e)
      return null
    }
  })

  // ===== Theme =====
  ipcMain.handle('theme:get', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })
}

// ===== App Lifecycle =====
app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.xfamilygrid')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize file manager directories
  const fm = getFileManager()
  await fm.init()

  // Register IPC handlers
  registerIpcHandlers()

  // Create main window
  createWindow()

  // Theme change listener
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    mainWindow?.webContents.send('theme:change', theme)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
