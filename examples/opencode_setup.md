# OpenCode 集成指南 / OpenCode Integration Guide

MemPalace 在 OpenCode 中通过两层机制工作：

- **MCP 服务器** — 提供 19 个标准工具（搜索、知识图谱、日记等），AI 按需调用
- **插件（Plugin + Hooks）** — 提供 3 个自定义工具 + 会话生命周期钩子，实现自动唤醒和自动保存

```
会话开始 ──→ 插件工具 mempalace_wakeup ──→ 加载身份+关键事实
   │
对话进行中 ──→ MCP 工具 mempalace_search ──→ 按需搜索记忆
   │
上下文压缩前 ──→ 插件钩子 session.compacting ──→ 自动保存到宫殿
   │
会话空闲 ──→ 插件事件 session.idle ──→ macOS 通知提醒
```

---

## 第 1 步：安装 MemPalace

```bash
# 方式 A：pip 安装（通用）
pip install mempalace

# 方式 B：uv 安装（推荐，隔离环境，更快）
uv tool install mempalace
```

验证安装：

```bash
mempalace --help
```

---

## 第 2 步：初始化宫殿

```bash
# 交互式引导，设置人物、项目、翼区
mempalace init ~/projects/your-project

# 挖掘项目数据（代码、文档、笔记）
mempalace mine ~/projects/your-project

# 可选：挖掘对话记录（Claude/ChatGPT/Slack 导出）
mempalace mine ~/chats/ --mode convos

# 验证
mempalace status
```

初始化后会在 `~/.mempalace/` 下生成配置和宫殿数据。

---

## 第 3 步：配置 MCP 服务器

编辑 OpenCode 全局配置文件 `~/.config/opencode/opencode.json`：

```json
{
  "mcp": {
    "mempalace": {
      "command": ["python3", "-m", "mempalace.mcp_server"],
      "enabled": true,
      "type": "local"
    }
  }
}
```

> **注意：** 如果你用 `uv tool install` 安装的，需要指向 uv 虚拟环境中的 python：
>
> ```json
> {
>   "mcp": {
>     "mempalace": {
>       "command": [
>         "<HOME>/.local/share/uv/tools/mempalace/bin/python",
>         "-m",
>         "mempalace.mcp_server"
>       ],
>       "enabled": true,
>       "type": "local"
>     }
>   }
> }
> ```
>
> 将 `<HOME>` 替换为你的用户主目录路径，比如 `/Users/yourname`。
> 可以通过 `uv tool dir` 查看 uv 工具安装路径。

配置后重启 OpenCode，AI 就能看到 19 个 MCP 工具。

---

## 第 4 步：安装插件（Hooks + 自定义工具）

这是关键步骤。插件提供了 MCP 之外的三个能力：

| 能力 | 机制 | 作用 |
|------|------|------|
| 会话唤醒 | 自定义工具 `mempalace_wakeup` | AI 开始对话时加载身份和关键事实 |
| 日记回忆 | 自定义工具 `mempalace_diary_recent` | AI 回忆上次会话的工作内容 |
| 快速搜索 | 自定义工具 `mempalace_quick_search` | 语义搜索宫殿记忆 |
| 压缩前保存 | 钩子 `session.compacting` | 上下文压缩前自动保存发现 |
| 压缩后恢复 | 事件 `session.compacted` | 提醒 AI 重新加载上下文 |
| 空闲提醒 | 事件 `session.idle` | macOS 通知 |

### 安装方式 A：项目级（只在特定项目生效）

```bash
# 在你的项目根目录下
mkdir -p .opencode/plugins

# 从 MemPalace 仓库复制插件文件
curl -o .opencode/plugins/mempalace-hooks.ts \
  https://raw.githubusercontent.com/sunshinev/mempalace/feature/chinese-translations/.opencode/plugins/mempalace-hooks.ts
```

或者手动复制：

```bash
cp /path/to/mempalace/.opencode/plugins/mempalace-hooks.ts .opencode/plugins/
```

### 安装方式 B：全局级（所有项目都生效，推荐）

```bash
mkdir -p ~/.config/opencode/plugins

curl -o ~/.config/opencode/plugins/mempalace-hooks.ts \
  https://raw.githubusercontent.com/sunshinev/mempalace/feature/chinese-translations/.opencode/plugins/mempalace-hooks.ts
```

### 验证插件加载

