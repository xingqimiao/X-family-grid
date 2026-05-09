<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFetch } from '../../composables/useFetch'
import { useAppStore } from '../../stores/app-store'
import GlassButton from '../ui/GlassButton.vue'
import ProgressBar from '../ui/ProgressBar.vue'
import { Search, UserPlus, X } from 'lucide-vue-next'

const store = useAppStore()
const { parseIds, startFetch } = useFetch()

const rawInput = ref('')
const showInput = ref(false)

const parsedIds = computed(() => parseIds(rawInput.value))

function handleFetch(): void {
  if (parsedIds.value.length === 0) return
  startFetch(rawInput.value)
  rawInput.value = ''
  showInput.value = false
}

function removeChip(id: string): void {
  const lines = rawInput.value.split(/[\n,;]+/).filter((s) => {
    const clean = s.trim().replace(/^@/, '').toLowerCase()
    return clean !== id.toLowerCase()
  })
  rawInput.value = lines.join('\n')
}
</script>

<template>
  <div class="fetch-panel">
    <!-- Toggle Button -->
    <GlassButton
      v-if="!showInput && !store.isFetching"
      :icon="UserPlus"
      tooltip="输入 Twitter ID 批量抓取好友头像和 Bio"
      @click="showInput = true"
    >
      添加好友
    </GlassButton>

    <!-- Input Panel -->
    <Transition name="slide">
      <div v-if="showInput && !store.isFetching" class="input-panel glass-card-static">
        <div class="input-header">
          <span class="input-title">
            <Search :size="14" />
            输入 Twitter ID
          </span>
          <button class="close-btn" @click="showInput = false">
            <X :size="16" />
          </button>
        </div>

        <textarea
          v-model="rawInput"
          class="glass-input id-textarea"
          placeholder="每行一个 ID，例如：&#10;@elonmusk&#10;TwitterDev&#10;jack"
          rows="4"
        />

        <!-- Parsed chips -->
        <div v-if="parsedIds.length > 0" class="chip-list">
          <span v-for="id in parsedIds" :key="id" class="chip">
            @{{ id }}
            <button class="chip-remove" @click="removeChip(id)">
              <X :size="12" />
            </button>
          </span>
        </div>

        <div class="input-footer">
          <span class="id-count font-mono">{{ parsedIds.length }} 个 ID</span>
          <GlassButton
            primary
            :disabled="parsedIds.length === 0 || !store.isAuthenticated"
            tooltip="通过自动抓取开始获取所有已输入的用户信息"
            @click="handleFetch"
          >
            开始抓取
          </GlassButton>
        </div>

        <p v-if="!store.isAuthenticated" class="auth-hint">⚠️ 请先登录 Twitter 账号</p>
      </div>
    </Transition>

    <!-- Progress -->
    <Transition name="slide">
      <div v-if="store.isFetching" class="progress-panel glass-card-static">
        <ProgressBar
          :current="store.fetchProgress.current"
          :total="store.fetchProgress.total"
          :label="`正在捕捉 @${store.fetchProgress.screenName}...`"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fetch-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-panel {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  animation: slideDown 0.3s ease;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--border-subtle);
  color: var(--text-primary);
}

.id-textarea {
  resize: vertical;
  min-height: 80px;
  max-height: 200px;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  max-height: 150px;
  overflow-y: auto;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, rgba(255, 182, 193, 0.15), rgba(135, 206, 235, 0.15));
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-full);
  transition: all 0.2s;
}

.chip-remove:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.id-count {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.auth-hint {
  font-size: 0.75rem;
  color: #f59e0b;
  text-align: center;
}

.progress-panel {
  padding: 1rem;
  animation: slideUp 0.3s ease;
}

.slide-enter-active {
  animation: slideDown 0.3s ease;
}

.slide-leave-active {
  animation: fadeOut 0.2s ease;
}
</style>
