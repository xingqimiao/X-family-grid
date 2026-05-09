<script setup lang="ts">
import { Zap } from 'lucide-vue-next'

defineEmits<{
  login: []
}>()
</script>

<template>
  <button class="login-btn shimmer-btn" @click="$emit('login')">
    <Zap :size="16" />
    <span>安全登录</span>
  </button>
</template>

<style scoped>
.login-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.125rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 157, 0.35);
}

.login-btn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.45);
}

.login-btn:active {
  transform: translateY(0) scale(0.98);
}

html.dark .login-btn {
  box-shadow:
    0 0 15px rgba(255, 107, 157, 0.4),
    0 0 30px rgba(79, 195, 247, 0.2);
}
</style>
