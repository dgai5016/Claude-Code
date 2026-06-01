# 架构总览

> 前置：[首页项目概览](/)

Claude Code 是一个基于 React + Ink 的终端 AI 助手。它接收用户输入，组装系统提示词，调用 Anthropic API，执行模型请求的工具，然后循环往复——直到任务完成。

## 分层架构

```mermaid
graph TB
    subgraph UI["UI 层"]
        REPL["REPL.tsx\n主交互界面"]
        PI["PromptInput\n输入组件"]
    end

    subgraph Loop["核心循环"]
        Q["query()\n异步生成器"]
        QE["QueryEngine\nSDK 封装"]
    end

    subgraph Prompt["指令层"]
        PS["prompts.ts\n提示词工厂"]
        MEM["memdir/\n记忆系统"]
    end

    subgraph API["通信层"]
        AC["claude.ts\n流式客户端"]
        RT["withRetry.ts\n重试引擎"]
        AUTH["auth.ts\n认证"]
    end

    subgraph ToolExec["执行层"]
        TE["toolExecution.ts\n工具执行"]
        SE["StreamingToolExecutor\n并发调度"]
        PERM["permissions.ts\n权限关卡"]
    end

    subgraph ToolDef["工具层"]
        TOOLS["tools.ts\n53 个工具"]
        MCP["MCPTool\n动态工具"]
        HOOKS["hooks.ts\nHook 系统"]
    end

    subgraph State["状态层"]
        AS["AppState\n不可变记录"]
        STORE["store.ts\n状态管理"]
    end

    UI --> Loop
    Loop --> Prompt
    Loop --> API
    Loop --> ToolExec
    ToolExec --> PERM
    ToolExec --> ToolDef
    Loop --> State
    API --> AUTH
```

## 核心脊柱

理解 Claude Code 最关键的一条依赖链：

```mermaid
graph LR
    A["Types\n类型定义"] --> B["Tool.ts\n工具类型"]
    B --> C["Permissions\n权限引擎"]
    C --> D["useCanUseTool\n权限桥接"]
    D --> E["Tool Execution\n工具执行"]
    E --> F["query()\n查询循环"]

    style F fill:#e8833a,color:#fff
```

加上通信链：

```mermaid
graph LR
    A["Auth\n认证"] --> B["API Client\n流式客户端"]
    B --> C["query()\n查询循环"]

    style C fill:#e8833a,color:#fff
```

两条链在 `query()` 汇聚——这就是整个系统的心跳。

## 数据流全景

一次完整的用户交互流程：

```mermaid
sequenceDiagram
    participant U as 用户
    participant PI as PromptInput
    participant Q as query()
    participant PS as 提示词系统
    participant API as Anthropic API
    participant TE as 工具执行
    participant S as AppState

    U->>PI: 输入消息
    PI->>Q: 提交消息
    Q->>PS: 组装系统提示词
    PS-->>Q: 完整 prompt
    Q->>API: 流式请求
    API-->>Q: 流式响应

    alt 模型返回文本
        Q->>S: 更新消息
        Q->>PI: 渲染响应
    else 模型请求工具
        Q->>TE: 执行工具(经权限检查)
        TE-->>Q: 工具结果
        Q->>API: 带工具结果继续
    end
```

## 核心系统概要

| # | 系统 | 核心文件 | 行数 | 一句话描述 |
|---|------|---------|------|-----------|
| 1 | 类型与状态 | src/types/ + src/Tool.ts + src/bootstrap/ | ~3,000 | 所有系统共用的"词汇"和"地基" |
| 2 | 认证与API | src/utils/auth/ + src/services/api/ | ~9,500 | 与 Anthropic API 通信的完整链路 |
| 3 | 权限与安全 | src/utils/permissions/ + src/utils/bash/ | ~11,000 | 工具执行前的"关卡" |
| 4 | 提示词系统 | src/constants/prompts.ts + src/memdir/ | ~3,500 | 模型收到的"大脑指令"如何组装 |
| 5 | 工具执行 | src/services/tools/ + src/utils/hooks/ | ~6,000 | 从定义到执行的完整生命周期 |
| 6 | 查询循环 | src/query.ts + src/QueryEngine.ts | ~3,000 | 全系统的汇聚点、核心循环 |
| 7 | 扩展系统 | agents/swarm/compact/mcp/plugins/skills/commands | ~50,000 | 在核心循环上叠加的 7 层扩展 |
| 8 | 外延接口 | UI/CLI-SDK/remote/LSP/entry | ~20,000 | 与外部世界的连接 |

## 技术栈

| 技术 | 用途 |
|------|------|
| TypeScript / TSX | 全量 TypeScript，ESM 模块 |
| React + Ink | 终端 UI 渲染（React 驱动终端） |
| Bun | 运行时与构建工具，`bun:bundle` 编译时特性开关 |
| Anthropic SDK | API 通信 |
| Zod | 运行时 schema 验证 |
| GrowthBook | 远程特性标志 / A-B 测试 |
| MCP SDK | Model Context Protocol 集成 |
| OpenTelemetry | 遥测追踪 |

---

<div class="chapter-nav-hint">

**下一章：[第一章 基石 — 类型与全局状态 →](/ch01-foundation/message-types)**

你需要掌握的内容：理解 Claude Code 的类型系统（Message、Permission、Tool），以及全局引导状态（bootstrap state）如何作为所有系统的共享地基。

</div>
