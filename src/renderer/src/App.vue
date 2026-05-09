<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAppStore } from './stores/app-store'
import { useAuth } from './composables/useAuth'
import { useTheme } from './composables/useTheme'
import { useDebounceSave } from './composables/useDebounceSave'
import { useRelations } from './composables/useRelations'
import AppHeader from './components/layout/AppHeader.vue'
import FetchPanel from './components/fetch/FetchPanel.vue'
import AvatarGrid from './components/grid/AvatarGrid.vue'
import RelationGraph from './components/graph/RelationGraph.vue'
import SkeletonLoader from './components/ui/SkeletonLoader.vue'
import GlassCard from './components/ui/GlassCard.vue'

const store = useAppStore()
const { checkAuthOnStartup } = useAuth()
useTheme()
const { startWatching } = useDebounceSave()
const { runAnalysis } = useRelations()

const isReady = ref(false)

// Auto-run relation analysis when people change
watch(
  () => store.people.length,
  (newLen, oldLen) => {
    if (newLen > 0 && newLen !== oldLen) {
      runAnalysis()
    }
  }
)

onMounted(async () => {
  try {
    // Load saved config
    const config = await window.api.loadConfig()
    if (config) {
      store.restoreFromConfig(config)
    } else {
      store.isLoading = false
    }

    // Check auth
    await checkAuthOnStartup()

    // Start debounced auto-save
    startWatching()

    // Run relation analysis if we have people
    if (store.people.length > 0) {
      runAnalysis()
    }
  } catch (error) {
    console.error('[App] Initialization failed:', error)
    store.isLoading = false
  }

  isReady.value = true
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <main class="app-main">
      <!-- Loading skeleton -->
      <div v-if="!isReady" class="skeleton-screen">
        <GlassCard :hoverable="false" padding="2rem">
          <SkeletonLoader type="rect" height="40px" width="200px" />
          <div style="height: 1rem" />
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem">
            <SkeletonLoader v-for="i in 9" :key="i" type="rect" height="120px" />
          </div>
        </GlassCard>
      </div>

      <!-- Main content -->
      <template v-else>
        <!-- Sidebar -->
        <aside class="app-sidebar">
          <GlassCard :hoverable="false" padding="1rem">
            <FetchPanel />
          </GlassCard>

          <!-- People list -->
          <GlassCard v-if="store.people.length > 0" :hoverable="false" padding="1rem" class="people-card">
            <h3 class="sidebar-title">大家庭成员</h3>
            <div class="people-list">
              <div v-for="person in store.people" :key="person.id" class="person-item">
                <img
                  v-if="person.avatarUrl"
                  :src="person.avatarUrl"
                  :alt="person.name"
                  class="person-mini-avatar"
                />
                <div class="person-info">
                  <span class="person-name">{{ person.name }}</span>
                  <span class="person-handle font-mono">@{{ person.screenName }}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </aside>

        <!-- Content area -->
        <section class="app-content">
          <Transition name="page" mode="out-in">
            <AvatarGrid v-if="store.activeView === 'grid'" key="grid" />
            <RelationGraph v-else key="graph" />
          </Transition>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 1rem;
  gap: 1rem;
}

.skeleton-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.5s ease;
}

.app-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.25rem;
}

.sidebar-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.people-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.people-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.person-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  border-radius: var(--radius-md);
  transition: background 0.2s ease;
  cursor: default;
}

.person-item:hover {
  background: var(--border-subtle);
}

.person-mini-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  object-fit: cover;
  flex-shrink: 0;
}

.person-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.person-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-handle {
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.page-enter-active {
  animation: slideUp 0.3s ease;
}

.page-leave-active {
  animation: fadeOut 0.15s ease;
}
</style>
