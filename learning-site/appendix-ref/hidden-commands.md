# 隐藏命令速查

> 26+ 个 `isHidden` 斜杠命令 + 隐藏 CLI 选项

## 隐藏斜杠命令

| 命令 | 功能 | 可见条件 |
|------|------|---------|
| `/advisor` | 设置顾问模型 | 条件隐藏 |
| `/sandbox-toggle` | 切换沙盒 | 隐藏 |
| `/context` | 上下文使用网格 | 隐藏 |
| `/bridge` | Bridge 设置 | 隐藏 |
| `/cost` | 成本显示 | 隐藏 |
| `/passes` | 速率限制通行证 | 隐藏 |
| `/output-style` | 输出样式 | 始终隐藏 |
| `/fast` | 快速模式切换 | 隐藏 |
| `/remote-setup` | 远程环境设置 | 隐藏 |
| `/remote-env` | 配置远程环境 | 隐藏 |
| `/desktop` | 桌面集成 | 隐藏 |
| `/voice` | 语音模式 | 隐藏 |
| `/thinkback-play` | 回放思考过程 | 始终隐藏 |
| `/heapdump` | 堆转储 | 始终隐藏 |
| `/rate-limit-options` | 速率限制选项 | 始终隐藏（ant 专用） |
| `/session` | 会话管理 | 隐藏 |
| `/extra-usage` | 额外使用信息 | 隐藏 |
| `/terminalSetup` | 终端设置 | 条件隐藏 |
| `/dream` | 手动触发 Dream | 条件隐藏 |
| `/stickers` | 订购贴纸 | 条件隐藏 |
| `/btw` | 休闲问答 | 条件隐藏 |
| `/autofix-pr` | 自动修复 PR | 条件隐藏 |
| `/release-notes` | 发布说明 | 条件隐藏 |
| `/insights` | 使用洞察 | 条件隐藏 |
| `/stats` | 统计信息 | 条件隐藏 |
| `/good-claude` | 内部问题报告 | ant 专用 |

## 隐藏 CLI 选项

| 选项 | 功能 |
|------|------|
| `--init` / `--init-only` / `--maintenance` | Hook 触发器 |
| `--debug-to-stderr` | 调试输出到 stderr |
| `--thinking` | 启用思考模式 |
| `--max-thinking-tokens` | 最大思考 token 数 |
| `--max-turns` | 最大对话轮数 |
| `--max-budget-usd` | 最大预算（美元） |
| `--enable-auth-status` | 启用认证状态 |
| `--permission-prompt-tool` | 权限提示工具 |
| `--system-prompt-file` | 系统提示词文件 |
| `--append-system-prompt-file` | 追加系统提示词文件 |
| `--prefill` | 预填充消息 |
| `--deep-link-origin` / `--deep-link-repo` | 深度链接参数 |
| `--resume-session-at` | 恢复会话位置 |
| `--rewind-files` | 回退文件 |
| `--workload` | 工作负载类型 |
| `--advisor` | 顾问模式 |
| `--afk` | 已废弃的 auto 模式别名 |
| `--tasks` | Ant 专用任务观察 |
| `--assistant` | KAIROS 助手模式 |
| `--channels` | 渠道模式 |
| `--agent-id` / `--agent-name` | Agent 标识 |
| `--team-name` | 团队名称 |
| `--agent-color` | Agent 颜色 |
| `--plan-mode-required` | 强制计划模式 |
| `--teammate-mode` | 队友模式 |
| `--sdk-url` | SDK URL |
| `--teleport` | Teleport 模式 |
| `--remote` / `--remote-control` | 远程模式 |
| `--hard-fail` | 硬失败模式 |

## Ant 专用 CLI 入口

| 命令 | 功能 |
|------|------|
| `--daemon-worker` | 守护进程工作器模式 |
| `claude daemon` | 守护进程管理 |
| `claude self-hosted-runner` | 自托管运行器 |
| `--dump-system-prompt` | 转储系统提示词 |
| `claude ps` / `logs` / `attach` / `kill` | 后台会话管理 |
