/**
 * ============================================================
 * 【文件整体说明 - 初学者友好版】
 * ============================================================
 *
 * 这个文件是 Claude Code 的【初始化入口】。
 *
 * 简单来说：当你启动 Claude Code 的时候，需要做很多"准备工作"，
 * 比如读取配置、设置网络、连接服务器等等。
 * 这个文件就是负责把这些准备工作按顺序组织起来的"总调度"。
 *
 * 它主要做了这些事：
 *   1. init() 函数 —— 主初始化流程，用 memoize 包装确保只执行一次：
 *      - 启用配置系统（读取你的设置）
 *      - 应用安全的环境变量
 *      - 设置优雅退出（程序关闭时做好清理）
 *      - 初始化事件日志（记录使用数据）
 *      - 配置网络代理和加密证书
 *      - 预连接 Anthropic API（提前建好网络连接，省时间）
 *      - 注册各种清理任务
 *      - 处理配置错误（弹出友好的错误提示框）
 *
 *   2. initializeTelemetryAfterTrust() 函数 —— 在用户信任后初始化遥测（数据采集）
 *      - 需要等远程设置加载完才初始化
 *      - 对没有远程设置的用户直接初始化
 *
 *   3. doInitializeTelemetry() 和 setMeterState() —— 实际执行遥测初始化
 *      - 用"懒加载"方式加载 OpenTelemetry 模块（省内存）
 *      - 创建计数器，用来统计各种指标
 *
 * 调用关系：
 *   - 这个文件被主入口（main.tsx / cli.tsx）调用
 *   - 它反过来调用了十几个工具模块和服务模块
 *   - init() 在程序启动时调用一次
 *   - initializeTelemetryAfterTrust() 在用户接受信任对话框后调用
 *
 * 设计意图：
 *   - 用 memoize 确保 init() 只跑一次，不会重复初始化
 *   - 把大型模块（OpenTelemetry 等）用动态 import 延迟加载，加快启动速度
 *   - 各初始化步骤用 profileCheckpoint 标记，方便性能分析
 * ============================================================
 */

// 以下为源码，只新增注释，不修改任何原有代码和注释

// 导入性能分析的检查点函数，用来标记初始化各阶段的时间点
import { profileCheckpoint } from '../utils/startupProfiler.js'

// 导入全局状态模块，这行代码会在模块加载时执行其中的副作用代码
import '../bootstrap/state.js'

// 导入配置工具模块，这行代码会在模块加载时执行其中的副作用代码
import '../utils/config.js'

// 从 OpenTelemetry API 中导入"属性"和"指标选项"两个类型，用于遥测数据的类型标注
import type { Attributes, MetricOptions } from '@opentelemetry/api'

// 导入 lodash 的 memoize 函数，它可以让一个函数只执行一次，后续调用直接返回缓存结果
import memoize from 'lodash-es/memoize.js'

// 从全局状态模块导入"是否为非交互式会话"的判断函数
import { getIsNonInteractiveSession } from 'src/bootstrap/state.js'

// 从全局状态模块导入"带属性的计数器"类型定义
import type { AttributedCounter } from '../bootstrap/state.js'

// 从全局状态模块导入"获取会话计数器"和"设置计量器"两个函数
import { getSessionCounter, setMeter } from '../bootstrap/state.js'

// 导入 LSP 服务器管理器的关闭函数，用于程序退出时清理 LSP 服务
import { shutdownLspServerManager } from '../services/lsp/manager.js'

// 导入 OAuth 账号信息填充函数，用于确保 OAuth 登录信息已缓存
import { populateOAuthAccountInfoIfNeeded } from '../services/oauth/client.js'

// 导入策略限制相关的两个函数：初始化加载 Promise 和判断是否符合条件
import {
  initializePolicyLimitsLoadingPromise,
  isPolicyLimitsEligible,
} from '../services/policyLimits/index.js'

// 导入远程托管设置相关的三个函数：初始化加载 Promise、判断是否符合条件、等待加载完成
import {
  initializeRemoteManagedSettingsLoadingPromise,
  isEligibleForRemoteManagedSettings,
  waitForRemoteManagedSettingsToLoad,
} from '../services/remoteManagedSettings/index.js'

