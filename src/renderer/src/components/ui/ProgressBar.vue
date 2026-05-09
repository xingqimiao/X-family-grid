<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: number
  total: number
  label?: string
  emoji?: string
}>()

const percentage = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.current / props.total) * 100)
})
</script>

<template>
  <div class="progress-container">
    <div class="progress-info">
      <span class="progress-label">
        {{ emoji || '🐱' }} {{ label || '正在捕捉猫猫...' }}
        <span class="font-mono">{{ current }}/{{ total }}</span>
      </span>
      <span class="progress-percent font-mono">{{ percentage }}%</span>
    </div>
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-container {
  width: 100%;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
}

.progress-label {
  color: var(--text-secondary);
}

.progress-percent {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: var(--border-subtle);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
  border-radius: var(--radius-full);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}
</style>
