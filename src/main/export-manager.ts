import { dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'

/**
 * Handles high-fidelity image export with native save dialog.
 */
export class ExportManager {
  /** Show save dialog and write the exported image */
  async saveExportedImage(parentWindow: BrowserWindow, dataUrl: string): Promise<string | null> {
    const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
      title: '导出拼图',
      defaultPath: `X-Family-Grid_${new Date().toISOString().slice(0, 10)}.png`,
      filters: [
        { name: 'PNG 图片', extensions: ['png'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (canceled || !filePath) return null

    try {
      // Convert data URL to buffer
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64, 'base64')
      await fs.writeFile(filePath, buffer)
      return filePath
    } catch (error) {
      console.error('[ExportManager] Failed to save image:', error)
      throw error
    }
  }
}

// Singleton
let instance: ExportManager | null = null
export function getExportManager(): ExportManager {
  if (!instance) instance = new ExportManager()
  return instance
}
