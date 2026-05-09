import { useAppStore } from '../stores/app-store'
import type { PersonData } from '../types/person'

/**
 * Composable for batch user fetching via the main process queue.
 */
export function useFetch() {
  const store = useAppStore()

  /** Parse raw input into clean screen names */
  function parseIds(rawInput: string): string[] {
    return rawInput
      .split(/[\n,;\s]+/)
      .map((s) => s.trim().replace(/^@/, '').replace(/https?:\/\/(x|twitter)\.com\//, '').replace(/\/.*$/, ''))
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
  }

  /** Start fetching users */
  async function startFetch(rawInput: string): Promise<void> {
    const screenNames = parseIds(rawInput)
    if (screenNames.length === 0) return

    store.isFetching = true
    store.fetchProgress = { current: 0, total: screenNames.length, screenName: '', status: '' }

    // Listen for progress updates
    window.api.onFetchProgress((progress) => {
      store.fetchProgress = {
        current: progress.current,
        total: progress.total,
        screenName: progress.screenName,
        status: progress.status
      }
    })

    try {
      const results = await window.api.fetchUsers(screenNames)

      console.log('[useFetch] Fetch results:', JSON.stringify(results?.map((r) => ({
        success: r.success,
        name: r.person?.name,
        error: r.error
      }))))

      // Collect successful results
      const newPeople: PersonData[] = (results || [])
        .filter((r) => r.success && r.person)
        .map((r) => r.person!)

      console.log(`[useFetch] Adding ${newPeople.length} people to store`)

      if (newPeople.length > 0) {
        store.addPeople(newPeople)
        console.log(`[useFetch] Store now has ${store.people.length} people`)
      }

      // Log errors
      const errors = (results || []).filter((r) => !r.success)
      if (errors.length > 0) {
        console.warn('[useFetch] Failed users:', errors.map((e) => e.error).join(', '))
      }
    } catch (error) {
      console.error('[useFetch] Fetch failed:', error)
    } finally {
      store.isFetching = false
      // Clean up listener
      window.api.removeAllListeners('fetch:progress')
    }
  }

  return { parseIds, startFetch }
}
