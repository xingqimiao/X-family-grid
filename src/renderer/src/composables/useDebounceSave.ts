import { watchDebounced } from '@vueuse/core'
import { useAppStore } from '../stores/app-store'

/**
 * Composable for debounced silent config persistence.
 * Watches state changes and saves after 1000ms of inactivity.
 */
export function useDebounceSave() {
  const store = useAppStore()

  function startWatching(): void {
    // Watch all persistable state with 1000ms debounce
    watchDebounced(
      () => store.serializeConfig(),
      async (config) => {
        try {
          await window.api.saveConfig(config)
        } catch (error) {
          console.error('[useDebounceSave] Silent save failed:', error)
        }
      },
      {
        debounce: 1000,
        deep: true,
        maxWait: 5000
      }
    )
  }

  return { startWatching }
}
