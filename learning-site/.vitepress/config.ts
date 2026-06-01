import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  lang: 'zh-CN',
  title: '读懂 Claude Code',
  description: '从零开始，层层递进地理解 Claude Code 源码的设计原理与代码实现',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  markdown: {
    lineNumbers: true,
  },

  themeConfig: {
    nav: [
      { text: '序章', link: '/' },
      { text: '基石', link: '/ch01-foundation/message-types' },
      { text: '通信', link: '/ch02-identity/auth-settings' },
      { text: '约束', link: '/ch03-constraints/permission-primitives' },
      { text: '指令', link: '/ch04-instructions/static-prompt' },
      { text: '行动', link: '/ch05-actions/tool-registry' },
      { text: '心跳', link: '/ch06-heartbeat/query-loop' },
      { text: '扩展', link: '/ch07-extensions/state-management' },
      { text: '外延', link: '/ch08-interfaces/ui-system' },
    ],

    sidebar: {
      '/prologue/': [
        {
          text: '序章：这是什么？',
          items: [
            { text: '架构总览', link: '/prologue/architecture' },
          ],
        },
      ],
      '/ch01-foundation/': [
        {
          text: '第一章：基石 — 类型与全局状态',
          collapsed: false,
          items: [
            { text: '1.1 消息与工具类型', link: '/ch01-foundation/message-types' },
            { text: '1.2 全局引导状态', link: '/ch01-foundation/bootstrap-state' },
            { text: '1.3 工具类型系统', link: '/ch01-foundation/tool-type' },
          ],
        },
      ],
      '/ch02-identity/': [
        {
          text: '第二章：身份与通信',
          collapsed: false,
          items: [
            { text: '2.1 认证与配置', link: '/ch02-identity/auth-settings' },
            { text: '2.2 模型路由', link: '/ch02-identity/model-routing' },
            { text: '2.3 API 客户端', link: '/ch02-identity/api-client' },
            { text: '2.4 特性标志与遥测', link: '/ch02-identity/feature-flags' },
          ],
        },
      ],
      '/ch03-constraints/': [
        {
          text: '第三章：约束 — 权限与安全',
          collapsed: false,
          items: [
            { text: '3.1 权限原语', link: '/ch03-constraints/permission-primitives' },
            { text: '3.2 Bash 智能层', link: '/ch03-constraints/bash-intelligence' },
            { text: '3.3 沙盒', link: '/ch03-constraints/sandbox' },
            { text: '3.4 权限引擎', link: '/ch03-constraints/permission-engine' },
            { text: '3.5 Auto 模式分类器', link: '/ch03-constraints/auto-classifier' },
          ],
        },
      ],
      '/ch04-instructions/': [
        {
          text: '第四章：指令 — 提示词系统',
          collapsed: false,
          items: [
            { text: '4.1 静态段', link: '/ch04-instructions/static-prompt' },
            { text: '4.2 动态段', link: '/ch04-instructions/dynamic-prompt' },
            { text: '4.3 记忆系统（读取侧）', link: '/ch04-instructions/memory-read' },
            { text: '4.3b 记忆系统（写入侧）', link: '/ch04-instructions/memory-write' },
          ],
        },
      ],
      '/ch05-actions/': [
        {
          text: '第五章：行动 — 工具执行',
          collapsed: false,
          items: [
            { text: '5.1 工具注册表', link: '/ch05-actions/tool-registry' },
            { text: '5.2 工具执行引擎', link: '/ch05-actions/tool-execution' },
            { text: '5.3 Hook 系统', link: '/ch05-actions/hook-system' },
            { text: '5.4 重点工具分析', link: '/ch05-actions/tool-deepdives' },
          ],
        },
      ],
      '/ch06-heartbeat/': [
        {
          text: '第六章：心跳 — 查询循环',
          collapsed: false,
          items: [
            { text: '6.1 query() 异步生成器', link: '/ch06-heartbeat/query-loop' },
            { text: '6.2 QueryEngine', link: '/ch06-heartbeat/query-engine' },
          ],
        },
      ],
      '/ch07-extensions/': [
        {
          text: '第七章：扩展 — 在核心循环上构建',
          collapsed: false,
          items: [
            { text: '7.1 状态管理', link: '/ch07-extensions/state-management' },
            { text: '7.2 Agent/Subagent 系统', link: '/ch07-extensions/agents' },
            { text: '7.3 多 Agent 团队 (Swarm)', link: '/ch07-extensions/swarm' },
            { text: '7.4 压缩/上下文管理', link: '/ch07-extensions/compact' },
            { text: '7.5 MCP 集成', link: '/ch07-extensions/mcp' },
            { text: '7.6 插件系统', link: '/ch07-extensions/plugins' },
            { text: '7.7 技能系统', link: '/ch07-extensions/skills' },
            { text: '7.8 命令系统', link: '/ch07-extensions/commands' },
          ],
        },
      ],
      '/ch08-interfaces/': [
        {
          text: '第八章：外延 — 接口与集成',
          collapsed: false,
          items: [
            { text: '8.1 UI 系统', link: '/ch08-interfaces/ui-system' },
            { text: '8.2 CLI/SDK 接口层', link: '/ch08-interfaces/cli-sdk' },
            { text: '8.3 远程与 CCR', link: '/ch08-interfaces/remote-ccr' },
            { text: '8.4 LSP 集成', link: '/ch08-interfaces/lsp' },
            { text: '8.5 入口流程', link: '/ch08-interfaces/entry-flow' },
          ],
        },
      ],
      '/appendix-hidden/': [
        {
          text: '附录：隐藏功能',
          collapsed: true,
          items: [
            { text: 'Buddy 宠物系统', link: '/appendix-hidden/buddy' },
            { text: 'KAIROS 持久助手', link: '/appendix-hidden/kairos' },
            { text: 'Bridge 远程控制', link: '/appendix-hidden/bridge' },
            { text: 'Coordinator 多Agent编排', link: '/appendix-hidden/coordinator' },
            { text: 'Ultraplan 云端规划', link: '/appendix-hidden/ultraplan' },
            { text: '语音模式', link: '/appendix-hidden/voice' },
            { text: 'Computer Use', link: '/appendix-hidden/computer-use' },
            { text: 'Worktree 隔离模式', link: '/appendix-hidden/worktree' },
            { text: '深度链接与 IDE 集成', link: '/appendix-hidden/deep-link' },
            { text: '简单/裸机模式', link: '/appendix-hidden/simple-mode' },
            { text: '沙盒深度', link: '/appendix-hidden/sandbox-deep' },
            { text: '后台会话', link: '/appendix-hidden/bg-sessions' },
            { text: 'Doctor 诊断', link: '/appendix-hidden/doctor' },
          ],
        },
      ],
      '/appendix-topics/': [
        {
          text: '附录：专题',
          collapsed: true,
          items: [
            { text: '企业策略与管控', link: '/appendix-topics/enterprise' },
            { text: '安全设计深度分析', link: '/appendix-topics/security' },
            { text: '三层门控架构', link: '/appendix-topics/gate-architecture' },
            { text: '设计模式分析', link: '/appendix-topics/design-patterns' },
            { text: '"God File" 现象', link: '/appendix-topics/god-file' },
            { text: '源码地图', link: '/appendix-topics/source-map' },
          ],
        },
      ],
      '/appendix-ref/': [
        {
          text: '附录：速查',
          collapsed: true,
          items: [
            { text: '关键文件索引', link: '/appendix-ref/file-index' },
            { text: '环境变量速查', link: '/appendix-ref/env-vars' },
            { text: '编译开关速查', link: '/appendix-ref/feature-flags' },
            { text: '隐藏命令速查', link: '/appendix-ref/hidden-commands' },
            { text: 'Ant 内部特性速查', link: '/appendix-ref/ant-internals' },
            { text: '术语表', link: '/appendix-ref/glossary' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
      options: { locales: { root: { translations: { button: { buttonText: '搜索' } } } } },
    },

    editLink: { pattern: 'https://github.com/anthropics/claude-code/edit/main/src/:path', text: '在 GitHub 上编辑此页' },

    footer: { message: '基于 @anthropic-ai/claude-code npm 包 source map 还原的源码分析，仅供学习研究' },
  },

  vite: {},
}))
