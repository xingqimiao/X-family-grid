import { getTwitterApi } from './twitter-api'
import { getFileManager } from './file-manager'
import type { PersonData } from '../renderer/src/types/person'

export interface QueueCallbacks {
  onProgress: (
    current: number,
    total: number,
    screenName: string,
    status: string,
    error?: string
  ) => void
  onComplete: (results: Array<{ success: boolean; person?: PersonData; error?: string }>) => void
}

/**
 * Rate-limited fetch queue with random jitter (800ms–2000ms) to avoid rate limiting.
 * Processes requests sequentially with anti-ban delays.
 */
export class FetchQueue {
  private isProcessing = false
  private queue: string[] = []

  /** Add screen names to the queue and start processing */
  async processQueue(screenNames: string[], callbacks: QueueCallbacks): Promise<void> {
    if (this.isProcessing) {
      console.warn('[FetchQueue] Already processing, ignoring new request')
      // IMPORTANT: still call onComplete so the IPC invoke doesn't hang forever
      callbacks.onComplete([])
      return
    }

    // Deduplicate
    const unique = [
      ...new Set(screenNames.map((s) => s.trim().replace(/^@/, '').toLowerCase()))
    ].filter(Boolean)

    if (unique.length === 0) {
      callbacks.onComplete([])
      return
    }

    this.queue = unique
    this.isProcessing = true

    const api = getTwitterApi()
    const fm = getFileManager()
    const results: Array<{ success: boolean; person?: PersonData; error?: string }> = []

    try {
      for (let i = 0; i < this.queue.length; i++) {
        const screenName = this.queue[i]
        callbacks.onProgress(i + 1, this.queue.length, screenName, 'fetching')

        try {
          const person = await api.getUserByScreenName(screenName)

          if (!person) {
            results.push({ success: false, error: `未找到用户 @${screenName}（可能已冻结/注销）` })
            callbacks.onProgress(i + 1, this.queue.length, screenName, 'error', `未找到用户`)
          } else {
            // Download avatar (best-effort, don't block on failure)
            if (person.avatarUrl) {
              try {
                const buffer = await api.downloadAvatar(person.avatarUrl)
                if (buffer) {
                  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                  const filename = `${person.screenName}_${date}.png`
                  const savedPath = await fm.saveAvatar(buffer, filename)
                  person.localAvatarPath = savedPath
                }
              } catch (dlErr) {
                console.warn(
                  `[FetchQueue] Avatar download failed for @${screenName}, continuing:`,
                  dlErr
                )
              }
            }

            results.push({ success: true, person })
            callbacks.onProgress(i + 1, this.queue.length, screenName, 'success')
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          results.push({ success: false, error: errorMsg })
          callbacks.onProgress(i + 1, this.queue.length, screenName, 'error', errorMsg)
        }

        // Jitter delay: 800ms–2000ms (skip on last item)
        if (i < this.queue.length - 1) {
          const delay = 800 + Math.random() * 1200
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    } finally {
      // ALWAYS reset state and call onComplete, even on unexpected errors
      this.isProcessing = false
      this.queue = []
      console.log(
        `[FetchQueue] Complete: ${results.filter((r) => r.success).length}/${results.length} succeeded`
      )
      callbacks.onComplete(results)
    }
  }

  /** Check if currently processing */
  getIsProcessing(): boolean {
    return this.isProcessing
  }
}

// Singleton
let instance: FetchQueue | null = null
export function getFetchQueue(): FetchQueue {
  if (!instance) instance = new FetchQueue()
  return instance
}