// 导入 Anthropic API 预连接函数，提前建立网络连接以减少延迟
import { preconnectAnthropicApi } from '../utils/apiPreconnect.js'

// 导入额外 CA 证书的应用函数，确保自定义证书在 TLS 连接前被加载
import { applyExtraCACertsFromConfig } from '../utils/caCertsConfig.js'

// 导入清理注册函数，用于注册程序退出时需要执行的清理任务
import { registerCleanup } from '../utils/cleanupRegistry.js'

// 导入配置启用函数和首次启动时间记录函数
import { enableConfigs, recordFirstStartTime } from '../utils/config.js'

// 导入调试日志函数，用于输出调试信息
import { logForDebugging } from '../utils/debug.js'

// 导入仓库检测函数，用于异步检测当前是否在 GitHub 仓库中
import { detectCurrentRepository } from '../utils/detectRepository.js'

// 导入不包含个人隐私信息的诊断日志函数
import { logForDiagnosticsNoPII } from '../utils/diagLogs.js'

// 导入 JetBrains IDE 检测初始化函数，用于检测是否在 JetBrains IDE 中运行
import { initJetBrainsDetection } from '../utils/envDynamic.js'

// 导入环境变量真值判断函数，用于检查环境变量是否为"真"值
import { isEnvTruthy } from '../utils/envUtils.js'

// 导入配置解析错误类和错误消息提取函数
import { ConfigParseError, errorMessage } from '../utils/errors.js'

// 原有注释：showInvalidConfigDialog 是动态导入的，以避免在初始化阶段加载 React
// showInvalidConfigDialog is dynamically imported in the error path to avoid loading React at init

// 导入优雅退出的两个函数：同步版本和异步设置版本
import {
  gracefulShutdownSync,
  setupGracefulShutdown,
} from '../utils/gracefulShutdown.js'

// 导入环境变量应用函数：完整版和仅安全版
import {
  applyConfigEnvironmentVariables,
  applySafeConfigEnvironmentVariables,
} from '../utils/managedEnv.js'

// 导入全局 mTLS（双向 TLS 认证）配置函数
import { configureGlobalMTLS } from '../utils/mtls.js'

// 导入临时文件目录相关函数：确保目录存在和判断是否启用
import {
  ensureScratchpadDir,
  isScratchpadEnabled,
} from '../utils/permissions/filesystem.js'

// 原有注释：initializeTelemetry 通过 import() 延迟加载，推迟约 400KB 的 OpenTelemetry + protobuf 模块
// 直到遥测真正初始化时才加载。gRPC 导出器（约 700KB）在 instrumentation.ts 中进一步延迟加载。
// initializeTelemetry is loaded lazily via import() in setMeterState() to defer
// ~400KB of OpenTelemetry + protobuf modules until telemetry is actually initialized.
// gRPC exporters (~700KB via @grpc/grpc-js) are further lazy-loaded within instrumentation.ts.

// 导入全局 HTTP 代理配置函数
import { configureGlobalAgents } from '../utils/proxy.js'

// 导入 beta 追踪功能是否启用的判断函数
import { isBetaTracingEnabled } from '../utils/telemetry/betaSessionTracing.js'

// 导入获取遥测属性的函数，用于获取当前会话的遥测标签
import { getTelemetryAttributes } from '../utils/telemetryAttributes.js'

// 导入 Windows 平台下设置 Shell 的函数
import { setShellIfWindows } from '../utils/windowsPaths.js'

// 原有注释：initialize1PEventLogging 动态导入，推迟 OpenTelemetry sdk-logs/resources 的加载
// initialize1PEventLogging is dynamically imported to defer OpenTelemetry sdk-logs/resources

// 原有注释：跟踪遥测是否已初始化，防止重复初始化
// Track if telemetry has been initialized to prevent double initialization
let telemetryInitialized = false

