<script setup lang="ts">
defineProps<{
  remaining: number
  totalEmpty: number
}>()
</script>

<template>
  <div class="ghost-cell">
    <div class="ghost-inner floating">
      <span class="ghost-icon">✨</span>
      <span v-if="remaining === totalEmpty" class="ghost-text">
        再添加 {{ totalEmpty }} 个小伙伴可拼满
      </span>
    </div>
  </div>
</template>

<style scoped>
.ghost-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-glass);
  border: 2px dashed var(--border-subtle);
  transition: all 0.3s ease;
}
.ghost-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
  padding: 0.5rem;
}
.ghost-icon { font-size: 1.25rem; opacity: 0.5; }
.ghost-text {
  font-size: 0.625rem;
  color: var(--text-muted);
  line-height: 1.3;
}
</style>
