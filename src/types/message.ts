// ============================================================================
// 消息类型定义 — Claude Code 的"通用语言"
// ============================================================================
//
// 整个系统的交互都通过消息流转。本文件定义了消息的数据骨架：
//   - MessageOrigin:  消息来源标记（人类/后台任务/协调器/通道）
//   - MessageBase:    所有消息共享的基础字段（UUID链、时间戳、可见性标志）
//   - 9 种消息类型:   组成 Message 联合类型
//   - 16 种子类型:    细化 SystemMessage 的具体语义
//   - 6 个辅助类型:   流事件、Hook信息、压缩元数据等
//   - 3 组类型别名:   NormalizedMessage、RenderableMessage、CollapsibleMessage
//
// 核心设计决策：
//   1. uuid + parentUuid 构成链表 — 完整的对话拓扑
//   2. isMeta（对用户隐藏/对模型可见）vs isVirtual（对用户可见/对模型隐藏）— 对称的可见性控制
//   3. 索引签名 [key: string]: unknown — 允许子系统附加私有字段而不修改基础类型
//   4. SystemMessage 子类型在类型层面多为别名，运行时通过 subtype 字段区分
//
// 详见学习站点: learning-site/ch01-foundation/message-types.md
// ============================================================================

// 消息来源标记
// kind 标识消息的来源类型，索引签名允许携带来源特定的附加数据
// 运行时 kind 取值:
//   undefined       — 人类键盘输入（默认）
//   'task-notification' — 后台 Agent 完成了任务
//   'coordinator'       — Swarm 协调器发来的消息
//   'channel'           — MCP 通道消息（携带 server 键标识服务器名）
export type MessageOrigin = {
  kind?: string
  [key: string]: unknown
}

// 所有消息共享的基础字段
// 所有字段均为可选 + 索引签名允许扩展
export type MessageBase = {
  // 消息唯一标识，由 crypto.randomUUID() 生成
  // 拆分多块消息时通过 deriveUUID(parentUUID, index) 确定性派生
  uuid?: string

  // 父消息 UUID，构成链表结构
  // 不是在消息创建时设置，而是由 insertMessageChain() 在写入存储时赋值
  // 压缩边界的 parentUuid 设为 null（逻辑父保存在 logicalParentUuid）
  // tool_result 的 parentUuid 指向对应的 assistant 消息（sourceToolAssistantUUID）
  parentUuid?: string

  // ISO 8601 时间戳，由 new Date().toISOString() 生成
  // createUserMessage 中可覆盖，其余工厂始终使用当前时间
  timestamp?: string

  // 遗留字段 — 定义了但从未在消息对象上使用
  // 该字段出现在其他领域对象上（cron任务、服务端类型、团队条目），
  // 但在消息类型中是残留，无代码设置它
  createdAt?: string

  // "对模型可见，对用户隐藏"标志
  // true = 这条消息发送给API但在UI中隐藏
  // 用于: system-reminder注入、工具引用、记忆上下文、诊断信息、IDE文件信息等
  // UI过滤: VirtualMessageList返回null、Messages.tsx过滤、MessageSelector排除
  // 注意: normalizeMessagesForAPI 不过滤meta消息（它们会发给模型）
  //        只有 isVirtual 消息才被API过滤
  isMeta?: boolean

  // "对用户可见，对模型隐藏"标志 — 与 isMeta 恰好相反
  // true = 这条消息在UI中显示但永远不会发送到API
  // 用于: REPL内部工具调用对（需在终端显示进度，但不作为API对话历史）
  // API过滤: normalizeMessagesForAPI 显式过滤 virtual 消息
  // 持久化: transformMessagesForExternalTranscript 将虚拟消息提升为真实消息
  //         （移除isVirtual字段），恢复会话时解包为原生工具调用
  isVirtual?: boolean

  // 压缩摘要标记
  // 仅在三处设为true: compact.ts完整压缩(621)、部分压缩(1034)、
  //                   sessionMemoryCompact.ts(479)
  // 总是与 isVisibleInTranscriptOnly: true 一起设置
  // 消费: SDK回放跳过计数、标题提取排除、便携式转录跳过、
  //       会话恢复排除、AwaySummary统计排除
  isCompactSummary?: boolean

  // 工具执行的结构化输出 — 形状取决于工具的 Output 泛型
  // 区分"真实用户消息"和"工具结果": m.toolUseResult === undefined 为真实用户消息
  // SDK输出映射为 { tool_use_result: message.toolUseResult }
  toolUseResult?: unknown

  // 消息来源 — 详见 MessageOrigin
  origin?: MessageOrigin

  // 索引签名 — 类型层面的"逃生舱口"
  // 允许子系统附加私有字段而不修改基础类型
  // 实际使用的额外字段: isVisibleInTranscriptOnly, sourceToolAssistantUUID,
  //   summarizeMetadata, permissionMode, mcpMeta, imagePasteIds 等
  [key: string]: unknown
}

