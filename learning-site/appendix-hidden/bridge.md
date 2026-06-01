# Bridge 远程控制

> 前置知识：[第八章（远程/CCR）](/ch08-interfaces/remote-ccr) -- Bridge 是 CCR (Claude Code Remote) 的核心通信层，理解 CCR 的环境概念有助于理解 Bridge 的设计动机。

**源码位置：** `src/bridge/`（33 个文件）

## 1. 系统概述

Bridge 允许外部工具（claude.ai 网页端、IDE 插件、Agent SDK 等）远程控制 Claude Code 终端会话。它建立在 SSE + WebSocket 双向通信之上，实现了消息转发、权限代理和会话状态同步。Bridge 有两套实现路径（v1 基于 Environments API，v2 直连 Session Ingress），共享消息解析和路由逻辑。

功能门控链：`feature('BRIDGE_MODE')` -> `isClaudeAISubscriber()` -> `tengu_ccr_bridge` GrowthBook 开关 -> 版本检查。

```mermaid
graph TB
    subgraph 外部客户端
        WEB[claude.ai 网页]
        IDE[IDE 插件]
        SDK[Agent SDK]
    end

    subgraph Bridge 核心
        BS[bridgeMain.ts\n环境注册 + 工作轮询]
        BM[bridgeMessaging.ts\n消息解析 + 路由 + 去重]
        BT[ReplBridgeTransport\nSSE + CCRClient]
        RBC[remoteBridgeCore.ts\nv2 env-less 路径]
    end

    subgraph 本地会话
        REPL[REPL 主循环\nQueryEngine]
        SR[SessionRunner\n子进程管理]
        PERM[权限系统\nToolUseConfirm]
    end

    WEB -->|WebSocket/SSE| BT
    IDE -->|WebSocket/SSE| BT
    SDK -->|API| BS
    BS -->|pollForWork| BM
    BM -->|SDKMessage| REPL
    REPL -->|Message| BM
    BM -->|write| BT
    SR -->|stdio| BS
    PERM <-->|control_request/response| BM

    style BS fill:#e1f5fe
    style BM fill:#fff3e0
    style REPL fill:#e8f5e9
```

## 2. 双路径架构

Bridge 存在两套实现路径，由 `tengu_bridge_repl_v2` GrowthBook 开关切换：

```mermaid
flowchart TB
    ENTRY[initReplBridge] --> CHECK{isEnvLessBridgeEnabled?}

    CHECK -->|否: v1 路径| V1[initBridgeCore\n环境 API 路径]
    CHECK -->|是: v2 路径| V2[initEnvLessBridgeCore\n直连会话路径]

    subgraph v1_路径 [v1: 基于 Environments API]
        V1 --> REG1[POST /v1/environments\n注册环境]
        REG1 --> POLL[pollForWork\n长轮询获取任务]
        POLL --> ACK[acknowledgeWork]
        POLL --> HB[heartbeatWork\n续约租约]
        POLL --> DEREG[deregisterEnvironment\n优雅关闭]
    end

    subgraph v2_路径 [v2: Env-less 直连]
        V2 --> CREATE[POST /v1/code/sessions\n创建会话]
        CREATE --> BRIDGE_EP[POST /v1/code/sessions/id/bridge\n获取 worker_jwt]
        BRIDGE_EP --> TRANSPORT[createV2ReplTransport\nSSE + CCRClient]
        TRANSPORT --> REFRESH[createTokenRefreshScheduler\n自动续期 JWT]
    end

    V1 --> SHARED[共享: BridgeMessaging\nhandleIngressMessage\nhandleServerControlRequest]
    V2 --> SHARED

    style CHECK fill:#ffe0b2
    style V1 fill:#bbdefb
    style V2 fill:#c8e6c9
```

### 2.1 v1 vs v2 对比

| 维度 | v1 (Env-based) | v2 (Env-less) |
|------|---------------|---------------|
| 连接流程 | 注册环境 -> 轮询工作 -> 应答 | 创建会话 -> 获取 JWT -> 连接 |
| 生命周期 | register/poll/ack/heartbeat/deregister | 自动管理（JWT 续期） |
| 会话创建 | 依赖 Environments API 派发 | 直接 POST /v1/code/sessions |
| 认证方式 | EnvironmentSecret + SessionToken | OAuth -> worker_jwt |
| 适用场景 | daemon/print 路径 | REPL 路径 |
| 版本门控 | 默认 | `tengu_bridge_repl_v2` |

