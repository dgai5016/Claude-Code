# Claude Code 源码学习网站 — 设计规格书

## 1. 项目背景

从 `@anthropic-ai/claude-code` npm 包的 source map 中还原的完整 TypeScript 源码（1,987 文件 / ~513K 行 / ~34MB），以**静态网页**形式呈现源码解析和学习过程。

核心设计原则：**层层递进**——每一步都建立在前一步之上，没有跳跃。不是分类目录，而是一本"从零读懂 Claude Code"的书。

经源码导入依赖追踪，发现代码的"脊柱"是：

```
Types → Tool.ts → Permissions → useCanUseTool → Tool Execution → Query Loop
```

以及汇聚链：`Auth → API Client → Query Loop`

Query Loop 是全系统的汇聚点——理解了它，就能看懂任何子系统是如何"接入"的。

---

## 2. 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 框架 | VitePress | 文档优先静态站点，原生 Markdown + Vue 组件嵌入 |
| 代码高亮 | Shiki（VitePress 内置） | 完美支持 TypeScript/TSX |
| 架构图 | Mermaid（vitepress-plugin-mermaid） | 流程图/时序图/状态图/类图 |
| 交互组件 | Vue 3（VitePress 内置） | 自定义组件嵌入 Markdown |
| 搜索 | VitePress 内置 | 支持中文分词 |
| 主题 | VitePress 默认（暗色为主） | 契合终端工具气质 |
| 部署 | 静态 HTML，任意托管 | VitePress build 输出纯静态 |

---

## 3. 站点结构：8 篇章递进

```
序章 ──→ 第一章 ──→ 第二章 ──→ 第三章 ──→ 第四章 ──→ 第五章 ──→ 第六章 ──→ 第七章 ──→ 第八章
 认知     类型      通信      约束      指令      行动      心跳       扩展       外延

              ↕ 附录：隐藏功能与专题（按兴趣选读，每页标注前置章节）↕
```

**核心脊柱（必须线性阅读）：**
```
1.3 Tool类型 → 3.4 权限引擎 → 3.5 useCanUseTool → 5.2 工具执行 → 6.1 query()
```

**汇聚链：**
```
2.1 认证 → 2.3 API客户端 → 6.1 query()
```

---

### 序章：这是什么？（2 页）

**学习目标：建立宏观心智模型，能导航源码树**

| 编号 | 标题 | 内容 |
|------|------|------|
| P0 | 项目概览 | 仓库规模(1987文件/513K行)、还原背景、依赖图谱(73个包)、技术栈(Bun/React/Ink/Anthropic SDK) |
| P1 | 架构总览 | 分层架构图、核心脊柱、数据流全景（用户输入→Prompt→API→Tool→状态→UI） |

> 读完后：你知道 Claude Code 是什么、有多大规模、核心数据怎么流。接下来从最底层开始，一层一层往上搭。

---

### 第一章：基石 — 类型与全局状态（3 页）

**学习目标：掌握所有后续系统共用的"词汇"和"地基"**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 1.1 | 消息与工具类型 | `src/types/` | 9 种消息类型、PermissionMode(7种)、工具类型、ID 生成 |
| 1.2 | 全局引导状态 | `src/bootstrap/state.ts` | sessionId/projectRoot/statsStore/featureFlags 全局单例 |
| 1.3 | 工具类型系统 | `src/Tool.ts` (792行) | `Tool<Input,Output,Progress>` 接口（全代码库最重要的类型）、`ToolUseContext` 世界对象、`buildTool()` 工厂 |

> 前置：序章
> 读完后：你理解了所有系统共用的"语言"。每个工具都是 Tool 类型，每次权限检查都引用 PermissionMode，每条消息都是 Message 联合类型。

---

### 第二章：身份与通信 — 认证与 API（4 页）

**学习目标：理解 Claude Code 如何与 Anthropic API 通信**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 2.1 | 认证与配置 | `utils/auth.ts` + `utils/settings/` | API Key 管理、5 级优先源设置加载、OAuth 2.0+PKCE |
| 2.2 | 模型路由 | `utils/model/` (16文件, 2192行) | 默认模型选择、别名解析、多供应商检测(Anthropic/Bedrock/Vertex/Foundry)、模型能力标志 |
| 2.3 | API 客户端 | `services/api/` (7500+行) | 多供应商工厂(client.ts)、流式查询引擎(claude.ts, 3419行)、异步生成器重试(withRetry.ts, 822行)、全类型错误分类(errors.ts, 1207行) |
| 2.4 | 特性标志与遥测 | `services/analytics/` | GrowthBook 59个远程开关、双汇架构(Datadog+1P BigQuery)、事件脱敏 |

