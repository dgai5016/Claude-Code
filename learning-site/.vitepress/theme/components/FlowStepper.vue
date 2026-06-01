<template>
  <div class="flow-stepper">
    <div class="flow-diagram">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="step"
        :class="{
          active: index === current,
          done: index < current,
          pending: index > current
        }"
        @click="current = index"
      >
        <div class="step-marker">{{ index + 1 }}</div>
        <div class="step-label">{{ step.label }}</div>
        <div v-if="index < steps.length - 1" class="step-arrow">→</div>
      </div>
    </div>
    <div class="step-detail" v-if="steps[current]">
      <h4>{{ steps[current].label }}</h4>
      <p v-html="steps[current].desc"></p>
      <div v-if="steps[current].code" class="step-code">
        <pre><code>{{ steps[current].code }}</code></pre>
      </div>
    </div>
    <div class="step-controls">
      <button :disabled="current === 0" @click="current--">上一步</button>
      <span>{{ current + 1 }} / {{ steps.length }}</span>
      <button :disabled="current === steps.length - 1" @click="current++">下一步</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  steps: {
    type: Array,
    required: true,
    validator: (v) => v.every(s => s.label && s.desc)
  }
})

const current = ref(0)
</script>

<style scoped>
.flow-stepper {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}
.flow-diagram {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 1.5rem;
}
.step {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}
.step-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-weight: 600;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  transition: all 0.2s;
}
.step.active .step-marker {
  background: var(--vp-c-brand-1);
  color: #fff;
}
.step.done .step-marker {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.step-label {
  margin-left: 6px;
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}
.step.active .step-label {
  color: var(--vp-c-text-1);
  font-weight: 600;
}
.step-arrow {
  margin: 0 8px;
  color: var(--vp-c-text-3);
  font-size: 0.9em;
}
.step-detail {
  min-height: 100px;
  padding: 1rem;
  background: var(--vp-c-default-soft);
  border-radius: 6px;
  margin-bottom: 1rem;
}
.step-detail h4 {
  margin: 0 0 0.5rem;
  color: var(--vp-c-brand-1);
}
.step-code {
  margin-top: 0.5rem;
}
.step-code pre {
  margin: 0;
  padding: 0.75rem;
  background: var(--vp-code-block-bg);
  border-radius: 4px;
  font-size: 0.85em;
  overflow-x: auto;
}
.step-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.step-controls button {
  padding: 4px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 0.85em;
}
.step-controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.step-controls button:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
}
</style>