v2 移除了 Environments API 的中间层。服务器端 PR #292605 新增 `/bridge` 端点，直接完成 OAuth -> worker_jwt 交换，无需环境注册/轮询/心跳/注销的全套生命周期。`/bridge` 每次调用会 bump epoch，等效于注册。

## 3. 消息协议

### 3.1 消息类型判定

BridgeMessaging 中定义了三级消息类型守卫：

```typescript
// bridgeMessaging.ts -- 消息类型判定优先级
// 1. control_response (不是 SDKMessage，优先检查)
isSDKControlResponse(value)  // type === 'control_response' && 'response' in value

// 2. control_request (服务器发起的控制请求)
isSDKControlRequest(value)   // type === 'control_request' && 'request_id' in value

// 3. SDKMessage (常规用户/助手消息)
isSDKMessage(value)          // type 是 string 的对象
```

### 3.2 控制请求子类型

| subtype | 方向 | 用途 | 需要响应 |
|---------|------|------|---------|
| `initialize` | 服务器 -> 客户端 | 会话初始化，交换能力声明 | 必须（否则服务器杀连接 ~10-14s） |
| `set_model` | 服务器 -> 客户端 | 远程切换模型 | 是 |
| `set_max_thinking_tokens` | 服务器 -> 客户端 | 调整思考 token 上限 | 是 |
| `set_permission_mode` | 服务器 -> 客户端 | 切换权限模式（需本地验证） | 是（可能返回 error） |
| `interrupt` | 服务器 -> 客户端 | 中断当前生成 | 是 |
| `can_use_tool` | 客户端 -> 服务器 | 权限审批请求 | 服务器回传 control_response |

### 3.3 出站消息过滤

不是所有内部 Message 都应该转发到 Bridge。`isEligibleBridgeMessage` 实现过滤：

| 消息类型 | 是否转发 | 原因 |
|---------|---------|------|
| `user` (非虚拟) | 是 | 用户输入 |
| `assistant` (非虚拟) | 是 | 模型输出 |
| `system` + `subtype=local_command` | 是 | 斜杠命令事件 |
| `user` / `assistant` (isVirtual) | 否 | REPL 内部调用，bridge 消费者看到工具调用的汇总 |
| `tool_result`、`progress` 等 | 否 | REPL 内部通信 |

### 3.4 入站消息路由流程

```mermaid
sequenceDiagram
    participant Server as CCR Server
    participant Transport as ReplBridgeTransport
    participant Messaging as BridgeMessaging
    participant REPL as REPL

    Server->>Transport: WebSocket/SSE 帧
    Transport->>Messaging: handleIngressMessage(data, ...)
    Messaging->>Messaging: normalizeControlMessageKeys + jsonParse

    alt control_response
        Messaging->>REPL: onPermissionResponse(response)
    else control_request
        Messaging->>Messaging: handleServerControlRequest
        Messaging->>Server: control_response (必须回应)
    else SDKMessage (type=user)
        Messaging->>Messaging: UUID echo 去重
        Messaging->>Messaging: UUID re-delivery 去重
        Messaging->>REPL: onInboundMessage(msg)
    else 其他 SDKMessage
        Messaging->>Messaging: 忽略非 user 入站
    end
```

## 4. 连接状态机

```mermaid
stateDiagram-v2
    [*] --> Ready: Bridge 初始化
    Ready --> Connecting: 开始注册/连接
    Connecting --> Connected: 连接成功
    Connected --> Reconnecting: 连接断开
    Reconnecting --> Connected: 重连成功\n恢复 sequence number
    Reconnecting --> Failed: 重连超时/不可恢复
    Connected --> Failed: Fatal error
    Failed --> Ready: 手动重试

    state Connected {
        [*] --> Idle: 等待工作
        Idle --> Attached: 收到工作项/会话启动
        Attached --> Idle: 会话完成
        Attached --> Attached: 多会话并发
    }
```

### 4.1 状态类型

```typescript
// replBridge.ts
export type BridgeState = 'ready' | 'connected' | 'reconnecting' | 'failed'
```

### 4.2 重连与序列号恢复

重连时使用 `from_sequence_num` 参数告诉服务器从哪个序列号开始重放：

```mermaid
flowchart TB
    A[连接断开] --> B[记录 lastTransportSequenceNum]
    B --> C[进入 reconnecting 状态]
    C --> D[指数退避等待]
    D --> E{重连尝试}
    E -->|成功| F["重建 transport\nfrom_sequence_num = lastSeq"]
    E -->|失败| G{超过最大重试?}
    G -->|否| D
    G -->|是| H[进入 failed 状态]
    F --> I["重新 flush 消息\n(FlushGate)"]
    I --> J[回到 connected]
    J --> K[logReconnected: 记录断开时长]
```