// ============================================================
// 【主初始化函数】
// 这是 Claude Code 启动时的核心初始化流程。
// 用 memoize 包装后，无论调用多少次 init()，内部代码只会执行一次。
// 整个函数是一个大的 try-catch，保证初始化过程中的配置错误能被友好地处理。
// ============================================================
export const init = memoize(async (): Promise<void> => {
  // 记录初始化开始的时间戳，用于计算总耗时
  const initStartTime = Date.now()

  // 输出诊断日志：初始化已开始
  logForDiagnosticsNoPII('info', 'init_started')

  // 记录性能检查点：init 函数刚开始执行
  profileCheckpoint('init_function_start')

  // 原有注释：验证配置是否有效，并启用配置系统
  // Validate configs are valid and enable configuration system
  try {
    // 记录配置启用开始的时间
    const configsStart = Date.now()

    // 启用配置系统——解析和加载用户的配置文件
    enableConfigs()

    // 输出诊断日志：配置已启用，附带耗时
    logForDiagnosticsNoPII('info', 'init_configs_enabled', {
      duration_ms: Date.now() - configsStart,
    })

    // 记录性能检查点：配置已启用
    profileCheckpoint('init_configs_enabled')

    // 原有注释：在信任对话框之前，只应用安全的环境变量
    // 完整的环境变量在信任建立之后才应用
    // Apply only safe environment variables before trust dialog
    // Full environment variables are applied after trust is established
    const envVarsStart = Date.now()

    // 只应用"安全"的环境变量（不包含可能有风险的部分）
    applySafeConfigEnvironmentVariables()

    // 原有注释：在首次 TLS 连接之前，将 settings.json 中的 NODE_EXTRA_CA_CERTS 应用到 process.env。
    // Bun 通过 BoringSSL 在启动时缓存 TLS 证书存储，所以必须在首次 TLS 握手之前完成。
    // Apply NODE_EXTRA_CA_CERTS from settings.json to process.env early,
    // before any TLS connections. Bun caches the TLS cert store at boot
    // via BoringSSL, so this must happen before the first TLS handshake.
    applyExtraCACertsFromConfig()

    // 输出诊断日志：安全环境变量已应用，附带耗时
    logForDiagnosticsNoPII('info', 'init_safe_env_vars_applied', {
      duration_ms: Date.now() - envVarsStart,
    })

    // 记录性能检查点：安全环境变量已应用
    profileCheckpoint('init_safe_env_vars_applied')

    // 原有注释：确保退出时数据能被刷新
    // Make sure things get flushed on exit
    // 注册优雅退出处理——程序被关闭时，先把重要数据写完再退出
    setupGracefulShutdown()

    // 记录性能检查点：优雅退出已设置
    profileCheckpoint('init_after_graceful_shutdown')

    // ============================================================
    // 【初始化 1P 事件日志】
    // 1P = First Party（第一方），即 Anthropic 自己的事件日志系统。
    // 这里用动态 import 延迟加载，避免在启动时加载 OpenTelemetry 的日志模块。
    // 同时注册了一个回调：当 GrowthBook 配置刷新时，重新初始化日志。
    // ============================================================
    // 原有注释：初始化 1P 事件日志（无安全问题，但推迟加载以避免在启动时
    // 加载 OpenTelemetry sdk-logs）。growthbook.js 此时已在模块缓存中
    // （firstPartyEventLogger 导入了它），所以第二次动态导入不会增加加载成本。
    // Initialize 1P event logging (no security concerns, but deferred to avoid
    // loading OpenTelemetry sdk-logs at startup). growthbook.js is already in
    // the module cache by this point (firstPartyEventLogger imports it), so the
    // second dynamic import adds no load cost.
    void Promise.all([
      // 动态导入 1P 事件日志模块
      import('../services/analytics/firstPartyEventLogger.js'),
      // 动态导入 GrowthBook（A/B 测试和功能开关）模块
      import('../services/analytics/growthbook.js'),
    ]).then(([fp, gb]) => {
      // 初始化 1P 事件日志记录
      fp.initialize1PEventLogging()

      // 原有注释：如果 tengu_1p_event_batch_config 在会话中途发生变化，
      // 重建日志提供者。变化检测（isEqual）在处理器内部，所以未变化的刷新是无操作。
      // Rebuild the logger provider if tengu_1p_event_batch_config changes
      // mid-session. Change detection (isEqual) is inside the handler so
      // unchanged refreshes are no-ops.
      gb.onGrowthBookRefresh(() => {
        // 当 GrowthBook 配置刷新时，重新初始化日志（如果配置发生了变化）
        void fp.reinitialize1PEventLoggingIfConfigChanged()
      })
    })

    // 记录性能检查点：1P 事件日志已初始化
    profileCheckpoint('init_after_1p_event_logging')

    // 原有注释：如果 OAuth 账号信息尚未缓存到配置中，则填充它。
    // 这是必要的，因为通过 VSCode 扩展登录时，OAuth 账号信息可能未被填充。
    // Populate OAuth account info if it is not already cached in config. This is needed since the
    // OAuth account info may not be populated when logging in through the VSCode extension.
    // 异步填充 OAuth 账号信息（如果需要的话），用 void 表示不等待结果
    void populateOAuthAccountInfoIfNeeded()

    // 记录性能检查点：OAuth 填充已启动
    profileCheckpoint('init_after_oauth_populate')

    // 原有注释：异步初始化 JetBrains IDE 检测（填充缓存以供后续同步访问）
    // Initialize JetBrains IDE detection asynchronously (populates cache for later sync access)
    // 异步检测是否在 JetBrains IDE 中运行，结果会缓存起来供后续使用
    void initJetBrainsDetection()

    // 记录性能检查点：JetBrains 检测已启动
    profileCheckpoint('init_after_jetbrains_detection')

    // 原有注释：异步检测 GitHub 仓库（填充缓存以供 gitDiff PR 链接使用）
    // Detect GitHub repository asynchronously (populates cache for gitDiff PR linking)
    // 异步检测当前是否在 GitHub 仓库中，结果缓存后可用于 PR 链接功能
    void detectCurrentRepository()

    // ============================================================
    // 【初始化远程托管设置和策略限制的加载 Promise】
    // 这两个功能需要提前创建 Promise，这样其他系统（如插件钩子）
    // 可以 await 这个 Promise 来等待设置加载完成。
    // Promise 内部包含超时机制，防止死锁。
    // ============================================================
    // 原有注释：提前初始化加载 Promise，以便其他系统（如插件钩子）
    // 可以等待远程设置加载。Promise 包含超时以防止死锁，
    // 如果 loadRemoteManagedSettings() 从未被调用（例如 Agent SDK 测试）。
    // Initialize the loading promise early so that other systems (like plugin hooks)
    // can await remote settings loading. The promise includes a timeout to prevent
    // deadlocks if loadRemoteManagedSettings() is never called (e.g., Agent SDK tests).
    // 如果用户符合远程托管设置的条件，就初始化加载 Promise
    if (isEligibleForRemoteManagedSettings()) {
      initializeRemoteManagedSettingsLoadingPromise()
    }

    // 如果用户符合策略限制的条件，就初始化策略限制的加载 Promise
    if (isPolicyLimitsEligible()) {
      initializePolicyLimitsLoadingPromise()
    }

    // 记录性能检查点：远程设置检查完成
    profileCheckpoint('init_after_remote_settings_check')

    // 原有注释：记录首次启动时间
    // Record the first start time
    // 记录用户第一次启动 Claude Code 的时间
    recordFirstStartTime()

    // ============================================================
    // 【配置网络相关设置】
    // 先配置 mTLS（双向 TLS 认证），再配置 HTTP 代理。
    // 这两个步骤有顺序要求：代理需要用 mTLS 的证书信息。
    // ============================================================
    // 原有注释：配置全局 mTLS 设置
    // Configure global mTLS settings
    // 记录 mTLS 配置开始时间
    const mtlsStart = Date.now()

    // 输出调试日志：mTLS 配置开始
    logForDebugging('[init] configureGlobalMTLS starting')

    // 配置全局双向 TLS 认证（用于企业级安全连接）
    configureGlobalMTLS()

    // 输出诊断日志：mTLS 已配置，附带耗时
    logForDiagnosticsNoPII('info', 'init_mtls_configured', {
      duration_ms: Date.now() - mtlsStart,
    })

    // 输出调试日志：mTLS 配置完成
    logForDebugging('[init] configureGlobalMTLS complete')

    // 原有注释：配置全局 HTTP 代理（代理和/或 mTLS）
    // Configure global HTTP agents (proxy and/or mTLS)
    // 记录代理配置开始时间
    const proxyStart = Date.now()

    // 输出调试日志：代理配置开始
    logForDebugging('[init] configureGlobalAgents starting')

    // 配置全局 HTTP 代理（如果用户设置了代理服务器）
    configureGlobalAgents()

    // 输出诊断日志：代理已配置，附带耗时
    logForDiagnosticsNoPII('info', 'init_proxy_configured', {
      duration_ms: Date.now() - proxyStart,
    })

    // 输出调试日志：代理配置完成
    logForDebugging('[init] configureGlobalAgents complete')

    // 记录性能检查点：网络配置完成
    profileCheckpoint('init_network_configured')

    // ============================================================
    // 【预连接 Anthropic API】
    // 在正式发请求之前，提前建立 TCP+TLS 连接（约 100-200ms）。
    // 这样后续真正发 API 请求时就能省掉握手时间。
    // 这是个"即发即弃"的操作，不需要等待结果。
    // ============================================================
    // 原有注释：预连接 Anthropic API —— 让 TCP+TLS 握手
    // （约 100-200ms）与 API 请求前约 100ms 的操作处理工作重叠。
    // 在 CA 证书和代理代理配置之后执行，这样预热连接使用正确的传输。
    // 即发即弃；对于代理/mTLS/unix/云提供商跳过，
    // 因为 SDK 的调度器不会复用全局连接池。
    // Preconnect to the Anthropic API — overlap TCP+TLS handshake
    // (~100-200ms) with the ~100ms of action-handler work before the API
    // request. After CA certs + proxy agents are configured so the warmed
    // connection uses the right transport. Fire-and-forget; skipped for
    // proxy/mTLS/unix/cloud-provider where the SDK's dispatcher wouldn't
    // reuse the global pool.
    preconnectAnthropicApi()

    // ============================================================
    // 【初始化上游代理（仅 CCR 远程模式）】
    // 如果设置了 CLAUDE_CODE_REMOTE 环境变量，说明是在远程模式下运行。
    // 这时需要启动一个本地的 CONNECT 中继，让子进程能访问企业配置的上游代理。
    // 用动态导入避免非 CCR 启动时加载这些模块。
    // ============================================================
    // 原有注释：CCR upstreamproxy: 启动本地 CONNECT 中继，以便子进程
    // 能够访问带有凭据注入的企业配置上游代理。受 CLAUDE_CODE_REMOTE + GrowthBook 控制；
    // 任何错误都安全降级。懒加载导入，这样非 CCR 启动不需要加载模块。
    // getUpstreamProxyEnv 函数注册到 subprocessEnv.ts，这样子进程生成
    // 可以注入代理变量而无需静态导入 upstreamproxy 模块。
    // CCR upstreamproxy: start the local CONNECT relay so agent subprocesses
    // can reach org-configured upstreams with credential injection. Gated on
    // CLAUDE_CODE_REMOTE + GrowthBook; fail-open on any error. Lazy import so
    // non-CCR startups don't pay the module load. The getUpstreamProxyEnv
    // function is registered with subprocessEnv.ts so subprocess spawning can
    // inject proxy vars without a static import of the upstreamproxy module.
    // 检查是否设置了远程模式的环境变量
    if (isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
      // 用 try-catch 包裹，即使上游代理初始化失败也不影响主程序
      try {
        // 动态导入上游代理模块，获取初始化函数和环境变量函数
        const { initUpstreamProxy, getUpstreamProxyEnv } = await import(
          '../upstreamproxy/upstreamproxy.js'
        )

        // 动态导入子进程环境变量模块，获取注册函数
        const { registerUpstreamProxyEnvFn } = await import(
          '../utils/subprocessEnv.js'
        )

        // 将上游代理的环境变量函数注册到子进程环境变量系统中
        registerUpstreamProxyEnvFn(getUpstreamProxyEnv)

        // 初始化上游代理（启动本地中继）
        await initUpstreamProxy()
      } catch (err) {
        // 如果上游代理初始化失败，输出警告日志，但继续运行
        logForDebugging(
          `[init] upstreamproxy init failed: ${err instanceof Error ? err.message : String(err)}; continuing without proxy`,
          { level: 'warn' },
        )
      }
    }

    // 原有注释：如果相关，设置 git-bash
    // Set up git-bash if relevant
    // 在 Windows 平台上设置 Shell 为 git-bash（Windows 默认的 cmd 不兼容某些命令）
    setShellIfWindows()

    // 原有注释：注册 LSP 管理器清理（初始化在 main.tsx 中 --plugin-dir 处理后进行）
    // Register LSP manager cleanup (initialization happens in main.tsx after --plugin-dir is processed)
    // 注册 LSP 服务器管理器的清理函数，程序退出时会调用它
    registerCleanup(shutdownLspServerManager)

    // ============================================================
    // 【注册团队清理任务】
    // 子代理创建的"团队"（team）如果不清理，会一直留在磁盘上。
    // 这里注册一个清理函数，在程序退出时把本次会话创建的所有团队都删掉。
    // ============================================================
    // 原有注释：gh-32730: 子代理（或没有显式 TeamDelete 的主代理）创建的团队
    // 会永远留在磁盘上。为本次会话创建的所有团队注册清理。
    // 懒加载导入：swarm 代码受功能门控，大多数会话不会创建团队。
    // gh-32730: teams created by subagents (or main agent without
    // explicit TeamDelete) were left on disk forever. Register cleanup
    // for all teams created this session. Lazy import: swarm code is
    // behind feature gate and most sessions never create teams.
    // 注册团队清理的异步函数
    registerCleanup(async () => {
      // 动态导入团队辅助模块，获取清理函数
      const { cleanupSessionTeams } = await import(
        '../utils/swarm/teamHelpers.js'
      )

      // 执行团队清理，删除本次会话创建的所有团队
      await cleanupSessionTeams()
    })

    // ============================================================
    // 【初始化临时文件目录】
    // 如果启用了 scratchpad（临时文件板）功能，就确保目录存在。
    // ============================================================
    // 原有注释：如果启用则初始化临时文件目录
    // Initialize scratchpad directory if enabled
    // 检查 scratchpad 功能是否启用
    if (isScratchpadEnabled()) {
      // 记录临时文件目录创建开始时间
      const scratchpadStart = Date.now()

      // 确保临时文件目录存在，如果不存在就创建
      await ensureScratchpadDir()

      // 输出诊断日志：临时文件目录已创建，附带耗时
      logForDiagnosticsNoPII('info', 'init_scratchpad_created', {
        duration_ms: Date.now() - scratchpadStart,
      })
    }

    // 输出诊断日志：初始化完成，附带总耗时
    logForDiagnosticsNoPII('info', 'init_completed', {
      duration_ms: Date.now() - initStartTime,
    })

    // 记录性能检查点：init 函数执行结束
    profileCheckpoint('init_function_end')
  } catch (error) {
    // ============================================================
    // 【错误处理】
    // 如果初始化过程中抛出了配置解析错误，就显示友好的错误提示。
    // 对于非交互式会话（如命令行工具），直接输出错误信息并退出。
    // 对于交互式会话，弹出一个错误对话框让用户看到。
    // ============================================================
    // 检查是否是配置解析错误
    if (error instanceof ConfigParseError) {
      // 原有注释：当无法安全渲染对话框时，跳过交互式 Ink 对话框。
      // 该对话框会破坏 JSON 消费者（例如，在 VM 沙箱中运行
      // `plugin marketplace list --json` 的桌面市场插件管理器）。
      // Skip the interactive Ink dialog when we can't safely render it.
      // The dialog breaks JSON consumers (e.g. desktop marketplace plugin
      // manager running `plugin marketplace list --json` in a VM sandbox).
      // 如果是非交互式会话，直接输出错误到标准错误流并退出
      if (getIsNonInteractiveSession()) {
        // 将错误信息写入标准错误流
        process.stderr.write(
          `Configuration error in ${error.filePath}: ${error.message}\n`,
        )

        // 同步执行优雅退出，退出码为 1 表示出错
        gracefulShutdownSync(1)

        // 直接返回，不再继续执行
        return
      }

      // 原有注释：显示带有错误对象的无效配置对话框，并等待其完成
      // Show the invalid config dialog with the error object and wait for it to complete
      // 对于交互式会话，动态导入错误对话框组件并显示
      return import('../components/InvalidConfigDialog.js').then(m =>
        m.showInvalidConfigDialog({ error }),
      )

      // 原有注释：对话框本身处理 process.exit，所以这里不需要额外的清理
      // Dialog itself handles process.exit, so we don't need additional cleanup here
    } else {
      // 原有注释：对于非配置错误，重新抛出
      // For non-config errors, rethrow them
      // 如果不是配置解析错误，就重新抛出，交给上层处理
      throw error
    }
  }
})

