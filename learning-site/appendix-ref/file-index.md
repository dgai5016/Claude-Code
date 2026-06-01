# 关键文件索引

> 50+ 核心源文件，按子系统分类

## 启动与入口

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/dev-entry.ts` | — | 开发入口，验证依赖完整性 |
| `src/entrypoints/cli.tsx` | — | CLI 参数解析与子命令路由 |
| `src/entrypoints/init.ts` | — | 初始化编排（遥测→认证→设置→MCP→策略） |
| `src/main.tsx` | 4,690 | 启动编排 God File：Commander 解析、模式选择、REPL 启动 |
| `src/replLauncher.tsx` | — | REPL 启动器 |

## 核心循环

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/query.ts` | 1,729 | 核心查询循环：async generator |
| `src/QueryEngine.ts` | 1,295 | SDK 封装的查询引擎 |
| `src/Tool.ts` | 792 | Tool 接口、ToolUseContext、buildTool |
| `src/tools.ts` | 389 | 工具注册表 |
| `src/commands.ts` | 754 | 斜杠命令注册表 |
| `src/context.ts` | — | 系统上下文构建 |

## 提示词系统

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/constants/prompts.ts` | 961 | 系统提示词工厂（静态/动态分区） |
| `src/constants/systemPromptSections.ts` | — | Section 注册 API |
| `src/constants/product.ts` | — | 产品常量 |
| `src/constants/tools.ts` | — | 工具权限常量 |

## API 通信

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/services/api/claude.ts` | 3,419 | 流式查询引擎 |
| `src/services/api/client.ts` | 389 | 多供应商客户端工厂 |
| `src/services/api/withRetry.ts` | 822 | 异步生成器重试 |
| `src/services/api/errors.ts` | 1,207 | 错误分类 |
| `src/services/api/promptCacheBreakDetection.ts` | 727 | Prompt 缓存失效检测 |

## 权限系统

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/utils/permissions/permissions.ts` | — | 权限引擎核心 |
| `src/utils/permissions/yoloClassifier.ts` | 1,495 | Auto 模式两阶段分类器 |
| `src/utils/permissions/bashSecurity.ts` | 2,592 | Bash 安全验证 |
| `src/utils/permissions/bashPermissions.ts` | 2,621 | Bash 权限规则 |
| `src/utils/permissions/filesystem.ts` | 1,777 | 文件系统权限 |
| `src/hooks/useCanUseTool.tsx` | — | 权限 UI 桥接 Hook |

## 工具执行

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/services/tools/toolExecution.ts` | 1,745 | 单工具执行 |
| `src/services/tools/StreamingToolExecutor.ts` | 530 | 流式并发执行 |
| `src/services/tools/toolHooks.ts` | 650 | Pre/Post 工具 Hook |
| `src/services/tools/toolOrchestration.ts` | 188 | 分区批处理 |

## 记忆系统

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/memdir/memdir.ts` | — | 记忆目录管理 |
| `src/services/extractMemories/extractMemories.ts` | 615 | 自动记忆提取 |
| `src/services/autoDream/autoDream.ts` | 324 | Dream 整合服务 |
| `src/services/SessionMemory/sessionMemory.ts` | 495 | 会话记忆维护 |
| `src/services/teamMemorySync/index.ts` | 1,256 | 团队记忆同步 |

## 压缩/上下文

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/services/compact/compact.ts` | 1,705 | 完整对话压缩 |
| `src/services/compact/microCompact.ts` | 530 | 微压缩（工具结果截断） |
| `src/services/compact/autoCompact.ts` | 351 | 自动压缩触发 |
| `src/services/compact/sessionMemoryCompact.ts` | 630 | 会话记忆压缩 |

## MCP

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/services/mcp/client.ts` | 3,348 | MCP 客户端 |
| `src/services/mcp/auth.ts` | 2,465 | MCP OAuth/XAA 认证 |
| `src/services/mcp/config.ts` | 1,578 | MCP 配置解析 |

## 多 Agent

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/tools/AgentTool/AgentTool.tsx` | — | Agent 工具 |
| `src/tools/AgentTool/runAgent.ts` | — | Agent 执行 |
| `src/tools/AgentTool/builtInAgents.ts` | — | 内置 Agent 注册 |
| `src/utils/swarm/` (22文件) | 7,548 | Swarm 团队系统 |

## UI

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/screens/REPL.tsx` | 5,061 | 主交互界面 |
| `src/cli/print.ts` | 5,594 | 输出渲染管道 |
| `src/cli/structuredIO.ts` | 859 | SDK 结构化 I/O |
| `src/components/PromptInput/` | 2,338 | 输入组件 |

## 配置与设置

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/utils/settings/settings.ts` | — | 5 级配置加载与合并 |
| `src/utils/settings/types.ts` | — | 配置 schema |
| `src/utils/hooks/` (17文件) | 2,710 | Hook 执行引擎 |
| `src/utils/plugins/` (44文件) | 20,521 | 插件基础设施 |

## 遥测

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/services/analytics/growthbook.ts` | 1,155 | GrowthBook 集成 |
| `src/services/analytics/metadata.ts` | 973 | 事件元数据脱敏 |
| `src/services/analytics/index.ts` | 173 | logEvent() 公共 API |

## Bash 智能

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/utils/bash/bashParser.ts` | 4,436 | Bash 解析器 |
| `src/utils/bash/ast.ts` | — | AST 构建 |
| `src/utils/bash/commands.ts` | — | 命令分类 |

## 类型定义

| 文件 | 职责 |
|------|------|
| `src/types/message.ts` | 9 种消息类型 |
| `src/types/permissions.ts` | 权限类型系统 |
| `src/types/tools.ts` | 工具类型 |
| `src/types/ids.ts` | SessionId / AgentId 品牌类型 |
| `src/types/command.ts` | 命令类型 |
| `src/types/hooks.ts` | Hook 事件类型 |
