<script setup lang="ts">
import { ref } from 'vue'
import type { Person } from '../../types/person'
import { useAppStore } from '../../stores/app-store'
import { useRelations } from '../../composables/useRelations'
import { useFetch } from '../../composables/useFetch'
import { RefreshCw, Copy, Unlink, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  person: Person
  index: number
  isDragging?: boolean
  isDragOver?: boolean
  isDimmed?: boolean
  isHighlighted?: boolean
}>()

defineEmits<{
  mouseenter: []
  mouseleave: []
}>()

const store = useAppStore()
const { removeRelationsForPerson } = useRelations()
const { startFetch } = useFetch()
const showMenu = ref(false)
const menuPos = ref({ x: 0, y: 0 })

function onContextMenu(e: MouseEvent): void {
  e.preventDefault()
  menuPos.value = { x: e.clientX, y: e.clientY }
  showMenu.value = true
  const close = (): void => {
    showMenu.value = false
    window.removeEventListener('click', close)
  }
  setTimeout(() => window.addEventListener('click', close), 0)
}

function copyBio(): void {
  navigator.clipboard.writeText(props.person.bio || '')
  showMenu.value = false
}

function removePerson(): void {
  store.removePerson(props.person.id)
  showMenu.value = false
}

function unlinkAll(): void {
  removeRelationsForPerson(props.person.id)
  showMenu.value = false
}

function refetchUser(): void {
  startFetch(props.person.screenName)
  showMenu.value = false
}
</script>

<template>
  <div
    class="avatar-cell"
    :class="{
      'drag-ghost': isDragging,
      'drag-over': isDragOver,
      'is-dimmed': isDimmed,
      'is-highlighted': isHighlighted
    }"
    @contextmenu="onContextMenu"
  >
    <img
      v-if="person.avatarUrl"
      :src="person.avatarUrl"
      :data-local-path="person.localAvatarPath"
      :alt="person.name"
      class="avatar-img"
      loading="lazy"
    />
    <div v-else class="avatar-placeholder">
      {{ person.name?.charAt(0) || '?' }}
    </div>

    <div class="avatar-overlay">
      <span class="avatar-name">{{ person.name }}</span>
      <span class="avatar-handle font-mono">@{{ person.screenName }}</span>
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
        <div class="glass-context-item" @click="copyBio"><Copy :size="14" /> 复制 Bio 文本</div>
        <div class="glass-context-item" @click="unlinkAll"><Unlink :size="14" /> 解除所有关系</div>
        <div class="glass-context-separator" />
        <div class="glass-context-item glass-context-item--danger" @click="removePerson">
          <Trash2 :size="14" /> 从项目中移除
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.avatar-cell {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: grab;
  transition:
    filter 0.35s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease;
}
.avatar-cell:active {
  cursor: grabbing;
}
.avatar-cell.is-dimmed {
  filter: brightness(0.3);
}
.avatar-cell.is-highlighted {
  filter: brightness(1);
  box-shadow: inset 0 0 0 2px var(--accent-2);
  z-index: 2;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
}
.avatar-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  transform: translateY(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}
.avatar-cell:hover .avatar-overlay {
  transform: translateY(0);
}
.avatar-name {
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}
.avatar-handle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.625rem;
}
</style>