> 前置：第一章
> 读完后：你知道 Claude Code 如何认证、如何选择模型、如何与 API 通信、如何远程控制行为。这是 Query Loop 的通信基础。

---

### 第三章：约束 — 权限与安全（5 页）

**学习目标：理解工具执行前的"关卡"——什么操作被允许、什么被拒绝**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 3.1 | 权限原语 | `utils/permissions/` | PermissionResult/Rule/Decision、7 种模式 |
| 3.2 | Bash 智能层 | `utils/bash/` (23文件, 2192行) | AST 解析、命令分类(只读/危险/破坏性)、Tree-sitter 分析 |
| 3.3 | 沙盒 | `utils/sandbox/` | bwrap(Linux)/sandbox-exec(macOS)、写白名单、网络限制 |
| 3.4 | 权限引擎 | `utils/permissions/permissions.ts` | `hasPermissionsToUseTool()` 核心关卡、规则匹配、文件系统权限(1777行)、Bash 安全验证(5213行) |
| 3.5 | Auto 模式分类器 | `utils/permissions/yoloClassifier.ts` (1495行) | 两阶段分类(快速XML→深度thinking)、LLM 副查询、`useCanUseTool` hook |

> 前置：第一、二章
> 读完后：你理解了权限检查的完整链路。每当工具要执行，都会经过这条链。这是工具执行的前置约束。

---

### 第四章：指令 — 提示词系统（4 页）

**学习目标：理解 Claude Code 的"大脑指令"如何组装**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 4.1 | 静态段 | `constants/prompts.ts` (960行) | 静态/动态分区架构、7 个静态 section、`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` |
| 4.2 | 动态段 | `systemPromptSections.ts` + `context.ts` | Section 注册 API、10+ 动态 sections、缓存与解析 |
| 4.3 | 记忆系统（读取侧） | `src/memdir/` | MEMORY.md 加载与扫描、自动记忆发现、团队记忆路径 |
| 4.3b | 记忆系统（写入侧） | extractMemories/(769行) + autoDream/(550行) + SessionMemory/(1026行) + teamMemorySync/(2167行) | 自动提取、Dream 四阶段整合、会话记忆维护、团队同步+密钥扫描 |

> 前置：第一、三章
> 读完后：你理解了模型收到的完整指令如何组装。记忆系统既读（注入 prompt）又写（forked agent 提取），与 prompt 系统紧密耦合。

---

### 第五章：行动 — 工具执行（4 页）

**学习目标：理解工具从定义到执行的完整生命周期**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 5.1 | 工具注册表 | `src/tools.ts` (389行) | `getAllBaseTools()`、条件导入、`assembleToolPool()` |
| 5.2 | 工具执行引擎 | `services/tools/` | toolExecution.ts(1745行)权限→Hook→调用→结果、StreamingToolExecutor(530行)并发执行、toolHooks(650行) |
| 5.3 | Hook 系统 | `utils/hooks/` (17文件, 2710行) | 26 种事件、4 种类型(command/prompt/http/agent)、SSRF 防护 |
| 5.4 | 重点工具分析 | BashTool + AgentTool + MCPTool | BashTool(最复杂:AST+权限+沙盒)、AgentTool(最递归:子查询循环)、MCPTool(最动态:运行时发现) |

> 前置：第一、三、四章
> 读完后：你理解了工具从注册到执行的完整路径。工具执行引擎是 Query Loop 的"手"。

---

### 第六章：心跳 — 查询循环（2 页）

**学习目标：理解全系统的汇聚点——Claude Code 的核心循环**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 6.1 | query() 异步生成器 | `src/query.ts` (1729行) | **核心循环**：构建Prompt→调用API→流式接收→分发工具→收集结果→回环；终止原因；token恢复 |
| 6.2 | QueryEngine | `src/QueryEngine.ts` (1295行) | SDK 封装：submitMessage()、会话状态、与 CLI/SDK 桥接 |

> 前置：第二、三、四、五章（API通信+权限关卡+Prompt组装+工具执行）
> 读完后：**这是最重要的里程碑。** 你理解了全系统的核心循环。所有其他系统要么"喂入"这个循环，要么"扩展"这个循环。

---

### 第七章：扩展 — 在核心循环上构建（8 页）