// ============================================================
// 【在信任建立后初始化遥测】
//
// 这个函数在用户接受了信任对话框之后调用。
// 它负责启动遥测（telemetry）——即采集运行数据的功能。
//
// 逻辑分两条路径：
//   - 符合远程托管设置条件的用户：
//     需要等远程设置加载完，再应用环境变量，最后初始化遥测。
//     但如果是非交互式 + beta 追踪模式，会先"急切地"初始化一次。
//   - 不符合远程托管设置条件的用户：
//     直接初始化遥测。
//
// 设计原因：远程设置可能包含影响遥测的环境变量，
// 所以必须等远程设置加载完才能正确初始化。
// ============================================================

/**
 * Initialize telemetry after trust has been granted.
 * For remote-settings-eligible users, waits for settings to load (non-blocking),
 * then re-applies env vars (to include remote settings) before initializing telemetry.
 * For non-eligible users, initializes telemetry immediately.
 * This should only be called once, after the trust dialog has been accepted.
 */
export function initializeTelemetryAfterTrust(): void {
  // 检查用户是否符合远程托管设置的条件
  if (isEligibleForRemoteManagedSettings()) {
    // 原有注释：对于启用了 beta 追踪的 SDK/无头模式，先急切初始化
    // 以确保追踪器在第一次查询运行前就绪。
    // 下面的异步路径仍然会运行，但 doInitializeTelemetry() 会防止重复初始化。
    // For SDK/headless mode with beta tracing, initialize eagerly first
    // to ensure the tracer is ready before the first query runs.
    // The async path below will still run but doInitializeTelemetry() guards against double init.
    // 如果是非交互式会话且启用了 beta 追踪，立即初始化遥测
    if (getIsNonInteractiveSession() && isBetaTracingEnabled()) {
      // 急切初始化遥测，如果失败则输出错误日志
      void doInitializeTelemetry().catch(error => {
        logForDebugging(
          `[3P telemetry] Eager telemetry init failed (beta tracing): ${errorMessage(error)}`,
          { level: 'error' },
        )
      })
    }

    // 输出调试日志：正在等待远程托管设置加载
    logForDebugging(
      '[3P telemetry] Waiting for remote managed settings before telemetry init',
    )

    // 等待远程托管设置加载完成后再初始化遥测
    void waitForRemoteManagedSettingsToLoad()
      .then(async () => {
        // 输出调试日志：远程设置已加载，正在初始化遥测
        logForDebugging(
          '[3P telemetry] Remote managed settings loaded, initializing telemetry',
        )

        // 原有注释：重新应用环境变量以获取远程设置，然后再初始化遥测。
        // Re-apply env vars to pick up remote settings before initializing telemetry.
        // 重新应用完整的环境变量（包括远程设置中的环境变量）
        applyConfigEnvironmentVariables()

        // 执行遥测初始化
        await doInitializeTelemetry()
      })
      .catch(error => {
        // 如果初始化失败，输出错误日志
        logForDebugging(
          `[3P telemetry] Telemetry init failed (remote settings path): ${errorMessage(error)}`,
          { level: 'error' },
        )
      })
  } else {
    // 不符合远程托管设置条件的用户，直接初始化遥测
    void doInitializeTelemetry().catch(error => {
      // 如果初始化失败，输出错误日志
      logForDebugging(
        `[3P telemetry] Telemetry init failed: ${errorMessage(error)}`,
        { level: 'error' },
      )
    })
  }
}

