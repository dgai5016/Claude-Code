<template>
  <div class="sprite-animator">
    <div class="sprite-display">
      <pre class="sprite-frame">{{ currentFrame }}</pre>
    </div>
    <div class="sprite-controls">
      <button @click="playing = !playing">{{ playing ? '暂停' : '播放' }}</button>
      <button @click="prev">上一帧</button>
      <span class="frame-info">{{ frameIndex + 1 }} / {{ frames.length }}</span>
      <button @click="next">下一帧</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  frames: { type: Array, required: true },
  interval: { type: Number, default: 500 }
})

const frameIndex = ref(0)
const playing = ref(false)
let timer = null

const currentFrame = computed(() => props.frames[frameIndex.value] || '')

watch(playing, (val) => {
  if (timer) clearInterval(timer)
  if (val) {
    timer = setInterval(() => {
      frameIndex.value = (frameIndex.value + 1) % props.frames.length
    }, props.interval)
  }
})

onUnmounted(() => { if (timer) clearInterval(timer) })

function next() { frameIndex.value = (frameIndex.value + 1) % props.frames.length }
function prev() { frameIndex.value = (frameIndex.value - 1 + props.frames.length) % props.frames.length }
</script>

<style scoped>
.sprite-animator {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0;
  text-align: center;
}
.sprite-display {
  background: var(--vp-code-block-bg);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sprite-frame {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
  line-height: 1.2;
  margin: 0;
  text-align: left;
  color: var(--vp-c-text-1);
}
.sprite-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}
.sprite-controls button {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 0.85em;
}
.frame-info {
  font-size: 0.85em;
  color: var(--vp-c-text-3);
  min-width: 60px;
  text-align: center;
}
</style>
