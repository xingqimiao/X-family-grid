<script setup lang="ts">
defineProps<{
  blur?: number
  padding?: string
  hoverable?: boolean
}>()
</script>

<template>
  <div
    class="glass-card-component"
    :class="{ 'glass-card': hoverable !== false, 'glass-card-static': hoverable === false }"
    :style="{
      backdropFilter: blur ? `blur(${blur}px) saturate(1.8)` : undefined,
      padding: padding || '1.5rem'
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.glass-card-component {
  position: relative;
  overflow: hidden;
}
</style>
