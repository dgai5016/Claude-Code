<template>
  <div class="decision-tree">
    <h4 v-if="title">{{ title }}</h4>
    <div class="tree-flow">
      <div
        v-for="(node, i) in flattened"
        :key="i"
        class="tree-node"
        :class="{ active: activePath.includes(i), current: i === current }"
        @click="navigate(i)"
      >
        <span class="node-icon">{{ node.type === 'decision' ? '◇' : node.type === 'result' ? '●' : '○' }}</span>
        <span class="node-text">{{ node.text }}</span>
      </div>
    </div>
    <div class="tree-controls">
      <button @click="reset">重置</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  nodes: { type: Array, required: true }
})

const current = ref(0)
const activePath = ref([0])

const flattened = computed(() => {
  const result = []
  const flatten = (arr, depth = 0) => {
    for (const node of arr) {
      result.push({ ...node, depth })
      if (node.children) flatten(node.children, depth + 1)
    }
  }
  flatten(props.nodes)
  return result
})

function navigate(index) {
  current.value = index
  activePath.value = [index]
}

function reset() {
  current.value = 0
  activePath.value = [0]
}
</script>

<style scoped>
.decision-tree {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}
.decision-tree h4 { margin: 0 0 1rem; font-size: 1em; }
.tree-flow { display: flex; flex-direction: column; gap: 4px; }
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.15s;
}
.tree-node:hover { background: var(--vp-c-default-soft); }
.tree-node.active { background: var(--vp-c-brand-soft); }
.tree-node.current { background: var(--vp-c-brand-soft); border-left: 3px solid var(--vp-c-brand-1); }
.node-icon { font-size: 1em; width: 20px; text-align: center; }
.tree-controls { margin-top: 1rem; }
.tree-controls button {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 0.85em;
}
</style>
