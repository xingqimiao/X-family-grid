<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import { useAppStore } from '../../stores/app-store'
import { useRelations } from '../../composables/useRelations'
import { useFetch } from '../../composables/useFetch'
import GlassButton from '../ui/GlassButton.vue'
import AddRelationModal from './AddRelationModal.vue'
import GlowEdge from './GlowEdge.vue'
import { RefreshCw, Copy, Unlink, Trash2, Plus } from 'lucide-vue-next'

const store = useAppStore()
const { runAnalysis, removeRelationsForPerson } = useRelations()
const { startFetch } = useFetch()

// Register custom edge type
const edgeTypes: Record<string, any> = { glow: GlowEdge }

/**
 * Relation-aware layout: place connected nodes side-by-side on the same row
 * so edges are naturally horizontal.
 */
const nodePositions = computed(() => {
  const positions = new Map<string, { x: number; y: number }>()
  const placed = new Set<string>()

  const COL_W = 250  // horizontal spacing (wider for glow room)
  const ROW_H = 220  // vertical spacing
  let currentRow = 0

  // 1. Group related pairs on the same row
  for (const rel of store.relations) {
    const sId = rel.sourceId
    const tId = rel.targetId
    if (placed.has(sId) && placed.has(tId)) continue

    if (!placed.has(sId) && !placed.has(tId)) {
      positions.set(sId, { x: 0, y: currentRow * ROW_H })
      positions.set(tId, { x: COL_W, y: currentRow * ROW_H })
      placed.add(sId)
      placed.add(tId)
      currentRow++
    } else if (placed.has(sId) && !placed.has(tId)) {
      const srcPos = positions.get(sId)!
      positions.set(tId, { x: srcPos.x + COL_W, y: srcPos.y })
      placed.add(tId)
    } else if (!placed.has(sId) && placed.has(tId)) {
      const tgtPos = positions.get(tId)!
      positions.set(sId, { x: tgtPos.x - COL_W, y: tgtPos.y })
      placed.add(sId)
    }
  }

  // 2. Place remaining unconnected nodes in a row below
  const unplaced = store.people.filter(p => !placed.has(p.id))
  unplaced.forEach((person, i) => {
    positions.set(person.id, { x: i * COL_W, y: currentRow * ROW_H })
  })

  return positions
})

const nodes = computed(() => {
  return store.people.map((person) => ({
    id: person.id,
    position: nodePositions.value.get(person.id) || { x: 0, y: 0 },
    data: { person },
    type: 'default',
    style: {
      width: '120px',
      borderRadius: '16px',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-glass)',
      padding: '8px',
      textAlign: 'center' as const
    }
  }))
})

const edges = computed(() => {
  return store.relations.map((rel) => {
    let label = ''
    const a = rel.mentionTextAtoB
    const b = rel.mentionTextBtoA

    if (a && b) {
      label = a === b ? a : `${a} ↔ ${b}`
    } else if (a || b) {
      label = (a || b)!
    }

    return {
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      type: 'glow',
      data: { direction: rel.direction },
      label,
      markerEnd: rel.direction === 'unidirectional' ? 'arrowclosed' : undefined,
    }
  })
})

function handleAnalyze(): void {
  runAnalysis()
}

const showAddModal = ref(false)

// Context menu logic
import { ref } from 'vue'
import type { Person } from '../../types/person'

const showMenu = ref(false)
const menuPos = ref({ x: 0, y: 0 })
const activePerson = ref<Person | null>(null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onNodeContextMenu(event: any): void {
  event.event.preventDefault()
  activePerson.value = event.node.data.person
  menuPos.value = { x: event.event.clientX, y: event.event.clientY }
  showMenu.value = true
  const close = () => { showMenu.value = false; window.removeEventListener('click', close) }
  setTimeout(() => window.addEventListener('click', close), 0)
}

function copyBio(): void {
  if (activePerson.value) navigator.clipboard.writeText(activePerson.value.bio || '')
  showMenu.value = false
}

function removePerson(): void {
  if (activePerson.value) store.removePerson(activePerson.value.id)
  showMenu.value = false
}

function unlinkAll(): void {
  if (activePerson.value) removeRelationsForPerson(activePerson.value.id)
  showMenu.value = false
}

function refetchUser(): void {
  if (activePerson.value) startFetch(activePerson.value.screenName)
  showMenu.value = false
}
</script>

<template>
  <div class="relation-graph">
    <div class="graph-toolbar">
      <div style="display: flex; gap: 0.5rem">
        <GlassButton :icon="Plus" @click="showAddModal = true" tooltip="手动添加两个人之间的关系连线">
          添加自定义关系
        </GlassButton>
        <GlassButton :icon="RefreshCw" @click="handleAnalyze" tooltip="重新扫描所有人的 Bio，自动发现 @提及关系">
          重新分析关系
        </GlassButton>
      </div>
    </div>

    <div class="graph-container">
      <VueFlow
        v-if="nodes.length > 0"
        :nodes="nodes"
        :edges="edges"
        :edge-types="edgeTypes"
        :default-viewport="{ zoom: 0.8, x: 50, y: 50 }"
        fit-view-on-init
        class="vue-flow-wrapper"
        @node-context-menu="onNodeContextMenu"
      >
        <template #node-default="{ data }">
          <div class="graph-node bounce-in">
            <img
              v-if="data.person.avatarUrl"
              :src="data.person.avatarUrl"
              class="node-avatar"
            />
            <div v-else class="node-avatar-placeholder">
              {{ data.person.name?.charAt(0) }}
            </div>
            <span class="node-name">{{ data.person.name }}</span>
            <span class="node-handle font-mono">@{{ data.person.screenName }}</span>
          </div>
        </template>

        <Controls position="bottom-right" />
        <MiniMap />
      </VueFlow>

      <div v-else class="graph-empty">
        <p>添加好友后，点击"重新分析关系"查看关系图谱</p>
      </div>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="showMenu"
        class="glass-context-menu bounce-in"
        :style="{ position: 'fixed', left: menuPos.x + 'px', top: menuPos.y + 'px', zIndex: 200 }"
      >
        <div class="glass-context-item" @click="refetchUser">
          <RefreshCw :size="14" /> 重新抓取该用户
        </div>
        <div class="glass-context-item" @click="copyBio">
          <Copy :size="14" /> 复制 Bio 文本
        </div>
        <div class="glass-context-item" @click="unlinkAll">
          <Unlink :size="14" /> 解除所有关系
        </div>
        <div class="glass-context-separator" />
        <div class="glass-context-item glass-context-item--danger" @click="removePerson">
          <Trash2 :size="14" /> 从项目中移除
        </div>
      </div>
    </Teleport>

    <!-- Custom Relation Modal -->
    <AddRelationModal :show="showAddModal" @close="showAddModal = false" />
  </div>
</template>

<style scoped>
.relation-graph {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}
.graph-toolbar { flex-shrink: 0; }
.graph-container {
  flex: 1;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  min-height: 400px;
}
.vue-flow-wrapper { width: 100%; height: 100%; }
.graph-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
}
.node-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent-1);
}
.node-avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
}
.node-name {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node-handle {
  font-size: 0.5625rem;
  color: var(--text-muted);
}
.graph-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  color: var(--text-muted);
  font-size: 0.875rem;
}
</style>