`BoundedUUIDSet` 作为二级去重防护，处理序列号协商失败的边缘情况（服务器忽略 `from_sequence_num`、transport 在收到首帧前死亡等）。

## 5. Echo 去重机制

Bridge 使用 `BoundedUUIDSet` 防止消息回声和重复投递：

```mermaid
flowchart LR
    subgraph 出站
        A[发送消息] --> B["记录 UUID\nrecentPostedUUIDs"]
    end

    subgraph 入站
        C[收到消息] --> D{UUID in\nrecentPostedUUIDs?}
        D -->|是| E[忽略: echo 回声]
        D -->|否| F{UUID in\nrecentInboundUUIDs?}
        F -->|是| G[忽略: 重复投递]
        F -->|否| H[正常处理\n加入 recentInboundUUIDs]
    end
```

`BoundedUUIDSet` 实现细节（`bridgeMessaging.ts`）：

| 属性 | 值 | 说明 |
|------|-----|------|
| 数据结构 | 环形缓冲区 + Set | O(1) 查找 + O(1) 淘汰 |
| 容量 | 固定 | 内存使用恒定 O(capacity) |
| 淘汰策略 | FIFO | 按时间顺序淘汰最旧 |
| 线程安全 | 单线程 | Node.js 事件循环保证 |

## 6. 会话管理

### 6.1 Spawn 模式

`SpawnMode` 决定远程会话的工作目录策略：

| 模式 | 说明 | 隔离级别 | 适用场景 |
|------|------|---------|---------|
| `single-session` | 单会话 cwd，会话结束 Bridge 拆除 | 无 | 简单任务 |
| `worktree` | 每会话独立 git worktree | git 级别 | 并行开发 |
| `same-dir` | 所有会话共享 cwd | 无（可能冲突） | 轻量操作 |

### 6.2 SessionRunner

`SessionRunner` 管理子进程级别的 Claude Code 会话：

```mermaid
flowchart TB
    A[pollForWork 返回 WorkResponse] --> B[decodeWorkSecret]
    B --> C["buildSdkUrl / buildCCRv2SdkUrl"]
    C --> D[SessionSpawner.spawn]
    D --> E["子进程\nclaude --sdk-url ..."]

    E --> F[SessionHandle]

    subgraph SessionHandle 接口
        F --> G["activities: 环形缓冲区\n(最近 10 条)"]
        F --> H["done: Promise&lt;SessionDoneStatus&gt;"]
        F --> I["kill / forceKill"]
        F --> J["writeStdin"]
        F --> K["updateAccessToken\ntoken 刷新"]
        F --> L["lastStderr: 环形缓冲区\n(最近 10 行)"]
    end

    subgraph 权限代理
        E -->|stdout: can_use_tool| M[PermissionRequest]
        M -->|转发到 CCR 服务器| N[用户审批]
        N -->|control_response| E
    end
```

### 6.3 WorkSecret 解码

WorkSecret 包含连接子进程所需的全部凭据：

```typescript
// types.ts
type WorkSecret = {
  version: number
  session_ingress_token: string     // 入站认证 token
  api_base_url: string              // API 基地址
  sources: Array<{                  // 代码源信息
    type: string
    git_info?: { type, repo, ref?, token? }
  }>
  auth: Array<{ type, token }>      // 认证凭据
  claude_code_args?: Record<string, string>  // CLI 参数
  mcp_config?: unknown             // MCP 服务器配置
  environment_variables?: Record<string, string>  // 环境变量
  use_code_sessions?: boolean       // CCR v2 选择器
}
```

### 6.4 权限代理流程

```mermaid
sequenceDiagram
    participant Child as 子进程 Session
    participant Runner as SessionRunner
    participant Bridge as BridgeMain
    participant Server as CCR Server
    participant User as claude.ai 用户

    Child->>Runner: stdout: control_request(can_use_tool)
    Runner->>Bridge: onPermissionRequest(sessionId, request, accessToken)
    Bridge->>Server: sendPermissionResponseEvent 或 转发
    Server->>User: 显示权限对话框
    User->>Server: 批准/拒绝
    Server->>Bridge: control_response
    Bridge->>Child: 传递审批结果
```

子进程通过 stdout 输出 `control_request`，Bridge 将其转发到 CCR 服务器。用户在 claude.ai 网页审批，结果通过 `control_response` 回传。