**学习目标：理解核心循环如何被扩展为更强大的系统**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 7.1 | 状态管理 | `src/state/` | AppState 不可变记录、zustand-like store、React Context Provider |
| 7.2 | Agent/Subagent 系统 | `tools/AgentTool/` (17文件) | 内置 Agent(Explore/Plan/Guide/Verify)、用户/项目 Agent、Fork 子代理(cache共享)、记忆快照 |
| 7.3 | 多 Agent 团队 (Swarm) | `utils/swarm/` (7548行, 22文件) | 三后端(tmux/iTerm2/in-process)、权限同步(928行)、团队管理 |
| 7.4 | 压缩/上下文管理 | `services/compact/` | 完整压缩(1705行)、微压缩(530行)、自动压缩触发、Snip 压缩 |
| 7.5 | MCP 集成 | `services/mcp/` (9500+行) | 7 种传输、7 种作用域、OAuth/XAA 认证(2465行)、连接生命周期 |
| 7.6 | 插件系统 | `utils/plugins/` (20521行, 44文件) | 市场(发现/安装/解析/黑名单)、插件加载(Agent/命令/Hook/LSP/MCP) |
| 7.7 | 技能系统 | `src/skills/` (3868行) | Skill 发现与 frontmatter 解析、内建技能目录、与命令系统桥接 |
| 7.8 | 命令系统 | `commands.ts` + `commands/` (87+命令) | 3 种命令类型(Prompt/Local/LocalJSX)、懒加载、功能门控 |

> 前置：第六章
> 读完后：你理解了核心循环的 7 种扩展方式。每种都是"在 query() 上叠加一层"。

---

### 第八章：外延 — 接口与集成（5 页）

**学习目标：理解 Claude Code 如何与外部世界连接**

| 编号 | 标题 | 核心文件 | 要点 |
|------|------|---------|------|
| 8.1 | UI 系统 | REPL.tsx(5061行) + PromptInput(2338行) + ink/ | React+Ink 终端渲染、Vim 模式引擎、提示建议/Speculation |
| 8.2 | CLI/SDK 接口层 | `src/cli/` (6708行) | 传输层(SSE/WebSocket/Hybrid)、structuredIO(859行)、print.ts(5594行)、后台会话 |
| 8.3 | 远程与 CCR | `src/remote/` + `src/server/` | CCR WebSocket 会话、直连模式、Teleport(Git Bundle)、SSH 远程 |
| 8.4 | LSP 集成 | `services/lsp/` (2800行) | 多服务器管理、诊断聚合、被动反馈 |
| 8.5 | 入口流程 | dev-entry→cli.tsx→init.ts→main.tsx(4690行)→REPL.tsx | 启动编排：遥测→认证→设置→LSP→MCP→策略限制 |

> 前置：第七章
> 读完后：你理解了 Claude Code 的所有外部接口。入口流程是"接线图"——把所有系统在启动时连起来。

---

### 附录：隐藏功能与专题（按兴趣选读）

每页标注前置章节，不要求按顺序阅读。

**隐藏功能：**

| 功能 | 前置章节 | 基于 |
|------|---------|------|
| Buddy 宠物系统 | 第一章（类型） | docs/01-buddy.md |
| KAIROS 持久助手 | 第四章（记忆）、第六章（查询循环） | docs/02-kairos.md |
| Bridge 远程控制 | 第八章（远程/CCR） | docs/06-bridge.md |
| Coordinator 多Agent编排 | 第七章 7.2-7.3（Agent/Swarm） | docs/04-coordinator.md |
| Ultraplan 云端规划 | 第八章（远程/CCR） | docs/03-ultraplan.md |
| 语音模式 | 第二章（API 客户端） | — |
| Computer Use | 第五章（工具执行） | — |
| Worktree 隔离模式 | 第七章 7.3（Swarm） | — |
| 深度链接与 IDE 集成 | 第八章（入口流程） | — |
| 简单/裸机模式 | 第三章（权限） | — |
| 沙盒深度 | 第三章 3.3 | — |
| 后台会话 | 第八章 8.2 | — |
| Doctor 诊断 | 第八章 8.5 | — |

**专题：**

| 专题 | 前置章节 |
|------|---------|
| 企业策略与管控（policyLimits/remoteManagedSettings/settingsSync） | 第二章 2.1、第三章 |
| 安全设计深度分析 | 第三章全章 |
| 三层门控架构（85 编译时 + 200+ 运行时 + 59 远程标志） | 第二章 2.4 |
| 设计模式分析（工厂/观察者/策略/状态机/不可变状态/异步生成器/注册表/Provider-Context） | 全八章 |
| "God File" 现象（main.tsx/REPL.tsx/print.ts） | 全八章 |
| 源码地图（交互式模块依赖图） | 第一章 |

