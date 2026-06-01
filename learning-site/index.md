---
layout: home

hero:
  name: "读懂 Claude Code"
  text: "从零开始的源码递进式学习"
  tagline: 1,987 个文件 / 513,727 行代码 / 38 个顶级目录 — 层层拆解，步步深入
  actions:
    - theme: brand
      text: 开始阅读 →
      link: /prologue/architecture
    - theme: alt
      text: 查看完整目录
      link: /ch01-foundation/message-types
---

<div class="home-stats">

## 仓库全景

| 维度 | 数字 |
|------|------|
| TypeScript 文件 | 1,987 |
| 总代码行数 | 513,727 |
| 顶级目录 | 38 |
| 依赖包 | 74 |
| 工具实现 | 53 |
| 斜杠命令 | 87 |
| UI 组件 | 85 |
| React Hook | 22 |
| 服务模块 | 31 |

</div>

<div class="home-top10">

## 十大文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/cli/print.ts` | 5,594 | 输出渲染管道 |
| `src/utils/messages.ts` | 5,512 | 消息构建工具 |
| `src/utils/sessionStorage.ts` | 5,105 | 会话持久化 |
| `src/screens/REPL.tsx` | 5,061 | 主交互界面 |
| `src/utils/hooks.ts` | 5,022 | Hook 执行引擎 |
| `src/main.tsx` | 4,690 | 启动编排（God File） |
| `src/utils/bash/bashParser.ts` | 4,436 | Bash 解析器 |
| `src/utils/attachments.ts` | 3,997 | 附件处理 |
| `src/services/api/claude.ts` | 3,419 | API 流式客户端 |
| `src/services/mcp/client.ts` | 3,348 | MCP 客户端 |

</div>

<div class="home-spine">

## 学习路径

这不是分类目录，而是一本**层层递进**的书。按源码依赖链排序——每一步都建立在前一步之上。

```
序章 → 第一章 → 第二章 → 第三章 → 第四章 → 第五章 → 第六章 → 第七章 → 第八章
认知     类型     通信     约束     指令     行动     心跳      扩展      外延
```

**核心脊柱：** `Tool 类型 → 权限引擎 → useCanUseTool → 工具执行 → query()`

**汇聚链：** `认证 → API 客户端 → query()`

第六章（查询循环）是最重要的里程碑——理解了它，其他系统都是"在它上面叠层"。

</div>

<style>
.home-stats, .home-top10, .home-spine {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.home-stats table, .home-top10 table {
  width: 100%;
  font-size: 0.9em;
}
.home-spine code {
  font-size: 0.85em;
}
</style>