## 7. Outbound-Only 模式

Bridge 支持 outbound-only 模式，仅转发事件到服务器，拒绝所有入站控制请求：

```typescript
// bridgeMessaging.ts
if (outboundOnly && request.request.subtype !== 'initialize') {
  // 回复 error，而非 false-success
  response = {
    type: 'control_response',
    response: { subtype: 'error', request_id, error: OUTBOUND_ONLY_ERROR }
  }
}
```

`initialize` 必须回复 success（否则服务器杀连接），其余可变请求（interrupt、set_model、set_permission_mode、set_max_thinking_tokens）均返回 error。这确保 claude.ai 不会显示"操作成功但本地无反应"的假象。

## 8. 功能门控链

Bridge 的启用需要通过多层门控（`bridgeEnabled.ts`）：

```mermaid
flowchart TB
    A["feature('BRIDGE_MODE')\n编译期门控"] -->|通过| B{isClaudeAISubscriber?}
    B -->|否| C["不可用: 需 claude.ai 订阅\n(排除 Bedrock/Vertex/Foundry/apiKeyHelper)"]
    B -->|是| D{hasProfileScope?}
    D -->|否| E["不可用: 需完整 scope token\n(setup-token 和 env var token 不够)"]
    D -->|是| F{organizationUuid 存在?}
    F -->|否| G["不可用: 需重新登录刷新账户信息"]
    F -->|是| H{"tengu_ccr_bridge\nGrowthBook 开关?"}
    H -->|否| I[不可用: 账户未开通]
    H -->|是| J{checkBridgeMinVersion?}
    J -->|版本过低| K["不可用: 需更新到 minVersion"]
    J -->|通过| L[Bridge 启用]

    style A fill:#e1f5fe
    style L fill:#c8e6c9
```

### 8.1 诊断 API

`getBridgeDisabledReason()` 提供逐步诊断，替代简单的 boolean 检查：

| 返回值 | 含义 |
|-------|------|
| `null` | Bridge 可用 |
| "requires a claude.ai subscription" | 非 claude.ai 订阅者 |
| "requires a full-scope login token" | 使用了 setup-token/env-var 令牌 |
| "Unable to determine your organization" | 缺少 organizationUuid |
| "not yet enabled for your account" | GrowthBook 开关关闭 |

### 8.2 CCR 自动连接

`getCcrAutoConnectDefault()` 在满足两个条件时默认连接 CCR：
1. `feature('CCR_AUTO_CONNECT')` 编译期标志（ant-only）
2. `tengu_cobalt_harbor` GrowthBook 开关

用户可通过 `remoteControlAtStartup: false` 显式关闭（显式设置优先于默认值）。

### 8.3 CCR Mirror 模式

`isCcrMirrorEnabled()` 控制镜像模式：每个本地会话额外生成一个 outbound-only 远程会话，将本地事件镜像到 claude.ai。独立于双向 Remote Control。

## 9. Transport 层

### 9.1 Transport 接口

```typescript
// replBridgeTransport.ts
export type ReplBridgeTransport = {
  write(event: object): Promise<void>  // 发送消息到服务器
  onMessage(handler: (data: string) => void): void  // 接收服务器消息
  close(): Promise<void>  // 关闭连接
}
```

### 9.2 V1 vs V2 Transport

| 维度 | V1 Transport | V2 Transport |
|------|-------------|-------------|
| 创建函数 | `createV1ReplTransport` | `createV2ReplTransport` |
| 认证 | environment_id + environment_secret | worker_jwt + worker_epoch |
| 协议 | HybridTransport (SSE + WS) | SSE + CCRClient |
| 序列号 | SSE `from_sequence_num` | SSE `from_sequence_num` |

### 9.3 HybridTransport

`HybridTransport`（`src/cli/transports/HybridTransport.ts`）组合 SSE（入站推送）和 WebSocket（出站发送），实现全双工通信：

```mermaid
flowchart LR
    subgraph HybridTransport
        SSE["SSE 连接\n服务器 -> 客户端"]
        WS["WebSocket\n客户端 -> 服务器"]
    end

    SSE -->|入站 SDKMessage| HANDLER[消息处理器]
    HANDLER -->|出站 SDKMessage| WS

    SSE -->|"from_sequence_num\n断线恢复"| SEQ[序列号跟踪]
    SEQ -->|重连时携带| SSE
```

## 10. FlushGate 与容量信号

### 10.1 FlushGate