重启 OpenCode，在对话中让 AI 列出可用工具，应该能看到：
- `mempalace_wakeup`
- `mempalace_diary_recent`
- `mempalace_quick_search`

加上 MCP 的 19 个工具（`mempalace_search`、`mempalace_kg_query` 等）。

---

## 工作原理详解

### 插件文件结构

```
.opencode/plugins/
  └── mempalace-hooks.ts     ← 唯一需要的文件
```

OpenCode 在启动时自动扫描 `.opencode/plugins/` 目录，加载所有 `.ts` / `.js` 文件作为插件。不需要额外配置。

### 插件做了什么

```typescript
// 1. 注册自定义工具（tool）
//    AI 在工具列表中看到这些工具，会根据 description 决定何时调用
tool: {
  mempalace_wakeup: tool({
    description: "Call this at the START of every new conversation...",
    // → AI 看到这个描述，知道要在开头调用
  }),
  mempalace_diary_recent: tool({ ... }),
  mempalace_quick_search: tool({ ... }),
}

// 2. 注册压缩钩子（experimental.session.compacting）
//    上下文压缩前，向压缩提示注入保存指令
"experimental.session.compacting": async (_input, output) => {
  output.context.push("...保存指令...")
  // → AI 在压缩前会先执行保存操作
}

// 3. 监听事件（event）
event: async ({ event }) => {
  if (event.type === "session.created") { ... }   // 新会话
  if (event.type === "session.idle") { ... }       // 会话空闲
  if (event.type === "session.compacted") { ... }  // 压缩完成
}
```

### 一次典型会话的时间线

```
1. 用户打开 OpenCode，开始新会话
   ↓
2. AI 看到 mempalace_wakeup 工具描述中写着
   "Call this at the START of every new conversation"
   → AI 调用 mempalace_wakeup
   → 返回 L0 身份 + L1 关键事实（约 170 token）
   → AI 现在知道你是谁、你的项目和团队
   ↓
3. 用户问："上次我们讨论认证迁移，最后决定了什么？"
   → AI 调用 mempalace_search（MCP 工具）搜索 "认证迁移 决定"
   → 返回逐字记忆
   → AI 基于真实记忆回答
   ↓
4. 对话持续，上下文接近窗口上限
   → OpenCode 触发 session.compacting
   → 插件注入保存指令
   → AI 写日记、存知识图谱事实、归档重要发现
   → 然后生成压缩摘要
   ↓
5. 压缩完成，触发 session.compacted
   → AI 重新调用 mempalace_wakeup 恢复上下文
   → 继续工作，不丢失记忆
   ↓
6. 用户停止操作，session.idle 触发
   → macOS 通知提醒
```

---

## 与 Claude Code Hooks 的对比

如果你之前用过 Claude Code 的 shell hooks（`mempal_save_hook.sh`），插件方式有几点不同：

| | Claude Code Hooks | OpenCode Plugin |
|---|---|---|
| 格式 | Shell 脚本 (.sh) | TypeScript (.ts) |
| 安装 | 写入 `.claude/hooks/` | 放入 `.opencode/plugins/` |
| 触发保存 | Stop + PreCompact 事件 | `session.compacting` 钩子 |
| 自定义工具 | 不支持 | 支持（wakeup、diary、search） |
| 自动唤醒 | 无（需要手动配 CLAUDE.md） | 有（工具描述引导 AI 调用） |

---

## 常见问题

### Q: 插件加载失败？

检查 OpenCode 日志，搜索 `mempalace-hooks`：
```bash
# 日志位置
ls ~/.cache/opencode/logs/
```

### Q: MCP 工具和插件工具有重复？

不冲突。MCP 提供 `mempalace_search`，插件提供 `mempalace_quick_search`，两者都可用。插件工具不依赖 MCP 服务器运行，是独立的。

### Q: 可以只装 MCP 不装插件吗？

可以。MCP 提供完整的 19 个工具。但没有插件就没有：
- 自动唤醒（需要手动让 AI 调用 `mempalace_status`）
- 压缩前自动保存
- 空闲通知

### Q: 可以只装插件不装 MCP 吗？

可以，但功能有限。插件只有 3 个工具（wakeup、diary、search），没有知识图谱、归档、去重等完整功能。**推荐两者都装。**

### Q: `uv tool install` 后找不到 python 路径？

```bash
# 查看 uv 工具安装目录
uv tool dir
# 通常在 ~/.local/share/uv/tools/mempalace/bin/python
```
