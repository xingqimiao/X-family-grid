<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '../../composables/useTheme'

const { resolvedTheme, toggleTheme } = useTheme()
</script>

<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    :title="resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
  >
    <Transition name="theme-icon" mode="out-in">
      <Moon v-if="resolvedTheme === 'light'" :size="18" class="theme-icon" key="moon" />
      <Sun v-else :size="18" class="theme-icon" key="sun" />
    </Transition>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--bg-glass);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-glass);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
  transform: rotate(15deg);
}

.theme-icon {
  transition: all 0.3s ease;
}

.theme-icon-enter-active {
  animation: scaleIn 0.3s ease;
}

.theme-icon-leave-active {
  animation: fadeOut 0.15s ease;
}
</style>