// 文件附件消息 — 标记用户附加的文件
// path 是文件路径，内容在发送给API前被读取并转换为内容块
export type AttachmentMessage = MessageBase & {
  type: 'attachment'
  path?: string
}

// 用户消息 — 用户输入或工具执行结果
// message.content 两种形态:
//   1. string — 简单文本输入
//   2. ContentBlockParam[] — 结构化内容块数组:
//      { type: 'text', text } / { type: 'image', source } /
//      { type: 'tool_result', tool_use_id, content, is_error? } /
//      { type: 'document', ... }
// 当 content 包含 tool_result 块时，这是工具执行结果回传（非人类输入），
// 但 type 仍为 'user'（Anthropic API 中工具结果属于 user 角色）
// 工厂函数: createUserMessage() (messages.ts:460)
export type UserMessage = MessageBase & {
  type: 'user'
  message: {
    content: string | Array<{ type: string; text?: string; [key: string]: unknown }>
    [key: string]: unknown
  }
}

// 助手消息 — 模型的响应
// message 字段是 API 响应信封，包含:
//   id, model, role, stop_reason, usage, content 等
// 合成消息使用 SYNTHETIC_MODEL = '<synthetic>' 标识（非API调用产生）
// 工厂函数: createAssistantMessage() (messages.ts:411)
//          baseCreateAssistantMessage() (messages.ts:355)
//          createAssistantAPIErrorMessage() (messages.ts:435)
export type AssistantMessage = MessageBase & {
  type: 'assistant'
  message?: {
    content?: unknown
    [key: string]: unknown
  }
}

// 进度消息 — 流式API调用期间的进度更新
// progress 字段形状取决于进度来源
// 注意: isChainParticipant 对 progress 返回 false，不参与 parentUuid 链
// 工厂函数: createProgressMessage() (messages.ts:617)
export type ProgressMessage = MessageBase & {
  type: 'progress'
  progress?: unknown
}

// 系统消息严重程度
// 除了 info/warning/error 外，string 联合成员允许自定义级别
export type SystemMessageLevel = 'info' | 'warning' | 'error' | string

// 系统消息 — 系统级通知，拥有最丰富的子类型
// subtype 区分具体类型（见下方16个子类型 + 运行时额外子类型）
// level 控制严重程度
// message 为人类可读文本
// 子类型在类型层面多为 SystemMessage 的别名，
// 运行时通过工厂函数赋予正确的 subtype 值
export type SystemMessage = MessageBase & {
  type: 'system'
  subtype?: string
  level?: SystemMessageLevel
  message?: string
}

// ---- 16 个 SystemMessage 命名子类型 ----
// 只有 SystemLocalCommandMessage 强制了 subtype 值，
// SystemAPIErrorMessage 添加了 error 字段，
// 其余只是 SystemMessage 的类型别名（运行时通过工厂函数区分）

// 斜杠命令输入/输出 — UI 渲染为 UserTextMessage
export type SystemLocalCommandMessage = SystemMessage & {
  subtype: 'local_command'
}

// 远程控制激活状态 — UI: BridgeStatusMessage 组件
export type SystemBridgeStatusMessage = SystemMessage

// 轮次计时信息 — UI: TurnDurationMessage 组件
export type SystemTurnDurationMessage = SystemMessage

// 思考块展示 — UI: 返回 null（隐藏）
export type SystemThinkingMessage = SystemMessage

// 记忆文件被写入 — UI: MemorySavedMessage 组件
export type SystemMemorySavedMessage = SystemMessage

