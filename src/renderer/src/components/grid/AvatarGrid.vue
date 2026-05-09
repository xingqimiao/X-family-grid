<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/app-store'
import { useGrid } from '../../composables/useGrid'
import { useExport } from '../../composables/useExport'
import AvatarCell from './AvatarCell.vue'
import GhostCell from './GhostCell.vue'
import GlassButton from '../ui/GlassButton.vue'
import { Download, Wand2 } from 'lucide-vue-next'

const store = useAppStore()
const { gridSize, emptySlots, orderedPeople, initialSort } = useGrid()
const { isExporting, exportGrid } = useExport()

const gridRef = ref<HTMLElement | null>(null)
const dragFromIdx = ref<number | null>(null)
const dragOverIdx = ref<number | null>(null)

watch(
  () => store.relations.length,
  () => {
    if (store.relations.length > 0 && store.gridOrder.length === 0) {
      initialSort()
    }
  }
)

function onDragStart(index: number, event: DragEvent): void {
  dragFromIdx.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number, event: DragEvent): void {
  event.preventDefault()
  dragOverIdx.value = index
}

function onDragLeave(): void {
  dragOverIdx.value = null
}

function onDrop(toIndex: number, event: DragEvent): void {
  event.preventDefault()
  const fromIndex = dragFromIdx.value
  if (fromIndex !== null && fromIndex !== toIndex) {
    store.swapGridPositions(fromIndex, toIndex)
  }
  dragFromIdx.value = null
  dragOverIdx.value = null
}

function onDragEnd(): void {
  dragFromIdx.value = null
  dragOverIdx.value = null
}

async function handleExport(): Promise<void> {
  if (!gridRef.value) return
  // If it's a TransitionGroup, gridRef.value might be the component instance. We need the $el.
  const el = (gridRef.value as { $el?: HTMLElement }).$el || gridRef.value
  await exportGrid(el)
}

const hoverLines = computed(() => {
  if (!store.hoveredPersonId) return []
  const hoveredIdx = orderedPeople.value.findIndex((p) => p.id === store.hoveredPersonId)
  if (hoveredIdx === -1) return []

  const n = gridSize.value || 1
  const getCenter = (idx: number): { x: number; y: number } => ({
    x: (((idx % n) + 0.5) / n) * 100,
    y: ((Math.floor(idx / n) + 0.5) / n) * 100
  })

  const start = getCenter(hoveredIdx)
  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []

  const related = store.getRelatedPeople(store.hoveredPersonId)
  related.forEach((targetId) => {
    const targetIdx = orderedPeople.value.findIndex((p) => p.id === targetId)
    if (targetIdx !== -1) {
      const end = getCenter(targetIdx)
      lines.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, key: targetId })
    }
  })
  return lines
})
</script>

<template>
  <div class="avatar-grid-wrapper">
    <div v-if="store.people.length > 0" class="grid-toolbar">
      <span class="font-mono" style="font-size: 0.8125rem; color: var(--text-muted)">
        {{ store.people.length }} 人 · {{ gridSize }}×{{ gridSize }}
      </span>
      <div style="display: flex; gap: 0.5rem">
        <GlassButton
          :icon="Wand2"
          tooltip="按粉丝数和亲密关系自动排列头像位置"
          @click="initialSort()"
          >智能排列</GlassButton
        >
        <GlassButton
          primary
          :icon="Download"
          :loading="isExporting"
          tooltip="将当前拼图导出为高清 PNG 图片"
          @click="handleExport"
        >
          导出拼图
        </GlassButton>
      </div>
    </div>

    <TransitionGroup
      v-if="store.people.length > 0"
      ref="gridRef"
      name="grid-anim"
      tag="div"
      class="avatar-grid relative"
      :style="{
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize}, 1fr)`
      }"
    >
      <AvatarCell
        v-for="(person, index) in orderedPeople"
        :key="person.id"
        :person="person"
        :index="index"
        :is-dragging="dragFromIdx === index"
        :is-drag-over="dragOverIdx === index"
        :is-dimmed="
          store.hoveredPersonId !== null &&
          store.hoveredPersonId !== person.id &&
          !store.getRelatedPeople(store.hoveredPersonId).has(person.id)
        "
        :is-highlighted="
          store.hoveredPersonId !== null &&
          (store.hoveredPersonId === person.id ||
            store.getRelatedPeople(store.hoveredPersonId).has(person.id))
        "
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @dragleave="onDragLeave"
        @drop="onDrop(index, $event)"
        @dragend="onDragEnd"
        @mouseenter="store.hoveredPersonId = person.id"
        @mouseleave="store.hoveredPersonId = null"
      />

      <GhostCell
        v-for="i in emptySlots"
        :key="`ghost-${i}`"
        :remaining="emptySlots - i + 1"
        :total-empty="emptySlots"
      />

      <!-- Electric lines overlay -->
      <svg
        v-if="hoverLines.length > 0"
        key="lines-overlay"
        class="electric-lines-overlay export-exclude"
      >
        <line
          v-for="line in hoverLines"
          :key="line.key"
          :x1="line.x1 + '%'"
          :y1="line.y1 + '%'"
          :x2="line.x2 + '%'"
          :y2="line.y2 + '%'"
          stroke="var(--accent-1)"
          stroke-width="3"
          class="electric-line"
        />
      </svg>
    </TransitionGroup>

    <div v-else class="empty-state">
      <div class="floating" style="font-size: 3rem; margin-bottom: 1rem">✨</div>
      <h3
        style="
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        "
      >
        还没有小伙伴
      </h3>
      <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 300px">
        登录 Twitter 并添加好友 ID，开始创建你的大家庭拼图
      </p>
    </div>
  </div>
</template>

<style scoped>
.avatar-grid-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}
.grid-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.avatar-grid {
  display: grid;
  gap: 3px;
  aspect-ratio: 1;
  max-height: calc(100vh - 200px);
  max-width: calc(100vh - 200px);
  margin: 0 auto;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--border-subtle);
  position: relative;
}
.electric-lines-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  flex: 1;
}

/* Transition Group Animations for Grid Cells */
.grid-anim-move {
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.grid-anim-enter-active,
.grid-anim-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.grid-anim-enter-from,
.grid-anim-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
