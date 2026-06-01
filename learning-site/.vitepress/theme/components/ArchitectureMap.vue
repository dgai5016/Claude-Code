<template>
  <div class="architecture-map">
    <div class="map-controls">
      <button
        v-for="group in nodeGroups"
        :key="group.id"
        class="group-toggle"
        :class="{ active: visibleGroups.has(group.id) }"
        @click="toggleGroup(group.id)"
      >
        <span class="group-dot" :style="{ background: group.color }"></span>
        {{ group.label }}
      </button>
    </div>

    <div class="map-canvas">
      <svg :viewBox="`0 0 ${canvasW} ${canvasH}`" class="map-svg">
        <!-- Edges -->
        <g class="edges">
          <line
            v-for="edge in visibleEdges"
            :key="edge.from + edge.to"
            :x1="nodeMap[edge.from]?.x"
            :y1="nodeMap[edge.from]?.y"
            :x2="nodeMap[edge.to]?.x"
            :y2="nodeMap[edge.to]?.y"
            class="edge"
            :class="edge.type"
          />
        </g>

        <!-- Nodes -->
        <g class="nodes">
          <g
            v-for="node in visibleNodes"
            :key="node.id"
            class="node"
            :class="{ selected: selectedNode === node.id, [node.group]: true }"
            :transform="`translate(${node.x}, ${node.y})`"
            @click="selectNode(node.id)"
          >
            <rect
              :x="-nodeW / 2"
              :y="-nodeH / 2"
              :width="nodeW"
              :height="nodeH"
              rx="6"
              class="node-rect"
            />
            <text
              class="node-label"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ node.label }}
            </text>
            <text
              class="node-lines"
              text-anchor="middle"
              :y="nodeH / 2 - 4"
            >
              {{ node.lines }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <div class="node-detail" v-if="selectedNodeInfo">
      <div class="detail-header">
        <span class="detail-dot" :style="{ background: groupColor(selectedNodeInfo.group) }"></span>
        <strong>{{ selectedNodeInfo.label }}</strong>
        <code>{{ selectedNodeInfo.path }}</code>
      </div>
      <p class="detail-desc">{{ selectedNodeInfo.desc }}</p>
      <div class="detail-meta">
        <span v-if="selectedNodeInfo.lines">代码行数: {{ selectedNodeInfo.lines }}</span>
        <span v-if="selectedNodeInfo.files">文件数: {{ selectedNodeInfo.files }}</span>
      </div>
      <div class="detail-deps" v-if="selectedNodeDeps.length">
        <span class="deps-label">依赖:</span>
        <span v-for="dep in selectedNodeDeps" :key="dep" class="dep-tag" @click="selectNode(dep)">
          {{ nodeMap[dep]?.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const nodeW = 140
const nodeH = 50

const nodeGroups = [
  { id: 'types', label: '类型/基础', color: '#6c5ce7' },
  { id: 'auth', label: '认证/通信', color: '#0984e3' },
  { id: 'permissions', label: '权限/安全', color: '#e17055' },
  { id: 'prompt', label: '提示词/记忆', color: '#00b894' },
  { id: 'tools', label: '工具', color: '#fdcb6e' },
  { id: 'query', label: '查询循环', color: '#e84393' },
  { id: 'extensions', label: '扩展', color: '#00cec9' },
  { id: 'ui', label: '接口/UI', color: '#a29bfe' },
]

const nodes = [
  // Types / Foundation
  { id: 'types', label: '类型系统', path: 'src/types/', lines: '5K', files: 15, group: 'types', x: 100, y: 80, desc: '全代码库的类型定义：消息、权限、工具、ID 生成' },
  { id: 'bootstrap', label: '全局引导状态', path: 'src/bootstrap/', lines: '1K', files: 3, group: 'types', x: 280, y: 80, desc: 'sessionId、projectRoot、featureFlags 等全局单例' },
  { id: 'tool-type', label: 'Tool 类型', path: 'src/Tool.ts', lines: '792', files: 1, group: 'types', x: 460, y: 80, desc: 'Tool<Input,Output,Progress> 接口——全代码库最重要的类型' },

  // Auth / Communication
  { id: 'auth', label: '认证', path: 'src/utils/auth.ts', lines: '2K', files: 5, group: 'auth', x: 100, y: 200, desc: 'API Key、OAuth 2.0 + PKCE、多供应商认证' },
  { id: 'model', label: '模型路由', path: 'src/utils/model/', lines: '2K', files: 16, group: 'auth', x: 280, y: 200, desc: '模型选择、别名解析、多供应商检测（Bedrock/Vertex/Foundry）' },
  { id: 'api', label: 'API 客户端', path: 'src/services/api/', lines: '7.5K', files: 8, group: 'auth', x: 460, y: 200, desc: '流式查询引擎、重试逻辑、错误分类、529/过载处理' },
  { id: 'feature', label: '特性标志', path: 'src/services/analytics/', lines: '3K', files: 12, group: 'auth', x: 640, y: 200, desc: 'GrowthBook 集成、59 个远程开关、遥测双汇' },

  // Permissions / Security
  { id: 'perm-primitive', label: '权限原语', path: 'src/utils/permissions/', lines: '3K', files: 10, group: 'permissions', x: 100, y: 320, desc: 'PermissionResult、7 种模式、规则匹配' },
  { id: 'bash-intel', label: 'Bash 智能层', path: 'src/utils/bash/', lines: '2K', files: 23, group: 'permissions', x: 280, y: 320, desc: 'AST 解析、命令分类、Shell 引用与转义' },
  { id: 'sandbox', label: '沙盒', path: 'src/utils/sandbox/', lines: '2K', files: 8, group: 'permissions', x: 460, y: 320, desc: 'bwrap (Linux) / sandbox-exec (macOS)、网络/文件隔离' },
  { id: 'perm-engine', label: '权限引擎', path: 'src/utils/permissions/', lines: '5K', files: 6, group: 'permissions', x: 640, y: 320, desc: 'hasPermissionsToUseTool()、文件系统权限、路径穿越防护' },
  { id: 'yolo', label: 'Auto 分类器', path: 'src/utils/permissions/yoloClassifier.ts', lines: '1.5K', files: 1, group: 'permissions', x: 820, y: 320, desc: '两阶段 LLM 分类：快速 XML → 深度 thinking' },

  // Prompt / Memory
  { id: 'static-prompt', label: '静态提示词', path: 'src/constants/prompts.ts', lines: '960', files: 1, group: 'prompt', x: 100, y: 440, desc: '全局缓存段：身份+安全/系统行为/工具使用' },
  { id: 'dynamic-prompt', label: '动态提示词', path: 'src/services/systemPromptSections.ts', lines: '2K', files: 5, group: 'prompt', x: 280, y: 440, desc: 'Section 注册 API、缓存边界、运行时解析' },
  { id: 'memory', label: '记忆系统', path: 'src/memdir/', lines: '5K', files: 20, group: 'prompt', x: 460, y: 440, desc: 'MEMORY.md 加载、自动记忆提取、Dream 整合、团队同步' },

  // Tools
  { id: 'tool-registry', label: '工具注册表', path: 'src/tools.ts', lines: '389', files: 1, group: 'tools', x: 100, y: 560, desc: 'getAllBaseTools + getTools + assembleToolPool' },
  { id: 'tool-exec', label: '工具执行引擎', path: 'src/services/tools/', lines: '3K', files: 5, group: 'tools', x: 280, y: 560, desc: '权限→Hook→执行→Hook→结果、流式并发调度' },
  { id: 'hooks', label: 'Hook 系统', path: 'src/utils/hooks/', lines: '3.7K', files: 17, group: 'tools', x: 460, y: 560, desc: '26 种事件、4 种类型、异步注册、SSRF 防护' },
  { id: 'bash-tool', label: 'BashTool', path: 'src/tools/BashTool/', lines: '11K', files: 10, group: 'tools', x: 640, y: 560, desc: 'AST 解析+权限+沙箱+Shell 任务管理' },
  { id: 'agent-tool', label: 'AgentTool', path: 'src/tools/AgentTool/', lines: '4.5K', files: 17, group: 'tools', x: 820, y: 560, desc: '子查询循环、Fork 模式、内置子代理' },
  { id: 'mcp-tool', label: 'MCPTool', path: 'src/services/mcp/', lines: '12K', files: 15, group: 'tools', x: 1000, y: 560, desc: '运行时发现、适配器模式、OAuth 认证' },

  // Query Loop
  { id: 'query', label: 'query() 循环', path: 'src/query.ts', lines: '1729', files: 1, group: 'query', x: 550, y: 680, desc: '构建Prompt→API→流式接收→分发工具→结果→回环' },
  { id: 'query-engine', label: 'QueryEngine', path: 'src/QueryEngine.ts', lines: '1295', files: 1, group: 'query', x: 750, y: 680, desc: 'SDK 封装、会话状态、消息历史管理' },

  // Extensions
  { id: 'state', label: '状态管理', path: 'src/state/', lines: '2K', files: 8, group: 'extensions', x: 100, y: 800, desc: 'AppState 不可变记录、zustand-like store' },
  { id: 'agents', label: 'Agent 系统', path: 'src/tools/AgentTool/', lines: '4.5K', files: 17, group: 'extensions', x: 280, y: 800, desc: '内置Agent、用户Agent、Fork子代理' },
  { id: 'swarm', label: 'Swarm', path: 'src/utils/swarm/', lines: '7.5K', files: 22, group: 'extensions', x: 460, y: 800, desc: '多Agent团队：tmux/iTerm2/in-process' },
  { id: 'compact', label: '压缩', path: 'src/services/compact/', lines: '3K', files: 8, group: 'extensions', x: 640, y: 800, desc: '完整压缩(forked agent)+微压缩(原地截断)' },
  { id: 'plugins', label: '插件系统', path: 'src/utils/plugins/', lines: '20K', files: 44, group: 'extensions', x: 820, y: 800, desc: '市场管理、插件加载、内置插件注册表' },
  { id: 'skills', label: '技能系统', path: 'src/skills/', lines: '3.8K', files: 15, group: 'extensions', x: 1000, y: 800, desc: 'Skill 发现、frontmatter 解析、内建技能' },

  // UI / Interface
  { id: 'repl', label: 'REPL 主UI', path: 'src/REPL.tsx', lines: '5061', files: 1, group: 'ui', x: 100, y: 920, desc: '主 UI 编排器、连接所有子系统' },
  { id: 'cli', label: 'CLI 层', path: 'src/cli/', lines: '6.7K', files: 25, group: 'ui', x: 280, y: 920, desc: '传输层、结构化 I/O、输出渲染' },
  { id: 'remote', label: '远程/CCR', path: 'src/remote/', lines: '5K', files: 15, group: 'ui', x: 460, y: 920, desc: 'WebSocket 会话、远程管理、Teleport' },
  { id: 'lsp', label: 'LSP', path: 'src/services/lsp/', lines: '2.8K', files: 10, group: 'ui', x: 640, y: 920, desc: '多服务器管理、诊断聚合' },
  { id: 'main', label: '入口流程', path: 'src/main.tsx', lines: '4690', files: 1, group: 'ui', x: 820, y: 920, desc: '启动编排：遥测→认证→设置→LSP→MCP→策略' },
]

const edges = [
  // Foundation → others
  { from: 'types', to: 'bootstrap', type: 'depends' },
  { from: 'types', to: 'tool-type', type: 'depends' },
  { from: 'tool-type', to: 'tool-registry', type: 'depends' },

  // Auth chain
  { from: 'auth', to: 'model', type: 'depends' },
  { from: 'model', to: 'api', type: 'depends' },

  // Permission chain
  { from: 'perm-primitive', to: 'bash-intel', type: 'depends' },
  { from: 'bash-intel', to: 'perm-engine', type: 'depends' },
  { from: 'perm-engine', to: 'yolo', type: 'depends' },
  { from: 'perm-primitive', to: 'sandbox', type: 'depends' },

  // Prompt chain
  { from: 'static-prompt', to: 'dynamic-prompt', type: 'depends' },
  { from: 'dynamic-prompt', to: 'memory', type: 'depends' },

  // Tools chain
  { from: 'tool-registry', to: 'tool-exec', type: 'depends' },
  { from: 'tool-exec', to: 'hooks', type: 'extends' },
  { from: 'tool-exec', to: 'bash-tool', type: 'extends' },
  { from: 'tool-exec', to: 'agent-tool', type: 'extends' },
  { from: 'tool-exec', to: 'mcp-tool', type: 'extends' },

  // Convergence to query
  { from: 'api', to: 'query', type: 'converges' },
  { from: 'perm-engine', to: 'query', type: 'converges' },
  { from: 'dynamic-prompt', to: 'query', type: 'converges' },
  { from: 'tool-exec', to: 'query', type: 'converges' },
  { from: 'query', to: 'query-engine', type: 'depends' },

  // Extensions from query
  { from: 'query-engine', to: 'state', type: 'extends' },
  { from: 'query-engine', to: 'agents', type: 'extends' },
  { from: 'query-engine', to: 'swarm', type: 'extends' },
  { from: 'query-engine', to: 'compact', type: 'extends' },
  { from: 'query-engine', to: 'plugins', type: 'extends' },
  { from: 'query-engine', to: 'skills', type: 'extends' },

  // UI
  { from: 'state', to: 'repl', type: 'feeds' },
  { from: 'query-engine', to: 'cli', type: 'feeds' },
  { from: 'cli', to: 'remote', type: 'feeds' },
  { from: 'agents', to: 'lsp', type: 'feeds' },
  { from: 'feature', to: 'main', type: 'feeds' },
  { from: 'main', to: 'repl', type: 'feeds' },
]

const canvasW = 1100
const canvasH = 1000

const visibleGroups = ref(new Set(nodeGroups.map(g => g.id)))
const selectedNode = ref('')

const nodeMap = computed(() => {
  const map = {}
  nodes.forEach(n => { map[n.id] = n })
  return map
})

const visibleNodes = computed(() => {
  return nodes.filter(n => visibleGroups.value.has(n.group))
})

const visibleEdges = computed(() => {
  return edges.filter(e => {
    const fromNode = nodeMap.value[e.from]
    const toNode = nodeMap.value[e.to]
    return fromNode && toNode && visibleGroups.value.has(fromNode.group) && visibleGroups.value.has(toNode.group)
  })
})

const selectedNodeInfo = computed(() => {
  return nodeMap.value[selectedNode.value] || null
})

const selectedNodeDeps = computed(() => {
  if (!selectedNode.value) return []
  return edges
    .filter(e => e.from === selectedNode.value)
    .map(e => e.to)
})

function groupColor(groupId) {
  const g = nodeGroups.find(g => g.id === groupId)
  return g ? g.color : '#999'
}

function toggleGroup(groupId) {
  const next = new Set(visibleGroups.value)
  if (next.has(groupId)) {
    next.delete(groupId)
  } else {
    next.add(groupId)
  }
  visibleGroups.value = next
}

function selectNode(nodeId) {
  selectedNode.value = selectedNode.value === nodeId ? '' : nodeId
}
</script>

<style scoped>
.architecture-map {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  overflow: hidden;
}

.map-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 1rem;
}

.group-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  cursor: pointer;
  font-size: 0.8em;
  transition: all 0.2s;
}

.group-toggle.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.group-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.map-canvas {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-default-soft);
}

