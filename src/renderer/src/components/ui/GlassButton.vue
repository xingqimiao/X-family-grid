<script setup lang="ts">
import { ref } from 'vue'
import { Loader2 } from 'lucide-vue-next'

defineProps<{
  primary?: boolean
  loading?: boolean
  disabled?: boolean
  icon?: unknown
  tooltip?: string
}>()

defineEmits<{
  click: [e: MouseEvent]
}>()

const showTooltip = ref(false)
const tooltipStyle = ref({})

function onMouseEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  tooltipStyle.value = {
    top: `${rect.bottom + 8}px`,
    left: `${rect.left + rect.width / 2}px`,
    transform: 'translateX(-50%)'
  }
  showTooltip.value = true
}

function onMouseLeave() {
  showTooltip.value = false
}
</script>

<template>
  <button
    class="glass-button"
    :class="{
      'glass-button-primary': primary,
      'opacity-60 pointer-events-none': disabled || loading
    }"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <Loader2 v-if="loading" :size="16" class="spin" />
    <component :is="icon" v-else-if="icon" :size="16" />
    <slot />
  </button>

  <Teleport to="body">
    <Transition name="tooltip-fade">
      <span
        v-if="tooltip && showTooltip"
        class="glass-tooltip teleported-tooltip"
        :style="tooltipStyle"
      >
        {{ tooltip }}
      </span>
    </Transition>
  </Teleport>
</template>

<style>
/* Global styles for the teleported tooltip so it works outside the scoped component */
.teleported-tooltip {
  position: fixed;
  padding: 6px 12px;
  background: rgba(26, 35, 50, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e8eaf0;
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1.4;
  white-space: nowrap;
  border-radius: 8px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.2),
    0 0 8px rgba(79, 195, 247, 0.08);
  pointer-events: none;
  z-index: 99999;
}

.teleported-tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px) !important;
}
</style>