**速查：**
- 关键文件索引（50+ 文件：路径/行数/职责/子系统）
- 环境变量速查（可搜索表）
- 编译开关速查（85 编译时 + 59 远程标志）
- 隐藏命令速查（26+ isHidden 命令 + 隐藏 CLI 选项）
- Ant 内部特性速查（TungstenTool/REPLTool/堆转储等）
- 术语表

---

## 4. 交互式组件

| 组件 | 用途 | 使用场景 |
|------|------|---------|
| FlowStepper.vue | 步进式流程图，逐步推进 | 查询循环、Dream 四阶段、权限检查链、工具执行流 |
| CodeReference.vue | 代码块：高亮+行号锚点+注释+折叠+关联文件 | 所有代码走读段落 |
| ArchitectureMap.vue | 交互式模块依赖图，点击展开，按子系统着色 | 源码地图专题页 |
| FeatureGateExplorer.vue | 三层门控可视化，点击开关名展示代码条件 | 三层门控专题页 |
| SpriteAnimator.vue | ASCII 精灵动画播放器 | Buddy 宠物系统页 |
| DecisionTree.vue | 交互式决策树 | 权限检查、Continue vs Spawn 等 |

---

## 5. 页面模板

每个深入分析页面统一结构：

```
┌──────────────────────────────────────┐
│  标题 + 一句话概括                    │
│  前置知识：[链接到前置章节]            │
├──────────────────────────────────────┤
│  架构图（Mermaid 或交互式组件）        │
├──────────────────────────────────────┤
│  核心概念（表格/要点/短段落）          │
├──────────────────────────────────────┤
│  代码走读（CodeReference 组件）        │
├──────────────────────────────────────┤
│  关键源文件表（路径/行数/职责）        │
├──────────────────────────────────────┤
│  关联系统（站内链接）                  │
├──────────────────────────────────────┤
│  设计洞察（设计模式/权衡分析）         │
├──────────────────────────────────────┤
│  下一章你需要掌握的内容               │
└──────────────────────────────────────┘
```

---

## 6. 学习路径设计

**推荐阅读时间：**

| 章节 | 时间 | 难度 |
|------|------|------|
| 序章 | 1-2h | 入门 |
| 第一章 | 2-3h | 入门 |
| 第二章 | 3-4h | 进阶 |
| 第三章 | 3-4h | 进阶 |
| 第四章 | 3-4h | 进阶 |
| 第五章 | 3-4h | 进阶 |
| 第六章 | 2-3h | **核心里程碑** |
| 第七章 | 6-8h | 深入 |
| 第八章 | 4-5h | 深入 |
| 附录 | 按兴趣 10-15h | 可选 |

**角色路径（快捷入口）：**

| 角色 | 路径 |
|------|------|
| CLI 工具开发者 | 序章→1→2→3→5→6→7.2/7.3/7.8→8.2→8.5 |
| AI/LLM 工程师 | 序章→1→2→4→6→7.4→附录(Dream/KAIROS) |
| 安全工程师 | 序章→1→2→3→附录(安全/门控/沙盒) |
| 前端开发者 | 序章→1→3→5→6→7.1→8.1→附录(React+Ink) |
| 平台/DevOps | 序章→2→6→7.5→8.2/8.3→附录(企业策略) |

---

## 7. 项目目录结构

```
claude-code-learning-site/
├── .vitepress/
│   ├── config.ts
│   └── theme/
│       ├── index.ts
│       └── components/
│           ├── FlowStepper.vue
│           ├── CodeReference.vue
│           ├── ArchitectureMap.vue
│           ├── FeatureGateExplorer.vue
│           ├── SpriteAnimator.vue
│           └── DecisionTree.vue
├── data/
│   ├── source-map.json
│   ├── feature-flags.json
│   ├── env-vars.json
│   ├── hidden-commands.json
│   └── buddy-sprites.json
├── index.md
├── prologue/
│   └── architecture.md
├── ch01-foundation/
│   ├── message-types.md
│   ├── bootstrap-state.md
│   └── tool-type.md
├── ch02-identity/
│   ├── auth-settings.md
│   ├── model-routing.md
│   ├── api-client.md
│   └── feature-flags.md
├── ch03-constraints/
│   ├── permission-primitives.md
│   ├── bash-intelligence.md
│   ├── sandbox.md
│   ├── permission-engine.md
│   └── auto-classifier.md
├── ch04-instructions/
│   ├── static-prompt.md
│   ├── dynamic-prompt.md
│   ├── memory-read.md
│   └── memory-write.md
├── ch05-actions/
│   ├── tool-registry.md
│   ├── tool-execution.md
│   ├── hook-system.md
│   └── tool-deepdives.md
├── ch06-heartbeat/
│   ├── query-loop.md
│   └── query-engine.md
├── ch07-extensions/
│   ├── state-management.md
│   ├── agents.md
│   ├── swarm.md
│   ├── compact.md
│   ├── mcp.md
│   ├── plugins.md
│   ├── skills.md
│   └── commands.md
├── ch08-interfaces/
│   ├── ui-system.md
│   ├── cli-sdk.md
│   ├── remote-ccr.md
│   ├── lsp.md
│   └── entry-flow.md
├── appendix-hidden/
├── appendix-topics/
├── appendix-ref/
└── package.json
```

