import { onMounted } from 'vue'
import { useAppStore } from '../stores/app-store'

/**
 * Composable for authentication state management.
 */
export function useAuth() {
  const store = useAppStore()

  /** Check auth status on startup */
  async function checkAuthOnStartup(): Promise<void> {
    try {
      const result = await window.api.checkAuth()
      store.setAuth(result.isAuthenticated, result.user)
    } catch (error) {
      console.error('[useAuth] Failed to check auth:', error)
      store.setAuth(false)
    }
  }

  /** Open login window and get result directly from invoke return */
  async function login(): Promise<void> {
    try {
      const result = await window.api.openLogin()
      if (result && result.isAuthenticated) {
        store.setAuth(true, result.user)
      } else {
        // Login window was closed without completing login — re-check just in case
        await checkAuthOnStartup()
      }
    } catch (error) {
      console.error('[useAuth] Login failed:', error)
    }
  }

  /** Clear session */
  function logout(): void {
    store.setAuth(false)
  }

  onMounted(() => {
    checkAuthOnStartup()
  })

  return { login, logout, checkAuthOnStartup }
}
