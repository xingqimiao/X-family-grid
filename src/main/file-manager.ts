import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

interface AppConfig {
  version: number
  people: unknown[]
  relations: unknown[]
  gridOrder: string[]
  theme: string
  exportScale: number
}

const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  people: [],
  relations: [],
  gridOrder: [],
  theme: 'system',
  exportScale: 3
}

/**
 * Manages persistent file I/O for app configuration and avatar storage.
 * Implements atomic writes (temp file + rename) and corruption recovery.
 */
export class FileManager {
  private basePath: string
  private configPath: string
  private avatarDir: string
  private logDir: string

  constructor() {
    this.basePath = app.getPath('userData')
    this.configPath = join(this.basePath, 'config.json')
    this.avatarDir = join(this.basePath, 'avatars')
    this.logDir = join(this.basePath, 'logs')
  }

  /** Ensure required directories exist */
  async init(): Promise<void> {
    await fs.mkdir(this.avatarDir, { recursive: true })
    await fs.mkdir(this.logDir, { recursive: true })
  }

  /** Load config with corruption recovery */
  async loadConfig(): Promise<AppConfig> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw) as AppConfig

      // Validate required fields
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid config format')
      }

      return {
        version: parsed.version || DEFAULT_CONFIG.version,
        people: Array.isArray(parsed.people) ? parsed.people : [],
        relations: Array.isArray(parsed.relations) ? parsed.relations : [],
        gridOrder: Array.isArray(parsed.gridOrder) ? parsed.gridOrder : [],
        theme: parsed.theme || DEFAULT_CONFIG.theme,
        exportScale: parsed.exportScale || DEFAULT_CONFIG.exportScale
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        // File doesn't exist yet — return defaults
        return { ...DEFAULT_CONFIG }
      }

      // Corrupted config — backup and return defaults
      console.error('[FileManager] Config corrupted, backing up:', error)
      try {
        const backupPath = join(this.basePath, `config.backup.${Date.now()}.json`)
        await fs.rename(this.configPath, backupPath)
        console.log(`[FileManager] Corrupted config backed up to: ${backupPath}`)
      } catch {
        // Backup failed, just continue with defaults
      }
      return { ...DEFAULT_CONFIG }
    }
  }

  /** Save config atomically (write to temp then rename) */
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      const data = JSON.stringify(config, null, 2)
      const tempPath = this.configPath + '.tmp'

      await fs.writeFile(tempPath, data, 'utf-8')
      await fs.rename(tempPath, this.configPath)
    } catch (error) {
      console.error('[FileManager] Failed to save config:', error)
      throw error
    }
  }

  /** Save avatar buffer to avatars directory, return the saved path */
  async saveAvatar(buffer: Buffer, filename: string): Promise<string> {
    const filePath = join(this.avatarDir, filename)
    await fs.writeFile(filePath, buffer)
    return filePath
  }

  /** Get path to a saved avatar */
  getAvatarPath(filename: string): string {
    return join(this.avatarDir, filename)
  }

  /** Write to log file */
  async writeLog(message: string): Promise<void> {
    const date = new Date().toISOString().slice(0, 10)
    const logFile = join(this.logDir, `${date}.log`)
    const timestamp = new Date().toISOString()
    await fs.appendFile(logFile, `[${timestamp}] ${message}\n`, 'utf-8')
  }

  /** Get the avatars directory path */
  getAvatarDir(): string {
    return this.avatarDir
  }
}

// Singleton
let instance: FileManager | null = null
export function getFileManager(): FileManager {
  if (!instance) instance = new FileManager()
  return instance
}
