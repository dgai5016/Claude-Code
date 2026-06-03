/**
 * @file dev-entry.ts
 * @description 开发环境入口文件，在源码尚未完全编译时充当兜底启动器。
 *
 * 模块定位：此文件是 Claude Code 在开发模式（非构建产物）下的入口点，
 * 当源码存在缺失的相对路径导入时，提供诊断信息而非直接崩溃；
 * 当所有导入均可用时，自动转发到正式 CLI 入口 src/entrypoints/cli.tsx。
 *
 * 核心职责：
 * 1. 初始化全局宏变量 MACRO（版本号、构建时间、反馈渠道等），供运行时使用
 * 2. 扫描 src/ 和 vendor/ 目录，检测所有相对路径导入是否能解析到实际文件
 * 3. 根据命令行参数（--version / --help）和导入缺失情况输出诊断信息
 * 4. 在导入完整时，通过动态 import 启动正式 CLI
 *
 * 调用关系：被开发环境的启动脚本引用 → 检测通过后 → import('./entrypoints/cli.tsx')
 */

import pkg from '../package.json'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, extname, join, resolve } from 'path'

// 全局宏配置的类型定义，包含版本号、构建时间、包地址、更新日志、问题反馈等字段
// 这些字段在构建时由 macro 插件注入，开发模式下需要手动填充默认值
type MacroConfig = {
  VERSION: string
  BUILD_TIME: string
  PACKAGE_URL: string
  NATIVE_PACKAGE_URL: string
  VERSION_CHANGELOG: string
  ISSUES_EXPLAINER: string
  FEEDBACK_CHANNEL: string
}

// 开发模式下的宏默认值，从 package.json 读取版本号和包名，
// 其余字段留空或填充合理默认值（构建产物中这些值由 CI/CD 注入）
const defaultMacro: MacroConfig = {
  VERSION: pkg.version,
  BUILD_TIME: '',
  PACKAGE_URL: pkg.name,
  NATIVE_PACKAGE_URL: pkg.name,
  VERSION_CHANGELOG: '',
  ISSUES_EXPLAINER:
    'file an issue at https://github.com/anthropics/claude-code/issues',
  FEEDBACK_CHANNEL: 'github',
}

// 仅在全局尚未挂载 MACRO 时注入默认值，避免重复注入（例如热重载场景）
if (!('MACRO' in globalThis)) {
  ;(globalThis as typeof globalThis & { MACRO: MacroConfig }).MACRO =
    defaultMacro
}

// 缺失导入的记录结构：importer 为引用方文件路径，specifier 为相对路径导入说明符
type MissingImport = {
  importer: string
  specifier: string
}

// 递归扫描指定目录，收集所有 JS/TS 源码文件路径到 out 数组
// 用于后续检查这些文件中的相对路径导入是否存在可解析的目标文件
function scanFiles(dir: string, out: string[]): void {
  // 目录不存在则直接跳过
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      // 递归进入子目录
      scanFiles(fullPath, out)
      continue
    }
    // 仅收集常见 JS/TS 源码扩展名的文件
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(entry.name))) {
      out.push(fullPath)
    }
  }
}

// 给定一个导入路径（去掉 .js 后缀），枚举所有可能的文件系统候选路径，
// 模拟 Node 模块解析逻辑：同名 .ts/.tsx/.js/.jsx/.mjs/.cjs 以及目录下的 index 文件
// 只要有任一候选路径存在即视为"可解析"
function hasResolvableTarget(basePath: string): boolean {
  // 去掉 .js 后缀，因为 TypeScript 源码中通常以 .js 扩展名导入，但实际文件是 .ts
  const withoutJs = basePath.replace(/\.js$/u, '')
  // 按优先级枚举所有可能的文件路径候选
  const candidates = [
    withoutJs,
    `${withoutJs}.ts`,
    `${withoutJs}.tsx`,
    `${withoutJs}.js`,
    `${withoutJs}.jsx`,
    `${withoutJs}.mjs`,
    `${withoutJs}.cjs`,
    join(withoutJs, 'index.ts'),
    join(withoutJs, 'index.tsx'),
    join(withoutJs, 'index.js'),
  ]
  // 任一候选文件存在即判定为可解析
  return candidates.some(candidate => existsSync(candidate))
}