`FlushGate` 控制消息刷入时机，防止在 transport 未就绪时发送消息：

- transport 连接建立前：消息排队等待
- transport 就绪后：一次性刷入排队的消息
- 重连期间：新消息排队，重连后刷入

### 10.2 CapacityWake

`CapacityWake` 在环境容量变化时唤醒等待的工作分配：

```typescript
// capacityWake.ts
export type CapacitySignal = 'available' | 'full'
```

当环境从满载变为可用时，触发新一轮 pollForWork。

## 11. 安全机制

| 机制 | 实现文件 | 说明 |
|------|---------|------|
| JWT 认证 | `jwtUtils.ts` | worker_jwt 限时有效，自动续期 |
| 环境密钥 | `workSecret.ts` | environment_secret 服务端签发 |
| Outbound-only | `bridgeMessaging.ts` | 拒绝入站控制，返回明确 error |
| 版本最低要求 | `bridgeEnabled.ts` | `tengu_bridge_min_version` |
| 可信设备令牌 | `trustedDevice.ts` | 设备级信任验证 |
| Webhook 清理 | `webhookSanitizer.ts` | 清理 webhook 载荷中的 PII |
| Session ID 兼容 | `sessionIdCompat.ts` | `cse_*` -> `session_*` 标签映射 |

## 12. 关键源文件

| 文件 | 职责 |
|------|------|
| `src/bridge/bridgeMain.ts` | 核心：环境注册、工作轮询、会话生成、消息路由、重连逻辑 |
| `src/bridge/bridgeMessaging.ts` | 共享：消息解析、入站路由、控制请求处理、UUID 去重、FlushGate |
| `src/bridge/types.ts` | 类型定义：BridgeConfig、SessionHandle、WorkResponse、SpawnMode 等 |
| `src/bridge/replBridge.ts` | REPL 包装：初始化 Bridge、注入 REPL 依赖、选择 v1/v2 路径 |
| `src/bridge/remoteBridgeCore.ts` | v2 路径：env-less 直连，JWT 续期，401 恢复 |
| `src/bridge/bridgeEnabled.ts` | 功能门控：订阅验证、scope 检查、版本检查、开关判定 |
| `src/bridge/sessionRunner.ts` | 子进程管理：生成、监控、权限代理、活动追踪 |
| `src/bridge/replBridgeTransport.ts` | Transport 抽象：V1/V2 工厂函数 |
| `src/bridge/workSecret.ts` | WorkSecret 解码、SDK URL 构建 |
| `src/bridge/bridgeApi.ts` | API 客户端：环境 CRUD、工作轮询、故障注入 |
| `src/bridge/jwtUtils.ts` | JWT 刷新调度器：proactive refresh、401 recovery |
| `src/bridge/envLessBridgeConfig.ts` | v2 配置：minVersion 检查 |
| `src/bridge/flushGate.ts` | 消息刷入控制 |
| `src/bridge/capacityWake.ts` | 容量信号管理 |
| `src/bridge/inboundMessages.ts` | 入站消息处理与附件解析 |
| `src/bridge/inboundAttachments.ts` | 入站附件解析 |
| `src/bridge/bridgeDebug.ts` | 调试：故障注入、debug handle |
| `src/bridge/debugUtils.ts` | 调试工具：错误描述、HTTP 状态提取 |
| `src/bridge/sessionIdCompat.ts` | Session ID 格式兼容：`cse_*` <-> `session_*` |
| `src/bridge/webhookSanitizer.ts` | Webhook 载荷 PII 清理 |
| `src/bridge/trustedDevice.ts` | 可信设备令牌获取 |
| `src/bridge/pollConfig.ts` | 轮询配置传递 |
| `src/bridge/pollConfigDefaults.ts` | 默认轮询间隔配置 |
| `src/bridge/bridgePermissionCallbacks.ts` | 权限回调注册 |
| `src/bridge/bridgePointer.ts` | Bridge 实例指针 |
| `src/bridge/bridgeConfig.ts` | Bridge 配置构建 |
| `src/bridge/bridgeStatusUtil.ts` | 状态显示工具 |
| `src/bridge/bridgeUI.ts` | Bridge UI 组件 |
| `src/bridge/codeSessionApi.ts` | Code Session API 客户端 |
| `src/bridge/createSession.ts` | 会话创建逻辑 |
| `src/bridge/peerSessions.ts` | 对等会话管理 |

<div class="chapter-nav-hint">

**下一节：[Coordinator 多Agent编排 ->](/appendix-hidden/coordinator)**

</div>
