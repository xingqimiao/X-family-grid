<script setup lang="ts">
defineProps<{
  type?: 'rect' | 'circle' | 'text'
  width?: string
  height?: string
  count?: number
}>()
</script>

<template>
  <div class="skeleton-wrapper">
    <div
      v-for="i in count || 1"
      :key="i"
      class="skeleton"
      :class="{ 'skeleton-circle': type === 'circle' }"
      :style="{
        width: width || (type === 'circle' ? '48px' : '100%'),
        height: height || (type === 'circle' ? '48px' : type === 'text' ? '14px' : '100px'),
        marginBottom: (count || 1) > 1 ? '0.5rem' : '0'
      }"
    />
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
}
</style>
