import type { PersonData } from './person'
import type { Relation } from './relation'

/** Auth check result from main process */
export interface AuthCheckResult {
  isAuthenticated: boolean
  user?: {
    id: string
    screenName: string
    name: string
    avatarUrl: string
  }
}

/** Fetch progress event payload */
export interface FetchProgressPayload {
  current: number
  total: number
  screenName: string
  status: 'fetching' | 'success' | 'error'
  errorMessage?: string
}

/** Fetch result for a single user */
export interface FetchUserResult {
  success: boolean
  person?: PersonData
  error?: string
}

/** App configuration persisted to disk */
export interface AppConfig {
  version: number
  people: PersonData[]
  relations: Relation[]
  gridOrder: string[]
  theme: 'light' | 'dark' | 'system'
  exportScale: number
}

/** Electron API exposed via preload contextBridge */
export interface ElectronAPI {
  // Auth
  checkAuth: () => Promise<AuthCheckResult>
  openLogin: () => Promise<AuthCheckResult>


  // Fetch
  fetchUsers: (screenNames: string[]) => Promise<FetchUserResult[]>
  onFetchProgress: (callback: (progress: FetchProgressPayload) => void) => void

  // Config persistence
  loadConfig: () => Promise<AppConfig | null>
  saveConfig: (config: AppConfig) => Promise<void>

  // Export & Files
  exportImage: (dataUrl: string) => Promise<string | null>
  readFileBase64: (filePath: string) => Promise<string | null>

  // Theme
  getSystemTheme: () => Promise<'light' | 'dark'>
  onThemeChange: (callback: (theme: 'light' | 'dark') => void) => void

  // Cleanup
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
