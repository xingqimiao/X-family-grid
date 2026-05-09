<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../../stores/app-store'
import { useRelations } from '../../composables/useRelations'
import GlassButton from '../ui/GlassButton.vue'
import { X } from 'lucide-vue-next'
import type { RelationDirection } from '../../types/relation'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useAppStore()
const { addCustomRelation } = useRelations()

const sourceId = ref('')
const targetId = ref('')
const direction = ref<RelationDirection>('bidirectional')

const sortedPeople = computed(() => {
  return [...store.people].sort((a, b) => a.name.localeCompare(b.name))
})

const isValid = computed(() => {
  return sourceId.value && targetId.value && sourceId.value !== targetId.value
})

function handleSave(): void {
  if (isValid.value) {
    addCustomRelation(sourceId.value, targetId.value, direction.value)
    sourceId.value = ''
    targetId.value = ''
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop">
      <div class="glass-modal bounce-in">
        <div class="modal-header">
          <h3 style="font-weight: 600; margin: 0">添加自定义关系</h3>
          <button class="icon-btn" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>人员 A</label>
            <select v-model="sourceId" class="glass-select">
              <option value="" disabled>选择人员</option>
              <option v-for="person in sortedPeople" :key="person.id" :value="person.id">
                {{ person.name }} (@{{ person.screenName }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>人员 B</label>
            <select v-model="targetId" class="glass-select">
              <option value="" disabled>选择人员</option>
              <option
                v-for="person in sortedPeople"
                :key="person.id"
                :value="person.id"
                :disabled="person.id === sourceId"
              >
                {{ person.name }} (@{{ person.screenName }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>关系类型</label>
            <select v-model="direction" class="glass-select">
              <option value="bidirectional">双向关系 (互相认识)</option>
              <option value="unidirectional">单向关系 (A 认识 B)</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <GlassButton @click="emit('close')">取消</GlassButton>
          <GlassButton primary :disabled="!isValid" @click="handleSave">保存</GlassButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.glass-modal {
  width: 400px;
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.glass-select {
  width: 100%;
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}
:root.dark .glass-select {
  background: rgba(0, 0, 0, 0.2);
}

.glass-select:focus {
  border-color: var(--accent-1);
}

.glass-select option {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.modal-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
