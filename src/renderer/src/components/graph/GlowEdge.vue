<script setup lang="ts">
import { computed } from 'vue'
import { EdgeLabelRenderer } from '@vue-flow/core'

/**
 * Custom glow edge: center-to-center connection with luminous effects.
 *
 * NO SVG filters — avoids the rectangular bounding-box artifact.
 * Glow is achieved via multiple layered strokes with decreasing opacity.
 * Particles use radial-gradient circles, 3+ per edge, staggered timing.
 */
const props = defineProps<{
  id: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  label?: string
  data?: { direction?: string }
  markerEnd?: string
  sourceNode?: { position: { x: number; y: number }; dimensions?: { width: number; height: number } }
  targetNode?: { position: { x: number; y: number }; dimensions?: { width: number; height: number } }
}>()

// ── Calculate true node centers ──
const x1 = computed(() => {
  const n = props.sourceNode
  if (n?.dimensions?.width) return n.position.x + n.dimensions.width / 2
  return props.sourceX
})
const y1 = computed(() => {
  const n = props.sourceNode
  if (n?.dimensions?.height) return n.position.y + n.dimensions.height / 2
  return props.sourceY
})
const x2 = computed(() => {
  const n = props.targetNode
  if (n?.dimensions?.width) return n.position.x + n.dimensions.width / 2
  return props.targetX
})
const y2 = computed(() => {
  const n = props.targetNode
  if (n?.dimensions?.height) return n.position.y + n.dimensions.height / 2
  return props.targetY
})

const pathD = computed(() => `M ${x1.value} ${y1.value} L ${x2.value} ${y2.value}`)
const midX = computed(() => (x1.value + x2.value) / 2)
const midY = computed(() => (y1.value + y2.value) / 2)
const isBi = computed(() => props.data?.direction === 'bidirectional')

// Particle count and staggered durations
const particles = computed(() => {
  if (!isBi.value) return [{ dur: '3s', begin: '0s', r: 2 }]
  return [
    { dur: '2.2s', begin: '0s', r: 2.5 },
    { dur: '2.2s', begin: '0.7s', r: 2 },
    { dur: '2.2s', begin: '1.4s', r: 1.5 },
    { dur: '2.8s', begin: '0.3s', r: 2 },
  ]
})
</script>

<template>
  <defs>
    <!-- Animated gradient for bidirectional -->
    <linearGradient :id="`grad-${id}`" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff7eb3">
        <animate attributeName="stop-color"
          values="#ff7eb3;#b388ff;#7eb3ff;#ff7eb3" dur="4s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stop-color="#7eb3ff">
        <animate attributeName="stop-color"
          values="#7eb3ff;#ff7eb3;#b388ff;#7eb3ff" dur="4s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    <!-- Particle radial gradient (white center → transparent edge, no box) -->
    <radialGradient :id="`spark-${id}`">
      <stop offset="0%" stop-color="white" stop-opacity="1" />
      <stop offset="40%" stop-color="white" stop-opacity="0.6" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- ═══ Layer 1: Outermost soft glow (wide, low opacity) ═══ -->
  <path
    :d="pathD" fill="none"
    :stroke="isBi ? `url(#grad-${id})` : 'rgba(79, 195, 247, 0.08)'"
    :stroke-width="isBi ? 20 : 10"
    stroke-linecap="round"
    class="glow-layer-outer"
  />

  <!-- ═══ Layer 2: Middle glow ═══ -->
  <path
    :d="pathD" fill="none"
    :stroke="isBi ? `url(#grad-${id})` : 'rgba(79, 195, 247, 0.15)'"
    :stroke-width="isBi ? 10 : 5"
    stroke-linecap="round"
    class="glow-layer-mid"
  />

  <!-- ═══ Layer 3: Inner glow ═══ -->
  <path
    :d="pathD" fill="none"
    :stroke="isBi ? `url(#grad-${id})` : 'rgba(79, 195, 247, 0.3)'"
    :stroke-width="isBi ? 5 : 3"
    stroke-linecap="round"
    class="glow-layer-inner"
  />

  <!-- ═══ Layer 4: Core visible line ═══ -->
  <path
    :d="pathD" fill="none"
    :stroke="isBi ? `url(#grad-${id})` : 'rgba(79, 195, 247, 0.8)'"
    :stroke-width="isBi ? 2.5 : 1.2"
    :stroke-dasharray="isBi ? '12 4' : '6 4'"
    stroke-linecap="round"
    :marker-end="markerEnd"
    :class="isBi ? 'glow-core-bi' : 'glow-core-uni'"
  />

  <!-- ═══ Layer 5: Travelling spark particles ═══ -->
  <template v-for="(p, idx) in particles" :key="`particle-${id}-${idx}`">
    <!-- Glow halo around particle (larger, transparent circle) -->
    <circle
      :r="p.r * 4"
      :fill="`url(#spark-${id})`"
      :opacity="isBi ? 0.5 : 0.3"
    >
      <animateMotion :path="pathD" :dur="p.dur" :begin="p.begin" repeatCount="indefinite" />
    </circle>
    <!-- Bright core dot -->
    <circle
      :r="p.r"
      fill="white"
      :opacity="isBi ? 0.95 : 0.7"
    >
      <animateMotion :path="pathD" :dur="p.dur" :begin="p.begin" repeatCount="indefinite" />
    </circle>
  </template>

  <!-- ═══ Edge Label ═══ -->
  <EdgeLabelRenderer v-if="label">
    <div
      class="glow-edge-label"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
        pointerEvents: 'none',
      }"
    >
      {{ label }}
    </div>
  </EdgeLabelRenderer>
</template>

<style>
/* ── Glow layers: pulsing opacity ── */
.glow-layer-outer {
  animation: glow-breathe 3s ease-in-out infinite;
}
.glow-layer-mid {
  animation: glow-breathe 3s ease-in-out infinite 0.5s;
}
.glow-layer-inner {
  animation: glow-breathe 2.5s ease-in-out infinite 0.2s;
}

@keyframes glow-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* ── Core line flow animation ── */
.glow-core-bi {
  animation: glow-dash-flow 1s linear infinite;
}
.glow-core-uni {
  animation: glow-dash-flow 1.5s linear infinite;
}

@keyframes glow-dash-flow {
  to { stroke-dashoffset: -16; }
}

/* ── Edge label glass pill ── */
.glow-edge-label {
  background: var(--bg-glass, rgba(26, 35, 50, 0.85));
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-glass, rgba(255,255,255,0.1));
  color: var(--text-primary, #e8eaf0);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 20px;
  white-space: nowrap;
  box-shadow:
    0 0 8px rgba(255, 126, 179, 0.2),
    0 0 16px rgba(126, 179, 255, 0.15);
}
</style>
