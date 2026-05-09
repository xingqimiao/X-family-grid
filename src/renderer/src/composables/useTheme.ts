import { ref, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/app-store'

/**
 * Composable for theme management.
 * Supports system auto-detection and manual override.
 */
export function useTheme() {
  const store = useAppStore()
  const resolvedTheme = ref<'light' | 'dark'>('light')

  function applyTheme(theme: 'light' | 'dark'): void {
    resolvedTheme.value = theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  async function resolveAndApply(): Promise<void> {
    if (store.theme === 'system') {
      try {
        const systemTheme = await window.api.getSystemTheme()
        applyTheme(systemTheme)
      } catch {
        applyTheme('light')
      }
    } else {
      applyTheme(store.theme)
    }
  }

  function toggleTheme(): void {
    const newTheme = resolvedTheme.value === 'light' ? 'dark' : 'light'
    store.setTheme(newTheme)
    applyTheme(newTheme)
  }

  // Watch store.theme changes
  watch(() => store.theme, resolveAndApply)

  // Listen for system theme changes
  onMounted(() => {
    resolveAndApply()
    try {
      window.api.onThemeChange((theme) => {
        if (store.theme === 'system') {
          applyTheme(theme)
        }
      })
    } catch {
      // Not in Electron context
    }
  })

  return { resolvedTheme, toggleTheme, applyTheme }
}