/**
 * ============================================================
 * 【实际执行遥测初始化】
 *
 * 这是遥测初始化的真正执行函数。
 * 用一个标志位 telemetryInitialized 来防止重复初始化。
 * 如果初始化失败，会重置标志位，允许后续重试。
 * ============================================================
 */
async function doInitializeTelemetry(): Promise<void> {
  // 检查是否已经初始化过
  if (telemetryInitialized) {
    // 原有注释：已初始化，无需操作
    // Already initialized, nothing to do
    return
  }

  // 原有注释：在初始化前设置标志，防止重复初始化
  // Set flag before init to prevent double initialization
  // 标记为已初始化（在真正初始化之前就设置，防止并发调用重复初始化）
  telemetryInitialized = true

  try {
    // 调用设置计量器状态的函数，完成遥测的实际初始化
    await setMeterState()
  } catch (error) {
    // 原有注释：失败时重置标志，以便后续调用可以重试
    // Reset flag on failure so subsequent calls can retry
    // 如果初始化失败，重置标志位，允许下次重试
    telemetryInitialized = false

    // 重新抛出错误，让调用者知道初始化失败了
    throw error
  }
}

/**
 * ============================================================
 * 【设置计量器状态】
 *
 * 这个函数负责：
 *   1. 动态导入遥测模块（延迟加载，节省启动时间和内存）
 *   2. 初始化遥测，获取计量器（meter）对象
 *   3. 创建"带属性的计数器"工厂函数
 *   4. 将计量器和工厂函数注册到全局状态
 *   5. 递增会话计数器（记录一次新会话）
 *
 * "带属性的计数器"是什么？
 *   普通计数器只能简单地 +1，但带属性的计数器在 +1 的同时
 *   会附上一组标签（属性），比如"用户类型"、"操作系统"等，
 *   这样在统计时可以按不同维度分组查看。
 * ============================================================
 */