.map-svg {
  display: block;
  min-width: 100%;
  height: auto;
}

.edge {
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
  opacity: 0.5;
}

.edge.depends {
  stroke: var(--vp-c-text-3);
  stroke-dasharray: none;
}

.edge.converges {
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  stroke-dasharray: 6 3;
  opacity: 0.6;
}

.edge.extends,
.edge.feeds {
  stroke: var(--vp-c-text-3);
  stroke-dasharray: 3 3;
}

.node {
  cursor: pointer;
}

.node-rect {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
  transition: all 0.2s;
}

.node.selected .node-rect {
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  filter: drop-shadow(0 0 4px var(--vp-c-brand-1));
}

.node.types .node-rect { fill: rgba(108, 92, 231, 0.1); stroke: rgba(108, 92, 231, 0.4); }
.node.auth .node-rect { fill: rgba(9, 132, 227, 0.1); stroke: rgba(9, 132, 227, 0.4); }
.node.permissions .node-rect { fill: rgba(225, 112, 85, 0.1); stroke: rgba(225, 112, 85, 0.4); }
.node.prompt .node-rect { fill: rgba(0, 184, 148, 0.1); stroke: rgba(0, 184, 148, 0.4); }
.node.tools .node-rect { fill: rgba(253, 203, 110, 0.1); stroke: rgba(253, 203, 110, 0.4); }
.node.query .node-rect { fill: rgba(232, 67, 147, 0.15); stroke: rgba(232, 67, 147, 0.5); }
.node.extensions .node-rect { fill: rgba(0, 206, 201, 0.1); stroke: rgba(0, 206, 201, 0.4); }
.node.ui .node-rect { fill: rgba(162, 155, 254, 0.1); stroke: rgba(162, 155, 254, 0.4); }

.node-label {
  font-size: 11px;
  fill: var(--vp-c-text-1);
  font-weight: 600;
  pointer-events: none;
}

.node-lines {
  font-size: 8px;
  fill: var(--vp-c-text-3);
  pointer-events: none;
}

.node-detail {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--vp-c-default-soft);
  border-radius: 6px;
  border-left: 3px solid var(--vp-c-brand-1);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.5rem;
}

.detail-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.detail-header code {
  font-size: 0.8em;
  color: var(--vp-c-text-3);
  margin-left: auto;
}

.detail-desc {
  margin: 0;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}

.detail-meta {
  display: flex;
  gap: 16px;
  margin-top: 0.5rem;
  font-size: 0.8em;
  color: var(--vp-c-text-3);
}

.detail-deps {
  margin-top: 0.5rem;
  font-size: 0.85em;
}

.deps-label {
  color: var(--vp-c-text-3);
  margin-right: 4px;
}

.dep-tag {
  display: inline-block;
  padding: 1px 8px;
  margin: 2px;
  background: var(--vp-c-brand-soft);
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.9em;
  color: var(--vp-c-brand-1);
}

.dep-tag:hover {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}
</style>
