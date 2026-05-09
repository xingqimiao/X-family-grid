import { ref } from 'vue'
import { toCanvas } from 'html-to-image'
import { useAppStore } from '../stores/app-store'

/**
 * Composable for high-DPI grid export.
 *
 * Key technique: temporarily remove CSS constraints (max-height, overflow,
 * aspect-ratio) from the grid so html-to-image can capture the full content.
 * Also reads local avatar files via IPC to bypass CORS.
 */
export function useExport() {
  const store = useAppStore()
  const isExporting = ref(false)

  /** Export the grid element as a high-res PNG */
  async function exportGrid(gridElement: HTMLElement): Promise<string | null> {
    if (isExporting.value) return null
    isExporting.value = true

    try {
      const scale = store.exportScale || 3
      console.log('[useExport] Starting export with scale:', scale)

      // ── Step 1: Pre-convert images to base64 data URLs via IPC ──
      const imgElements = gridElement.querySelectorAll('img')
      const originalSrcs: { el: HTMLImageElement; src: string }[] = []

      for (const img of imgElements) {
        const localPath = img.getAttribute('data-local-path')
        if (localPath) {
          try {
            const base64Url = await window.api.readFileBase64(localPath)
            if (base64Url) {
              originalSrcs.push({ el: img, src: img.src })
              img.src = base64Url
            }
          } catch (e) {
            console.warn('[useExport] Could not read local image:', localPath, e)
          }
        }
      }

      // ── Step 2: Temporarily remove CSS clipping constraints ──
      const savedStyles = {
        maxHeight: gridElement.style.maxHeight,
        maxWidth: gridElement.style.maxWidth,
        overflow: gridElement.style.overflow,
        aspectRatio: gridElement.style.aspectRatio,
        height: gridElement.style.height,
      }

      gridElement.style.maxHeight = 'none'
      gridElement.style.maxWidth = 'none'
      gridElement.style.overflow = 'visible'
      gridElement.style.aspectRatio = 'auto'
      gridElement.style.height = 'auto'

      // Give browser a frame to reflow
      await new Promise(r => requestAnimationFrame(r))

      const w = gridElement.scrollWidth
      const h = gridElement.scrollHeight
      console.log('[useExport] Capture dimensions:', w, 'x', h)

      // ── Step 3: Capture ──
      const canvas = await toCanvas(gridElement, {
        pixelRatio: scale,
        cacheBust: false,
        width: w,
        height: h,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#fafbff',
        filter: (node) => {
          if (node instanceof HTMLElement) {
            return !node.classList?.contains('export-exclude')
          }
          return true
        }
      })

      // ── Step 4: Restore CSS + image sources ──
      gridElement.style.maxHeight = savedStyles.maxHeight
      gridElement.style.maxWidth = savedStyles.maxWidth
      gridElement.style.overflow = savedStyles.overflow
      gridElement.style.aspectRatio = savedStyles.aspectRatio
      gridElement.style.height = savedStyles.height

      for (const item of originalSrcs) {
        item.el.src = item.src
      }

      // ── Step 5: Export to data URL ──
      const dataUrl = canvas.toDataURL('image/png')
      console.log('[useExport] Canvas generated, dataUrl length:', dataUrl.length)

      if (!dataUrl || dataUrl === 'data:,') {
        console.error('[useExport] Generated empty image data!')
        return null
      }

      // ── Step 6: Send to main process for save dialog ──
      const savedPath = await window.api.exportImage(dataUrl)
      console.log('[useExport] Saved to:', savedPath)
      return savedPath
    } catch (error) {
      console.error('[useExport] Export failed:', error)
      return null
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportGrid }
}