async function setMeterState(): Promise<void> {
  // 原有注释：懒加载 instrumentation 模块，推迟约 400KB 的 OpenTelemetry + protobuf
  // Lazy-load instrumentation to defer ~400KB of OpenTelemetry + protobuf
  // 动态导入遥测模块，获取 initializeTelemetry 函数
  const { initializeTelemetry } = await import(
    '../utils/telemetry/instrumentation.js'
  )

  // 原有注释：初始化客户 OTLP 遥测（指标、日志、追踪）
  // Initialize customer OTLP telemetry (metrics, logs, traces)
  // 初始化遥测系统，获取计量器对象（可能为 null，如果遥测未启用）
  const meter = await initializeTelemetry()

  // 如果成功获取到计量器
  if (meter) {
    // 原有注释：创建带属性计数器的工厂函数
    // Create factory function for attributed counters
    // 定义一个工厂函数：传入名称和选项，返回一个"带属性的计数器"
    const createAttributedCounter = (
      // 计数器名称
      name: string,
      // 计数器选项（如描述信息等）
      options: MetricOptions,
    ): AttributedCounter => {
      // 使用计量器创建一个底层计数器
      const counter = meter?.createCounter(name, options)

      // 返回一个封装后的计数器对象，在每次 add 时自动合并遥测属性
      return {
        // add 方法：增加计数，并自动附上当前的遥测属性
        add(value: number, additionalAttributes: Attributes = {}) {
          // 原有注释：总是获取最新的遥测属性，确保它们是最新的
          // Always fetch fresh telemetry attributes to ensure they're up to date
          // 获取当前的遥测属性（如会话ID、操作系统等）
          const currentAttributes = getTelemetryAttributes()

          // 合并当前遥测属性和额外传入的属性（额外的属性优先级更高）
          const mergedAttributes = {
            ...currentAttributes,
            ...additionalAttributes,
          }

          // 调用底层计数器的 add 方法，记录数值和合并后的属性
          counter?.add(value, mergedAttributes)
        },
      }
    }

    // 将计量器和工厂函数注册到全局状态，供其他模块使用
    setMeter(meter, createAttributedCounter)

    // 原有注释：在这里递增会话计数器，因为启动遥测路径
    // 在这个异步初始化完成之前运行，所以计数器在那里会是 null。
    // Increment session counter here because the startup telemetry path
    // runs before this async initialization completes, so the counter
    // would be null there.
    // 获取会话计数器并递增 1（记录一次新会话启动）
    getSessionCounter()?.add(1)
  }
}