// 停止 Hook 结果摘要 — UI: StopHookSummaryMessage 组件
export type SystemStopHookSummaryMessage = SystemMessage

// 一般信息（工具元数据等）— UI: 按 level 着色
export type SystemInformationalMessage = SystemMessage

// 完整压缩边界标记 — UI: CompactBoundaryMessage 组件（全屏时隐藏）
// 携带 CompactMetadata: trigger, preTokens, messagesSummarized, preservedSegment 等
export type SystemCompactBoundaryMessage = SystemMessage

// 微压缩边界标记 — UI: 返回 null（不展示）
export type SystemMicrocompactBoundaryMessage = SystemMessage

// 权限被授予后的通知 — UI: "Allowed" + 加粗命令名
export type SystemPermissionRetryMessage = SystemMessage

// 定时任务触发 — UI: 泪滴星号 + 暗色内容
export type SystemScheduledTaskFireMessage = SystemMessage

// 离开期间的摘要 — UI: 暗色文本 + 参考标记图标
export type SystemAwaySummaryMessage = SystemMessage

// 后台 Agent 被停止 — UI: "All background agents stopped" + 黑色圆圈
export type SystemAgentsKilledMessage = SystemMessage

// API 性能指标 — UI: Messages.tsx 中被过滤（不展示）
export type SystemApiMetricsMessage = SystemMessage

// API 错误（含重试信息）— UI: SystemAPIErrorMessage 组件
export type SystemAPIErrorMessage = SystemMessage & { error?: string }

// 计划文件快照 — plans.ts:381 创建，无专用工厂
export type SystemFileSnapshotMessage = SystemMessage

// Hook 执行结果消息
// 无专用工厂函数，由 Hook 执行引擎内部构造
// HookResult.message 字段类型为 HookResultMessage?
// 创建: sessionStart.ts 的 processSessionStartHooks/processSetupHooks 返回 HookResultMessage[]
// 消费: useDeferredHookMessages.ts、compact.ts、sessionMemoryCompact.ts
export type HookResultMessage = MessageBase & {
  type: 'hook_result'
}

// 工具使用摘要消息
// 运行时形状: { type: 'tool_use_summary', summary: string, precedingToolUseIds: string[] }
// 创建: query.ts:1477 一批工具调用完成后
// 消费: handleMessageFromStream 忽略（仅用于SDK）、QueryEngine 向 SDK 输出
export type ToolUseSummaryMessage = MessageBase & {
  type: 'tool_use_summary'
}

// 墓碑消息 — 标记需要移除的孤立消息
// 创建场景: 流式API调用中途失败(streamingFallbackOccured)时，
//   已产生的部分助手消息包含不完整thinking块，
//   保留它们会导致后续API调用"thinking blocks cannot be modified"错误
// 创建位置: query.ts:717
// 消费: handleMessageFromStream 调用 onTombstone?.() 移除目标消息
// 名字由来: 分布式系统经典模式——在已删除数据位置放标记，让其他系统感知删除
export type TombstoneMessage = MessageBase & {
  type: 'tombstone'
}

// 流式事件包装 — 包装 Anthropic API 流事件并附加会话元数据
// 运行时形状: { type: 'stream_event', event, session_id, parent_tool_use_id, uuid }
// 包装的事件: content_block_start/delta, message_start/stop 等
export type StreamEvent = {
  type?: string
  [key: string]: unknown
}

// 请求开始信号 — StreamEvent 的别名
// 运行时形状: { type: 'stream_request_start' }
// 消费: handleMessageFromStream 收到后将 spinner 设为 'requesting'
export type RequestStartEvent = StreamEvent

// 停止 Hook 信息
// 运行时形状: { command: string, promptText?: string, durationMs?: number }
// 创建: stopHooks.ts:210, toolExecution.ts:798,1481
// 消费: createStopHookSummaryMessage, collapseReadSearch
export type StopHookInfo = {
  [key: string]: unknown
}

// 压缩元数据
// 运行时形状:
//   {
//     trigger: 'manual' | 'auto',
//     preTokens: number,
//     userContext?: string,
//     messagesSummarized?: number,
//     preCompactDiscoveredTools?: string[],
//     preservedSegment?: { headUuid, anchorUuid, tailUuid },  // 压缩中幸存的消息段
//   }
// preservedSegment 防止重复压缩幸存的消息
// mappers.ts 中 toSDKCompactMetadata/fromSDKCompactMetadata 做 camelCase ↔ snake_case 转换
export type CompactMetadata = {
  [key: string]: unknown
}

