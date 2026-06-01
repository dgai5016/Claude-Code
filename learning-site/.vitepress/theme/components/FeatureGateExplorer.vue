<template>
  <div class="feature-gate-explorer">
    <h4>三层门控探索器</h4>
    <div class="gate-layers">
      <div
        v-for="layer in layers"
        :key="layer.name"
        class="gate-layer"
        :class="{ active: activeLayer === layer.name }"
        @click="activeLayer = layer.name"
      >
        <div class="layer-dot" :style="{ background: layer.color }"></div>
        <div class="layer-info">
          <div class="layer-name">{{ layer.label }}</div>
          <div class="layer-count">{{ layer.gates.length }} 个开关</div>
        </div>
      </div>
    </div>
    <div class="gate-list" v-if="activeGates.length">
      <div
        v-for="gate in activeGates"
        :key="gate.name"
        class="gate-item"
        :class="{ selected: selectedGate === gate.name }"
        @click="selectedGate = gate.name"
      >
        <code>{{ gate.name }}</code>
        <span class="gate-desc">{{ gate.desc }}</span>
      </div>
    </div>
    <div class="gate-detail" v-if="selectedGateInfo">
      <h5>{{ selectedGateInfo.name }}</h5>
      <p>{{ selectedGateInfo.desc }}</p>
      <div v-if="selectedGateInfo.code" class="gate-code">
        <pre><code>{{ selectedGateInfo.code }}</code></pre>
      </div>
      <div v-if="selectedGateInfo.external !== undefined" class="gate-availability">
        外部可用：<strong>{{ selectedGateInfo.external ? '是' : '否' }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  layers: {
    type: Array,
    default: () => [
      {
        name: 'compile',
        label: '编译时 feature()',
        color: '#6c5ce7',
        gates: [
          { name: 'BUDDY', desc: '宠物系统', code: "feature('BUDDY')", external: false },
          { name: 'KAIROS', desc: '持久助手', code: "feature('KAIROS')", external: false },
          { name: 'BRIDGE_MODE', desc: '远程控制', code: "feature('BRIDGE_MODE')", external: false },
          { name: 'COORDINATOR_MODE', desc: '多Agent编排', code: "feature('COORDINATOR_MODE')", external: false },
          { name: 'ULTRAPLAN', desc: '云端规划', code: "feature('ULTRAPLAN')", external: false },
          { name: 'FORK_SUBAGENT', desc: 'Fork子代理', code: "feature('FORK_SUBAGENT')", external: true },
          { name: 'BG_SESSIONS', desc: '后台会话', code: "feature('BG_SESSIONS')", external: true },
        ]
      },
      {
        name: 'runtime',
        label: '运行时 USER_TYPE',
        color: '#e17055',
        gates: [
          { name: 'TungstenTool', desc: 'tmux终端面板工具', code: "process.env.USER_TYPE === 'ant'", external: false },
          { name: 'REPLTool', desc: '内部REPL工具', code: "process.env.USER_TYPE === 'ant'", external: false },
          { name: 'ConfigTool', desc: '运行时配置工具', code: "process.env.USER_TYPE === 'ant'", external: false },
        ]
      },
      {
        name: 'remote',
        label: '远程 GrowthBook',
        color: '#00b894',
        gates: [
          { name: 'tengu_amber_flint', desc: 'Swarm团队开关', code: "getFeatureValue_CACHED_MAY_BE_STALE('tengu_amber_flint')" },
          { name: 'tengu_kairos', desc: 'KAIROS开关', code: "getFeatureValue_CACHED_MAY_BE_STALE('tengu_kairos')" },
          { name: 'tengu_auto_mode_config', desc: 'Auto模式配置', code: "getFeatureValue_CACHED_MAY_BE_STALE('tengu_auto_mode_config')" },
          { name: 'tengu_cobalt_raccoon', desc: '主动压缩阈值', code: "getFeatureValue_CACHED_MAY_BE_STALE('tengu_cobalt_raccoon')" },
        ]
      }
    ]
  }
})

const activeLayer = ref('compile')
const selectedGate = ref('')

const activeGates = computed(() => {
  const layer = props.layers.find(l => l.name === activeLayer.value)
  return layer ? layer.gates : []
})

const selectedGateInfo = computed(() => {
  return activeGates.value.find(g => g.name === selectedGate.value)
})
</script>

<style scoped>
.feature-gate-explorer {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}
.feature-gate-explorer h4 {
  margin: 0 0 1rem;
  font-size: 1em;
  color: var(--vp-c-text-1);
}
.gate-layers {
  display: flex;
  gap: 12px;
  margin-bottom: 1rem;
}
.gate-layer {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 2px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.gate-layer.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.layer-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.layer-name { font-size: 0.85em; font-weight: 600; }
.layer-count { font-size: 0.75em; color: var(--vp-c-text-3); }
.gate-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.gate-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.85em;
}
.gate-item:last-child { border-bottom: none; }
.gate-item.selected { background: var(--vp-c-brand-soft); }
.gate-item code {
  font-size: 0.9em;
  color: var(--vp-c-brand-1);
}
.gate-desc { color: var(--vp-c-text-2); }
.gate-detail {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--vp-c-default-soft);
  border-radius: 6px;
}
.gate-detail h5 {
  margin: 0 0 0.5rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
}
.gate-code pre {
  margin: 0.5rem 0 0;
  padding: 0.5rem;
  background: var(--vp-code-block-bg);
  border-radius: 4px;
  font-size: 0.85em;
}
.gate-availability { margin-top: 0.5rem; font-size: 0.85em; }
</style>