---

## 8. 实施阶段

| 阶段 | 内容 | 预估 |
|------|------|------|
| 1. 搭建 | VitePress 初始化 + 主题 + Mermaid + 序章 2 页 | 1 天 |
| 2. 基石与通信 | 第一章 3 页 + 第二章 4 页 + CodeReference 组件 | 3-4 天 |
| 3. 约束与指令 | 第三章 5 页 + 第四章 4 页 | 4-5 天 |
| 4. 行动与心跳 | 第五章 4 页 + 第六章 2 页 + FlowStepper 组件 | 3-4 天 |
| 5. 扩展 | 第七章 8 页 | 4-5 天 |
| 6. 外延 | 第八章 5 页 | 3-4 天 |
| 7. 附录 | 隐藏功能 13 页 + 专题 5 页 + 速查 6 页 + SpriteAnimator + FeatureGateExplorer | 5-7 天 |
| 8. 打磨 | ArchitectureMap + 导航增强 + 交叉验证 + 部署 | 2-3 天 |

**总计：约 25-33 天，~52 个内容页面**

---

## 9. 验证方式

1. `npm run docs:dev` 本地验证所有页面可访问
2. Mermaid 图正确渲染
3. Vue 交互组件正常
4. 侧边栏顺序 = 阅读顺序
5. `npm run docs:build` 无死链
6. 移动端响应式
7. **递进验证**：每章"前置知识"链接全部指向更早章节，无循环依赖
8. **覆盖验证**：与 src/ 目录逐项交叉检查无遗漏

---

## 10. 核心源文件矩阵

| 系统 | 核心文件 | 行数 |
|------|---------|------|
| 启动编排 | src/main.tsx | 4,690 |
| 主界面 | src/screens/REPL.tsx | 5,061 |
| 输出渲染 | src/cli/print.ts | 5,594 |
| API 客户端 | src/services/api/claude.ts | 3,419 |
| 代理循环 | src/query.ts | 1,729 |
| 工具执行 | src/services/tools/toolExecution.ts | 1,745 |
| 提示词 | src/constants/prompts.ts | 961 |
| 工具类型 | src/Tool.ts | 792 |
| 重试逻辑 | src/services/api/withRetry.ts | 822 |
| 错误处理 | src/services/api/errors.ts | 1,207 |
| 权限引擎 | src/utils/permissions/permissions.ts | ~2,500 |
| Bash 安全 | src/utils/permissions/bashSecurity.ts | 2,592 |
| Bash 权限 | src/utils/permissions/bashPermissions.ts | 2,621 |
| 文件系统权限 | src/utils/permissions/filesystem.ts | 1,777 |
| YOLO 分类器 | src/utils/permissions/yoloClassifier.ts | 1,495 |
| Swarm | src/utils/swarm/ (22文件) | 7,548 |
| 插件 | src/utils/plugins/ (44文件) | 20,521 |
| Hook | src/utils/hooks/ (17文件) | 2,710 |
| 模型路由 | src/utils/model/ (16文件) | 2,192 |
| Bash 智能 | src/utils/bash/ (23文件) | 2,192 |
| Computer Use | src/utils/computerUse/ (15文件) | 2,192 |
| MCP 客户端 | src/services/mcp/client.ts | 3,348 |
| MCP 认证 | src/services/mcp/auth.ts | 2,465 |
| 压缩 | src/services/compact/compact.ts | 1,705 |
| 记忆提取 | src/services/extractMemories/ | 769 |
| Dream | src/services/autoDream/ | 550 |
| 团队记忆 | src/services/teamMemorySync/ | 2,167 |
| GrowthBook | src/services/analytics/growthbook.ts | 1,155 |