// 部分压缩方向
// 注意: 类型声明与运行时不匹配！
//   声明: 'older' | 'newer' | 'both'
//   实际: 'from'（压缩pivot之后的旧消息）、'up_to'（压缩pivot之前的新消息）
// string 联合成员允许这种不一致
// compact.ts:778 默认值: direction = 'from'
export type PartialCompactDirection = 'older' | 'newer' | 'both' | string

// 折叠的读/搜操作组 — 将连续的 Read/Grep/Glob 操作折叠为一组以减少UI噪音
// 运行时形状（collapseReadSearch.ts:663 createCollapsedGroup）:
//   {
//     type: 'collapsed_read_search',
//     searchCount, readCount, listCount, replCount: 0,
//     memorySearchCount, memoryReadCount, memoryWriteCount,
//     readFilePaths: string[], searchArgs: SearchArgInfo[],
//     latestDisplayHint?, messages: Message[], displayMessage: Message,
//     uuid: `collapsed-${firstMsg.uuid}`, timestamp,
//     // 可选字段（feature-gated或条件性）:
//     teamMemory*Count?, mcpCallCount?, mcpServerNames?,
//     bashCount?, gitOpBashCount?, commits?, pushes?, branches?, prs?,
//     hookTotalMs?, hookCount?, hookInfos?, relevantMemories?,
//   }
export type CollapsedReadSearchGroup = {
  [key: string]: unknown
}

// 分组工具调用消息 — 将同一API响应中同类型的多个工具调用折叠展示
// 分组逻辑（groupToolUses.ts applyGrouping）:
//   1. 按 messageId:toolName 分组
//   2. 只有定义了 renderGroupedToolUse 属性的工具参与
//   3. 2个以上同组工具才形成有效分组
//   4. verbose 模式跳过分组
// 运行时形状:
//   { type: 'grouped_tool_use', toolName, messages: NormalizedAssistantMessage[],
//     results: NormalizedUserMessage[], displayMessage, uuid: `grouped-${first}`,
//     timestamp, messageId }
// 消费: collapseReadSearch.ts, Message.tsx, messageActions.tsx
export type GroupedToolUseMessage = MessageBase & {
  type: 'grouped_tool_use'
}

// 可折叠消息 — MessageBase 的语义别名，表示可被折叠操作处理的消息
export type CollapsibleMessage = MessageBase

// 标准化后的助手消息 — AssistantMessage 的别名
export type NormalizedAssistantMessage = AssistantMessage

// 标准化后的用户消息 — UserMessage 的别名
export type NormalizedUserMessage = UserMessage

// 标准化消息 — Message 的子集
// 排除了 HookResultMessage、ToolUseSummaryMessage、TombstoneMessage、GroupedToolUseMessage
// 原因: 这4种是"元消息"，不参与核心对话流
//   HookResult/ToolUseSummary — SDK/内部通信
//   Tombstone — 删除标记
//   GroupedToolUse — UI折叠产物
//
// normalizeMessages() (messages.ts:731) 做了4件事:
//   1. 拆分多块消息: 助手消息有多个content block时拆分为单块消息
//   2. 转换字符串内容: user的string content → [{ type: 'text', text }]
//   3. 派生新UUID: deriveUUID(parentUUID, index) 保证确定性
//   4. 保留所有字段: isMeta/isVirtual/timestamp/origin等完整传递
export type NormalizedMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | ProgressMessage
  | SystemMessage
  | AttachmentMessage

// 可渲染消息 — Message 的语义别名，强调"可以被UI渲染的消息"
export type RenderableMessage = Message

// 消息联合类型 — 整个系统最核心的类型
// 几乎每个子系统都接收或产出 Message
export type Message =
  | UserMessage
  | AssistantMessage
  | ProgressMessage
  | SystemMessage
  | AttachmentMessage
  | HookResultMessage
  | ToolUseSummaryMessage
  | TombstoneMessage
  | GroupedToolUseMessage
