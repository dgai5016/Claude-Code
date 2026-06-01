# 术语表

| 术语 | 全称 | 含义 |
|------|------|------|
| **DCE** | Dead Code Elimination | 编译时死代码消除，`feature()` 为 false 的代码从包中移除 |
| **GrowthBook** | — | A/B 测试和特性标志平台，控制远程开关 |
| **feature()** | — | 编译时特性开关，从 `bun:bundle` 导入，构建时求值 |
| **USER_TYPE** | — | 运行时用户类型：`'ant'`（内部）或 `'external'`（外部） |
| **CCR** | Claude Code Remote | 远程 Claude Code 执行环境（容器化） |
| **FNV-1a** | Fowler-Noll-Vo hash 1a | 确定性哈希算法，用于 Buddy 宠物生成 |
| **Mulberry32** | — | 确定性伪随机数生成器，配合 FNV-1a 使用 |
| **PKCE** | Proof Key for Code Exchange | OAuth 安全扩展，防止授权码拦截 |
| **XAA** | Cross-App Access | 跨应用访问，MCP 服务器的企业级认证机制 |
| **OTel** | OpenTelemetry | 遥测标准，Claude Code 用于指标、追踪和日志 |
| **Ink** | — | React 终端渲染器，让 React 组件在终端中渲染 |
| **Yoga** | — | Flexbox 布局引擎，Ink 用它计算终端布局 |
| **MCP** | Model Context Protocol | 模型上下文协议，连接外部工具和数据源 |
| **Prompt Cache** | — | Anthropic API 的提示词缓存机制，减少重复 token 计费 |
| **Micro-compact** | — | 微压缩，原地截断大型工具结果而非完整摘要 |
| **Forked Agent** | — | 分叉代理，在独立子进程中运行 `query()` 用于后台任务 |
| **YOLO Classifier** | — | Auto 模式的安全分类器，两阶段判断 bash 命令安全性 |
| **tengu_** | — | GrowthBook 特性标志前缀，所有远程开关以此开头 |
| **bwrap** | Bubblewrap | Linux 沙盒工具，限制文件系统和网络访问 |
| **sandbox-exec** | — | macOS 内置沙盒执行工具 |
| **SDK Mode** | — | 非交互式编程接口模式，供外部工具集成 |
| **Branded Type** | — | 品牌类型，TypeScript 中用交叉类型防止 ID 混用 |
| **God File** | — | 过大的单一文件（如 main.tsx 4690行），承担过多职责 |
| **Swarm** | — | 多 Agent 团队协作模式，通过 tmux/iTerm2/in-process 后端实现 |
| **Dream** | — | 自动记忆整合，四阶段（Orient→Gather→Consolidate→Prune） |
| **Teleport** | — | 本地↔远程会话传输，支持 Git Bundle 打包代码上下文 |
| **Worktree** | — | Git worktree 隔离执行模式，每个任务在独立工作树中运行 |