// 核心：扫描所有源码文件，提取相对路径导入（import/export ... from './...' 和 require('./...')），
// 检查每个导入是否能解析到真实文件，收集所有无法解析的导入记录
function collectMissingRelativeImports(): MissingImport[] {
  const files: string[] = []
  // 分别扫描 src/ 和 vendor/ 目录下的源码文件
  scanFiles(resolve('src'), files)
  scanFiles(resolve('vendor'), files)
  const missing: MissingImport[] = []
  // 用 Set 去重，避免同一文件对同一说明符的多次导入被重复记录
  const seen = new Set<string>()
  // 正则同时匹配 ESM import/export 和 CommonJS require 中的相对路径导入
  const pattern =
    /(?:import|export)\s+[\s\S]*?from\s+['"](\.\.?\/[^'"]+)['"]|require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g

  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(pattern)) {
      // match[1] 对应 ESM import，match[2] 对应 CommonJS require
      const specifier = match[1] ?? match[2]
      if (!specifier) continue
      // 基于导入文件所在目录，解析相对路径的绝对目标路径
      const target = resolve(dirname(file), specifier)
      // 如果目标路径存在可解析的文件，跳过
      if (hasResolvableTarget(target)) continue
      // 构造去重键，防止同一文件重复记录同一缺失导入
      const key = `${file} -> ${specifier}`
      if (seen.has(key)) continue
      seen.add(key)
      missing.push({
        importer: file,
        specifier,
      })
    }
  }

  // 按文件路径和说明符排序，使输出稳定可读
  return missing.sort((a, b) =>
    `${a.importer}:${a.specifier}`.localeCompare(`${a.importer}:${b.specifier}`),
  )
}

// ========== 命令行参数解析与诊断输出 ==========

// 获取命令行参数（去掉 node 和脚本路径）
const args = process.argv.slice(2)
// 在启动阶段立即检测缺失导入，供后续所有分支使用
const missingImports = collectMissingRelativeImports()

// --version 分支：输出版本号；若存在缺失导入则附加 "(restored dev workspace)" 标记
if (args.includes('--version')) {
  if (missingImports.length > 0) {
    console.log(`${pkg.version} (restored dev workspace)`)
    console.log(`missing_relative_imports=${missingImports.length}`)
    process.exit(0)
  }
  // 所有导入完整，仅输出纯净版本号
  console.log(pkg.version)
  process.exit(0)
}

// --help 分支：输出帮助信息；若存在缺失导入则显示恢复工作区状态而非正常帮助
if (args.includes('--help')) {
  if (missingImports.length > 0) {
    console.log('Claude Code restored development workspace')
    console.log(`version: ${pkg.version}`)
    console.log(`missing relative imports: ${missingImports.length}`)
    process.exit(0)
  }
  // 正常帮助信息，指向 src/main.tsx 的交互式 REPL 入口
  console.log('Usage: claude [options] [prompt]')
  console.log('')
  console.log('Basic restored commands:')
  console.log('  --help       Show this help')
  console.log('  --version    Show version')
  console.log('')
  console.log('Interactive REPL startup is routed to src/main.tsx when run without these flags.')
  process.exit(0)
}

// 无 --version / --help 参数但有缺失导入时：输出详细的缺失模块诊断信息
// 最多展示前 20 条缺失导入，路径去掉 cwd 前缀使其更可读
if (missingImports.length > 0) {
  console.log('Claude Code restored development workspace')
  console.log(`version: ${pkg.version}`)
  console.log(`missing relative imports: ${missingImports.length}`)
  console.log('')
  console.log('Top missing modules:')
  // 仅展示前 20 条，避免输出过长
  for (const item of missingImports.slice(0, 20)) {
    // 去掉 cwd 前缀，使路径更简短可读
    console.log(`- ${item.importer.replace(`${process.cwd()}/`, '')} -> ${item.specifier}`)
  }
  console.log('')
  console.log('The original app entry is still blocked by missing restored sources.')
  console.log('Use this workspace to continue restoration; once missing imports reach 0, this launcher will forward to src/main.tsx automatically.')
  process.exit(0)
}

// Route through the original CLI bootstrap so the exported `main()` is
// actually invoked. Importing `main.tsx` directly only evaluates the module.
// 所有检测通过：使用动态 import 启动正式 CLI 入口
// 必须用动态 import 而非静态 import，因为静态 import 会在模块评估阶段立即执行，
// 而动态 import 确保 MACRO 全局变量已先完成初始化
await import('./entrypoints/cli.tsx')
