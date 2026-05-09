<script setup lang="ts">
import { useAppStore } from '../../stores/app-store'
import { useAuth } from '../../composables/useAuth'
import ThemeToggle from '../ui/ThemeToggle.vue'
import LoginButton from '../fetch/LoginButton.vue'
import { Sparkles } from 'lucide-vue-next'

const store = useAppStore()
const { login } = useAuth()
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <Sparkles :size="22" class="logo-icon" />
        <h1 class="logo-text">
          <span class="text-gradient">X-Family</span>
          <span class="logo-sub">Grid</span>
        </h1>
      </div>
    </div>

    <div class="header-center">
      <div class="tab-group">
        <button
          class="tab-btn"
          :class="{ active: store.activeView === 'grid' }"
          @click="store.activeView = 'grid'"
        >
          拼图网格
        </button>
        <button
          class="tab-btn"
          :class="{ active: store.activeView === 'graph' }"
          @click="store.activeView = 'graph'"
        >
          关系图谱
        </button>
      </div>
    </div>

    <div class="header-right">
      <ThemeToggle />

      <template v-if="store.isAuthenticated && store.currentUser">
        <div class="user-badge">
          <img
            :src="store.currentUser.avatarUrl"
            :alt="store.currentUser.name"
            class="user-avatar"
          />
          <span class="user-name">{{ store.currentUser.name }}</span>
        </div>
      </template>
      <template v-else>
        <LoginButton @login="login" />
      </template>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: var(--bg-glass);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border-bottom: 1px solid var(--border-glass);
  position: relative;
  z-index: 50;
  -webkit-app-region: drag;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  -webkit-app-region: no-drag;
}

.header-center {
  -webkit-app-region: no-drag;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  color: var(--accent-1);
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.logo-sub {
  color: var(--text-secondary);
  font-weight: 400;
  margin-left: 0.25rem;
}

.tab-group {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-glass);
  border-radius: var(--radius-lg);
  padding: 0.25rem;
  border: 1px solid var(--border-subtle);
}

.tab-btn {
  padding: 0.375rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  color: white;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.3);
}

.tab-btn:hover:not(.active) {
  color: var(--text-primary);
  background: var(--border-subtle);
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem 0.25rem 0.25rem;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  transition: all 0.3s ease;
}

.user-badge:hover {
  background: var(--bg-glass-hover);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid var(--accent-1);
}

.user-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
