<div align="center">

<img src="assets/mempalace_logo.png" alt="MemPalace" width="280">

# MemPalace

### 有史以来基准测试得分最高的 AI 记忆系统。而且免费。

**[English](README.md) | 中文**

<br>

你与 AI 的每一次对话——每一个决策、每一次调试、每一场架构讨论——都会在会话结束时消失。六个月的工作，化为乌有。每次都要从头开始。

其他记忆系统试图通过让 AI 决定什么值得记住来解决这个问题。它提取出"用户偏好 Postgres"，然后丢掉了你解释*为什么*的那段对话。MemPalace 采用了不同的方法：**存储一切，然后让它可被检索。**

**记忆宫殿** — 古希腊演说家通过将想法放置在想象建筑的各个房间中来记忆整篇演讲。走过建筑，找到想法。MemPalace 将同样的原理应用于 AI 记忆：你的对话被组织成翼区（人物和项目）、大厅（记忆类型）和房间（具体主题）。没有 AI 来决定什么重要——你保留每一个字，结构为你提供一张可导航的地图，而不是一个扁平的搜索索引。

**原始逐字存储** — MemPalace 将你的实际对话存储在 ChromaDB 中，不做摘要或提取。96.6% 的 LongMemEval 结果来自这种原始模式。我们不消耗 LLM 来决定什么"值得记住"——我们保留一切，让语义搜索来定位。

**AAAK（实验性）** — 一种有损缩写方言，用于在大规模场景下将重复实体压缩为更少的 token。任何能读取文本的 LLM 都可以直接阅读——Claude、GPT、Gemini、Llama、Mistral——无需解码器。**AAAK 是一个独立的压缩层，不是默认存储格式**，在 LongMemEval 基准测试中目前比原始模式有所下降（84.2% vs 96.6%）。我们正在持续改进。请参阅[下方说明](#来自-milla-和-ben-的说明--2026-年-4-月-7-日)了解真实状态。

**本地、开源、可适配** — MemPalace 完全在你的机器上运行，处理你本地的任何数据，不使用任何外部 API 或服务。它已在对话数据上经过测试——但也可以适配不同类型的数据存储。这就是我们开源的原因。

<br>

[![][version-shield]][release-link]
[![][python-shield]][python-link]
[![][license-shield]][license-link]
[![][discord-shield]][discord-link]

<br>

[快速开始](#快速开始) · [记忆宫殿](#记忆宫殿) · [AAAK 方言](#aaak-方言实验性) · [基准测试](#基准测试) · [MCP 工具](#mcp-服务器)

<br>

### 有史以来发布的最高 LongMemEval 分数——无论免费还是付费。

<table>
<tr>
<td align="center"><strong>96.6%</strong><br><sub>LongMemEval R@5<br><b>原始模式</b>，零 API 调用</sub></td>
<td align="center"><strong>500/500</strong><br><sub>测试问题数<br>已独立复现</sub></td>
<td align="center"><strong>$0</strong><br><sub>无订阅费<br>无云端。仅本地。</sub></td>
</tr>
</table>

<sub>可复现——运行脚本在 <a href="benchmarks/">benchmarks/</a>。<a href="benchmarks/BENCHMARKS.md">完整结果</a>。96.6% 来自<b>原始逐字模式</b>，不是 AAAK 或房间模式（那些分数较低——见<a href="#来自-milla-和-ben-的说明--2026-年-4-月-7-日">下方说明</a>）。</sub>

</div>

---

## 来自 Milla 和 Ben 的说明 — 2026 年 4 月 7 日

> 社区在发布后数小时内就发现了这个 README 中的真实问题，我们想直接回应。
>
> **我们做错了什么：**
>
> - **AAAK token 示例是不正确的。** 我们用了一个粗略的启发式方法（`len(text)//3`）来计算 token 数量，而不是使用真正的分词器。通过 OpenAI 分词器的实际计数：英文示例是 66 个 token，AAAK 示例是 73 个。AAAK 在小规模下并不节省 token——它是为*大规模重复实体*设计的，而 README 示例对此的展示很不恰当。我们正在重写。
>
> - **"30 倍无损压缩"是夸大的。** AAAK 是一个有损缩写系统（实体编码、句子截断）。独立基准测试显示 AAAK 模式在 LongMemEval 上得分为 **84.2% R@5，而原始模式为 96.6%**——下降了 12.4 个百分点。诚实的说法是：AAAK 是一个实验性压缩层，用 token 密度换取保真度，**96.6% 的标题数字来自原始模式，不是 AAAK**。
>
> - **"+34% 宫殿提升"具有误导性。** 这个数字是将未过滤搜索与翼区+房间元数据过滤进行比较。元数据过滤是 ChromaDB 的标准功能，不是新颖的检索机制。真实且有用，但不是护城河。
>
> - **"矛盾检测"**作为独立工具存在（`fact_checker.py`），但目前并未像 README 暗示的那样接入知识图谱操作。
>
> - **"Haiku 重排序达到 100%"**是真实的（我们有结果文件），但重排序管道不在公开的基准测试脚本中。我们正在添加。
>
> **仍然真实且可复现的：**
>
> - **原始模式在 LongMemEval 上 96.6% R@5**，500 个问题，零 API 调用——已由 [@gizmax](https://github.com/milla-jovovich/mempalace/issues/39) 在 M2 Ultra 上在 5 分钟内独立复现。
> - 本地、免费、无订阅、无云端、数据不离开你的机器。
> - 架构（翼区、房间、壁橱、抽屉）是真实且有用的，即使它不是什么神奇的检索增强。
>
> **我们正在做的：**
>
> 1. 用真正的分词器计数和一个 AAAK 真正展示压缩效果的场景重写 AAAK 示例
> 2. 在基准测试文档中清楚标注 `mode raw / aaak / rooms`，让权衡取舍可见
> 3. 将 `fact_checker.py` 接入知识图谱操作，使矛盾检测声明变为现实
> 4. 将 ChromaDB 固定到经过测试的版本范围（Issue #100），修复 hooks 中的 shell 注入（#110），解决 macOS ARM64 段错误（#74）
>
> **感谢每一个挑出问题的人。** 残酷的诚实批评正是开源运作的方式，也是我们所期望的。特别感谢 [@panuhorsmalahti](https://github.com/milla-jovovich/mempalace/issues/43)、[@lhl](https://github.com/milla-jovovich/mempalace/issues/27)、[@gizmax](https://github.com/milla-jovovich/mempalace/issues/39)，以及所有在前 48 小时内提交 issue 或 PR 的人。我们在倾听，我们在修复，我们宁愿做对而不是做得漂亮。
>
> — *Milla Jovovich & Ben Sigman*

---

## 快速开始

```bash
pip install mempalace

# 设置你的世界——你的合作者、你的项目
mempalace init ~/projects/myapp

# 挖掘你的数据
mempalace mine ~/projects/myapp                    # 项目——代码、文档、笔记
mempalace mine ~/chats/ --mode convos              # 对话——Claude、ChatGPT、Slack 导出
mempalace mine ~/chats/ --mode convos --extract general  # 通用——分类为决策、里程碑、问题

# 搜索你讨论过的任何内容
mempalace search "why did we switch to GraphQL"

# 你的 AI 记住了
mempalace status
```

三种挖掘模式：**projects**（代码和文档）、**convos**（对话导出）和 **general**（自动分类为决策、偏好、里程碑、问题和情感上下文）。一切都保留在你的机器上。

---

## 实际使用方式

完成一次性设置（安装 → init → mine）后，你不需要手动运行 MemPalace 命令。你的 AI 会替你使用。根据你使用的 AI，有两种方式。

### 配合 Claude Code（推荐）

原生市场安装：

```bash
claude plugin marketplace add milla-jovovich/mempalace
claude plugin install --scope user mempalace
```

重启 Claude Code，然后输入 `/skills` 验证 "mempalace" 出现。

### 配合 Claude、ChatGPT、Cursor、Gemini（MCP 兼容工具）

```bash
# 一次性连接 MemPalace
claude mcp add mempalace -- python -m mempalace.mcp_server
```

现在你的 AI 通过 MCP 拥有了 19 个工具。随便问：

> *"上个月我们关于认证做了什么决定？"*

Claude 会自动调用 `mempalace_search`，获取逐字结果，然后回答你。你再也不需要手动输入 `mempalace search`。AI 帮你搞定。

MemPalace 同样原生支持 **Gemini CLI**（它会自动处理服务器和保存钩子）——参见 [Gemini CLI 集成指南](examples/gemini_cli_setup.md)。

### 配合本地模型（Llama、Mistral 或任何离线 LLM）

本地模型通常还不支持 MCP。两种方法：

**1. 唤醒命令** — 将你的世界加载到模型的上下文中：

```bash
mempalace wake-up > context.txt
# 将 context.txt 粘贴到你的本地模型的系统提示中
```

这会给你的本地模型约 170 个 token 的关键事实（如果你愿意可以用 AAAK 格式），在你提出任何问题之前。

**2. CLI 搜索** — 按需查询，将结果输入你的提示：

```bash
mempalace search "auth decisions" > results.txt
# 将 results.txt 包含在你的提示中
```

或者使用 Python API：

```python
from mempalace.searcher import search_memories
results = search_memories("auth decisions", palace_path="~/.mempalace/palace")
# 注入到你的本地模型上下文中
```

无论哪种方式——你的整个记忆栈都在离线运行。ChromaDB 在你的机器上，Llama 在你的机器上，AAAK 用于压缩，零云端调用。

---

## 问题所在

决策现在发生在对话中。不在文档里。不在 Jira 里。在与 Claude、ChatGPT、Copilot 的对话中。推理、权衡、"我们试了 X 但因为 Y 失败了"——全部困在聊天窗口中，会话结束就蒸发了。

**每天使用 AI 六个月 = 1950 万个 token。** 这是每一个决策、每一次调试、每一场架构讨论。全部消失。

| 方案 | 加载的 Token 数 | 年度成本 |
|------|----------------|---------|
| 粘贴所有内容 | 1950 万——任何上下文窗口都装不下 | 不可能 |
| LLM 摘要 | 约 65 万 | 约 $507/年 |
| **MemPalace 唤醒** | **约 170 token** | **约 $0.70/年** |
| **MemPalace + 5 次搜索** | **约 13,500 token** | **约 $10/年** |

MemPalace 在唤醒时加载 170 个 token 的关键事实——你的团队、项目、偏好。然后仅在需要时搜索。$10/年记住一切 vs $507/年的摘要（还会丢失上下文）。

---

## 工作原理

### 记忆宫殿

布局相当简单，尽管花了很长时间才达到这个效果。

从一个**翼区（Wing）**开始。你要归档的每个项目、人物或主题都有自己的翼区。

每个翼区有与之相连的**房间（Room）**，信息在这里被分成与该翼区相关的主题——所以每个房间是你项目包含内容的不同元素。项目想法可以是一个房间，员工可以是另一个，财务报表又是另一个。可以有无限数量的房间将翼区分成各个部分。MemPalace 安装时会自动为你检测这些，当然你可以按你觉得合适的任何方式个性化。

每个房间有一个与之相连的**壁橱（Closet）**，这里是有趣的地方。我们开发了一种 AI 语言叫做 **AAAK**。别问——这本身就是一个很长的故事。你的代理每次唤醒时都会学习 AAAK 速记。因为 AAAK 本质上是英语，只是一个非常精简的版本，你的代理几秒钟就能理解如何使用它。它作为安装的一部分内置在 MemPalace 代码中。在我们的下一个更新中，我们会将 AAAK 直接添加到壁橱中，那将是一个真正的革命——壁橱中的信息量会大得多，但占用的空间和代理的阅读时间都会少得多。

壁橱里面是**抽屉（Drawer）**，你的原始文件就存放在抽屉里。在这个第一版中，我们还没有将 AAAK 用作壁橱工具，但即便如此，在我们跨多个基准测试平台进行的所有测试中，摘要已经显示了 **96.6% 的召回率**。一旦壁橱使用 AAAK，搜索将更快，同时保持每个字的精确。但即使现在，壁橱方法已经极大地提高了小空间中存储的信息量——它可以轻松引导你的 AI 代理到存放原始文件的抽屉。你永远不会丢失任何东西，而且这一切都在几秒钟内完成。

还有**大厅（Hall）**，连接同一翼区内的房间，以及**隧道（Tunnel）**，将不同翼区的房间相互连接。所以找东西变得真正毫不费力——我们给 AI 一种干净有序的方式来知道从哪里开始搜索，而不必遍历大文件夹中的每个关键词。

你说出你要找的东西，嘣，它已经知道该去哪个翼区了。光*这一点*本身就能产生很大的区别。但这是优美、优雅、有机的，最重要的是，高效的。

```
  ┌─────────────────────────────────────────────────────────────┐
  │  翼区: 人物                                                  │
  │                                                            │
  │    ┌──────────┐  ──大厅──  ┌──────────┐                     │
  │    │  房间 A   │            │  房间 B   │                     │
  │    └────┬─────┘            └──────────┘                    │
  │         │                                                  │
  │         ▼                                                  │
  │    ┌──────────┐      ┌──────────┐                          │
  │    │   壁橱   │ ───▶ │   抽屉   │                           │
  │    └──────────┘      └──────────┘                          │
  └─────────┼──────────────────────────────────────────────────┘
            │
          隧道
            │
  ┌─────────┼──────────────────────────────────────────────────┐
  │  翼区: 项目                                                  │
  │         │                                                  │
  │    ┌────┴─────┐  ──大厅──  ┌──────────┐                     │
  │    │  房间 A   │            │  房间 C   │                     │
  │    └────┬─────┘            └──────────┘                    │
  │         │                                                  │
  │         ▼                                                  │
  │    ┌──────────┐      ┌──────────┐                          │
  │    │   壁橱   │ ───▶ │   抽屉   │                           │
  │    └──────────┘      └──────────┘                          │
  └─────────────────────────────────────────────────────────────┘
```

**翼区（Wing）** — 一个人物或项目。数量不限。
**房间（Room）** — 翼区内的具体主题。认证、计费、部署——无限房间。
**大厅（Hall）** — *同一*翼区内相关房间之间的连接。如果房间 A（认证）和房间 B（安全）相关，大厅将它们链接。
**隧道（Tunnel）** — *不同*翼区之间的连接。当人物 A 和一个项目都有关于"认证"的房间时，隧道会自动交叉引用它们。
**壁橱（Closet）** — 指向原始内容的摘要。（在 v3.0.0 中这些是纯文本摘要；AAAK 编码的壁橱将在未来更新中推出——参见 [Task #30](https://github.com/milla-jovovich/mempalace/issues/30)。）
**抽屉（Drawer）** — 原始逐字文件。精确的原文，从不摘要。

**大厅**是记忆类型——每个翼区都相同，充当走廊：
- `hall_facts` — 做出的决策，锁定的选择
- `hall_events` — 会话、里程碑、调试
- `hall_discoveries` — 突破、新见解
- `hall_preferences` — 习惯、喜好、观点
- `hall_advice` — 建议和解决方案

**房间**是命名的主题——`auth-migration`、`graphql-switch`、`ci-pipeline`。当同一个房间出现在不同翼区中时，它会创建一个**隧道**——跨领域连接同一主题：

```
wing_kai       / hall_events / auth-migration  → "Kai 调试了 OAuth token 刷新"
wing_driftwood / hall_facts  / auth-migration  → "团队决定将认证迁移到 Clerk"
wing_priya     / hall_advice / auth-migration  → "Priya 批准了 Clerk 而非 Auth0"
```

同一个房间。三个翼区。隧道将它们连接。

### 为什么结构很重要

在 22,000+ 条真实对话记忆上测试：

```
搜索所有壁橱:          60.9%  R@10
在翼区内搜索:          73.1%  (+12%)
搜索翼区 + 大厅:       84.8%  (+24%)
搜索翼区 + 房间:       94.8%  (+34%)
```

翼区和房间不是装饰性的。它们带来了 **34% 的检索提升**。宫殿结构就是产品。

### 记忆栈

| 层级 | 内容 | 大小 | 何时使用 |
|------|------|------|---------|
| **L0** | 身份——这个 AI 是谁？ | 约 50 token | 始终加载 |
| **L1** | 关键事实——团队、项目、偏好 | 约 120 token（AAAK） | 始终加载 |
| **L2** | 房间回忆——最近会话、当前项目 | 按需 | 话题出现时 |
| **L3** | 深度搜索——跨所有壁橱的语义查询 | 按需 | 被明确要求时 |

你的 AI 带着 L0 + L1（约 170 token）唤醒，就知道你的世界。搜索仅在需要时触发。

### AAAK 方言（实验性）

AAAK 是一个有损缩写系统——实体编码、结构标记和句子截断——设计用于在大规模场景下将重复实体和关系压缩为更少的 token。它**可被任何能读取文本的 LLM 阅读**（Claude、GPT、Gemini、Llama、Mistral），无需解码器，因此本地模型无需任何云端依赖即可使用。

**诚实状态（2026 年 4 月）：**

- **AAAK 是有损的，不是无损的。** 它使用基于正则表达式的缩写，不是可逆压缩。
- **在小规模下不节省 token。** 短文本已经能高效分词。AAAK 的开销（编码、分隔符）在少量句子上的成本高于节省。
- **在大规模下可以节省 token** — 在有大量重复实体的场景中（一个团队被提到数百次，同一项目跨越数千个会话），实体编码会摊薄开销。
- **AAAK 目前在 LongMemEval 上比原始逐字检索有所退步**（84.2% R@5 vs 96.6%）。96.6% 的标题数字来自**原始模式**，不是 AAAK 模式。
- **MemPalace 的默认存储是 ChromaDB 中的原始逐字文本**——基准测试的优势就来自于此。AAAK 是用于上下文加载的独立压缩层，不是存储格式。

我们正在改进方言规范，添加真正的分词器用于统计，并探索更好的使用时机。在 [Issue #43](https://github.com/milla-jovovich/mempalace/issues/43) 和 [#27](https://github.com/milla-jovovich/mempalace/issues/27) 中跟踪进展。

### 矛盾检测（实验性，尚未接入知识图谱）

一个独立的工具（`fact_checker.py`）可以对照实体事实检查断言。它目前不会被知识图谱操作自动调用——这正在修复中（在 [Issue #27](https://github.com/milla-jovovich/mempalace/issues/27) 中跟踪）。启用后它可以捕捉到：

```
输入:  "Soren 完成了认证迁移"
输出: 🔴 AUTH-MIGRATION: 归属冲突——Maya 被指派，不是 Soren

输入:  "Kai 在这里已经 2 年了"
输出: 🟡 KAI: 任期错误——记录显示 3 年（2023-04 入职）

输入:  "冲刺在周五结束"
输出: 🟡 SPRINT: 日期过时——当前冲刺在周四结束（2 天前更新）
```

事实对照知识图谱检查。年龄、日期和任期动态计算——不是硬编码。

---

## 真实场景示例

### 独立开发者跨多个项目

```bash
# 挖掘每个项目的对话
mempalace mine ~/chats/orion/  --mode convos --wing orion
mempalace mine ~/chats/nova/   --mode convos --wing nova
mempalace mine ~/chats/helios/ --mode convos --wing helios

# 六个月后："我为什么在这里用 Postgres？"
mempalace search "database decision" --wing orion
# → "选择 Postgres 而非 SQLite，因为 Orion 需要并发写入
#    且数据集将超过 10GB。决定于 2025-11-03。"

# 跨项目搜索
mempalace search "rate limiting approach"
# → 在 Orion 和 Nova 中都找到你的方案，显示差异
```

### 团队负责人管理产品

```bash
# 挖掘 Slack 导出和 AI 对话
mempalace mine ~/exports/slack/ --mode convos --wing driftwood
mempalace mine ~/.claude/projects/ --mode convos

# "Soren 上个冲刺做了什么？"
mempalace search "Soren sprint" --wing driftwood
# → 14 个壁橱：OAuth 重构、深色模式、组件库迁移

# "谁决定用 Clerk？"
mempalace search "Clerk decision" --wing driftwood
# → "Kai 推荐 Clerk 而非 Auth0——定价 + 开发者体验。
#    团队于 2026-01-15 同意。Maya 负责迁移。"
```

### 挖掘前：拆分大文件

有些转录导出会将多个会话合并到一个大文件中：

```bash
mempalace split ~/chats/                      # 拆分为每个会话的文件
mempalace split ~/chats/ --dry-run            # 先预览
mempalace split ~/chats/ --min-sessions 3     # 只拆分包含 3 个以上会话的文件
```

---

## 知识图谱

时序实体-关系三元组——类似 Zep 的 Graphiti，但用 SQLite 替代 Neo4j。本地且免费。

```python
from mempalace.knowledge_graph import KnowledgeGraph

kg = KnowledgeGraph()
kg.add_triple("Kai", "works_on", "Orion", valid_from="2025-06-01")
kg.add_triple("Maya", "assigned_to", "auth-migration", valid_from="2026-01-15")
kg.add_triple("Maya", "completed", "auth-migration", valid_from="2026-02-01")

# Kai 在做什么？
kg.query_entity("Kai")
# → [Kai → works_on → Orion (当前), Kai → recommended → Clerk (2026-01)]

# 一月份什么是真的？
kg.query_entity("Maya", as_of="2026-01-20")
# → [Maya → assigned_to → auth-migration (进行中)]

# 时间线
kg.timeline("Orion")
# → 项目的时间顺序故事
```

事实具有有效期窗口。当某事不再为真时，使其失效：

```python
kg.invalidate("Kai", "works_on", "Orion", ended="2026-03-01")
```

现在查询 Kai 当前的工作不会返回 Orion。历史查询仍然会。

| 特性 | MemPalace | Zep (Graphiti) |
|------|-----------|----------------|
| 存储 | SQLite（本地） | Neo4j（云端） |
| 成本 | 免费 | $25/月+ |
| 时序有效性 | 是 | 是 |
| 自托管 | 始终 | 仅企业版 |
| 隐私 | 一切本地 | SOC 2, HIPAA |

---

## 专业代理

创建专注于特定领域的代理。每个代理在宫殿中拥有自己的翼区和日记——不在你的 CLAUDE.md 中。添加 50 个代理，你的配置大小不变。

```
~/.mempalace/agents/
  ├── reviewer.json       # 代码质量、模式、bug
  ├── architect.json      # 设计决策、权衡
  └── ops.json            # 部署、事故、基础设施
```

你的 CLAUDE.md 只需要一行：

```
You have MemPalace agents. Run mempalace_list_agents to see them.
```

AI 在运行时从宫殿中发现它的代理。每个代理：

- **有一个焦点** — 它关注什么
- **保持日记** — 用 AAAK 编写，跨会话持久化
- **积累专业知识** — 读取自己的历史以保持在其领域的敏锐

```
# 代理在代码审查后写入日记
mempalace_diary_write("reviewer",
    "PR#42|auth.bypass.found|missing.middleware.check|pattern:3rd.time.this.quarter|★★★★")

# 代理读取自己的历史
mempalace_diary_read("reviewer", last_n=10)
# → 最近 10 条发现，用 AAAK 压缩
```

每个代理都是你数据上的专业视角。审查者记住它见过的每一个 bug 模式。架构师记住每一个设计决策。运维代理记住每一次事故。它们不共享暂存区——各自维护自己的记忆。

Letta 对代理管理的记忆收费 $20–200/月。MemPalace 用一个翼区就做到了。

---

## MCP 服务器

```bash
# 通过插件（推荐）
claude plugin marketplace add milla-jovovich/mempalace
claude plugin install --scope user mempalace

# 或手动配置
claude mcp add mempalace -- python -m mempalace.mcp_server
```

### 19 个工具

**宫殿（读取）**

| 工具 | 功能 |
|------|------|
| `mempalace_status` | 宫殿概览 + AAAK 规范 + 记忆协议 |
| `mempalace_list_wings` | 翼区及计数 |
| `mempalace_list_rooms` | 翼区内的房间 |
| `mempalace_get_taxonomy` | 完整的翼区 → 房间 → 计数树 |
| `mempalace_search` | 带翼区/房间过滤的语义搜索 |
| `mempalace_check_duplicate` | 归档前查重 |
| `mempalace_get_aaak_spec` | AAAK 方言参考 |

**宫殿（写入）**

| 工具 | 功能 |
|------|------|
| `mempalace_add_drawer` | 归档逐字内容 |
| `mempalace_delete_drawer` | 按 ID 删除 |

**知识图谱**

| 工具 | 功能 |
|------|------|
| `mempalace_kg_query` | 带时间过滤的实体关系 |
| `mempalace_kg_add` | 添加事实 |
| `mempalace_kg_invalidate` | 标记事实为已结束 |
| `mempalace_kg_timeline` | 实体的时间顺序故事 |
| `mempalace_kg_stats` | 图谱概览 |

**导航**

| 工具 | 功能 |
|------|------|
| `mempalace_traverse` | 从一个房间出发遍历跨翼区的图 |
| `mempalace_find_tunnels` | 查找连接两个翼区的房间 |
| `mempalace_graph_stats` | 图连通性概览 |

**代理日记**

| 工具 | 功能 |
|------|------|
| `mempalace_diary_write` | 写入 AAAK 日记条目 |
| `mempalace_diary_read` | 读取最近的日记条目 |

AI 从 `mempalace_status` 的响应中自动学习 AAAK 和记忆协议。无需手动配置。

---

## 自动保存钩子

两个 Claude Code 钩子，在工作时自动保存记忆：

**保存钩子** — 每 15 条消息触发一次结构化保存。主题、决策、引用、代码变更。同时重新生成关键事实层。

**预压缩钩子** — 在上下文压缩前触发。窗口缩小前的紧急保存。

```json
{
  "hooks": {
    "Stop": [{"matcher": "", "hooks": [{"type": "command", "command": "/path/to/mempalace/hooks/mempal_save_hook.sh"}]}],
    "PreCompact": [{"matcher": "", "hooks": [{"type": "command", "command": "/path/to/mempalace/hooks/mempal_precompact_hook.sh"}]}]
  }
}
```

**可选自动摄取：** 将 `MEMPAL_DIR` 环境变量设为目录路径，钩子将在每次保存触发时自动运行 `mempalace mine`（停止时后台运行，预压缩时同步运行）。

---

## 基准测试

在标准学术基准上测试——可复现、公开发布的数据集。

| 基准测试 | 模式 | 分数 | API 调用 |
|----------|------|------|---------|
| **LongMemEval R@5** | 原始（仅 ChromaDB） | **96.6%** | 零 |
| **LongMemEval R@5** | 混合 + Haiku 重排序 | **100%**（500/500） | 约 500 |
| **LoCoMo R@10** | 原始，会话级 | **60.3%** | 零 |
| **个人宫殿 R@10** | 启发式基准 | **85%** | 零 |
| **宫殿结构影响** | 翼区+房间过滤 | **+34%** R@10 | 零 |

96.6% 的原始分数是已发布的最高 LongMemEval 结果，无需 API 密钥、无云端、且在任何阶段都不使用 LLM。

### 对比已发布的系统

| 系统 | LongMemEval R@5 | 需要 API | 成本 |
|------|----------------|----------|------|
| **MemPalace（混合）** | **100%** | 可选 | 免费 |
| Supermemory ASMR | ~99% | 是 | — |
| **MemPalace（原始）** | **96.6%** | **无** | **免费** |
| Mastra | 94.87% | 是（GPT） | API 费用 |
| Mem0 | ~85% | 是 | $19–249/月 |
| Zep | ~85% | 是 | $25/月+ |

---

## 所有命令

```bash
# 设置
mempalace init <dir>                              # 引导式设置 + AAAK 引导

# 挖掘
mempalace mine <dir>                              # 挖掘项目文件
mempalace mine <dir> --mode convos                # 挖掘对话导出
mempalace mine <dir> --mode convos --wing myapp   # 标记翼区名称

# 拆分
mempalace split <dir>                             # 拆分合并的转录
mempalace split <dir> --dry-run                   # 预览

# 搜索
mempalace search "query"                          # 搜索所有
mempalace search "query" --wing myapp             # 在翼区内搜索
mempalace search "query" --room auth-migration    # 在房间内搜索

# 记忆栈
mempalace wake-up                                 # 加载 L0 + L1 上下文
mempalace wake-up --wing driftwood                # 特定项目

# 压缩
mempalace compress --wing myapp                   # AAAK 压缩

# 状态
mempalace status                                  # 宫殿概览

# MCP
mempalace mcp                                     # 显示 MCP 设置命令
```

所有命令接受 `--palace <path>` 来覆盖默认位置。

---

## 配置

### 全局配置（`~/.mempalace/config.json`）

```json
{
  "palace_path": "/custom/path/to/palace",
  "collection_name": "mempalace_drawers",
  "people_map": {"Kai": "KAI", "Priya": "PRI"}
}
```

### 翼区配置（`~/.mempalace/wing_config.json`）

由 `mempalace init` 生成。将你的人物和项目映射到翼区：

```json
{
  "default_wing": "wing_general",
  "wings": {
    "wing_kai": {"type": "person", "keywords": ["kai", "kai's"]},
    "wing_driftwood": {"type": "project", "keywords": ["driftwood", "analytics", "saas"]}
  }
}
```

### 身份文件（`~/.mempalace/identity.txt`）

纯文本。成为第 0 层——每次会话加载。

---

## 文件参考

| 文件 | 功能 |
|------|------|
| `cli.py` | CLI 入口点 |
| `config.py` | 配置加载和默认值 |
| `normalize.py` | 将 5 种聊天格式转换为标准转录 |
| `mcp_server.py` | MCP 服务器——19 个工具、AAAK 自动教学、记忆协议 |
| `miner.py` | 项目文件摄取 |
| `convo_miner.py` | 对话摄取——按交换对分块 |
| `searcher.py` | 通过 ChromaDB 进行语义搜索 |
| `layers.py` | 4 层记忆栈 |
| `dialect.py` | AAAK 压缩——30 倍无损 |
| `knowledge_graph.py` | 时序实体-关系图（SQLite） |
| `palace_graph.py` | 基于房间的导航图 |
| `onboarding.py` | 引导式设置——生成 AAAK 引导 + 翼区配置 |
| `entity_registry.py` | 实体编码注册表 |
| `entity_detector.py` | 从内容中自动检测人物和项目 |
| `split_mega_files.py` | 将合并的转录拆分为每个会话的文件 |
| `hooks/mempal_save_hook.sh` | 每 N 条消息自动保存 |
| `hooks/mempal_precompact_hook.sh` | 压缩前紧急保存 |

---

## 项目结构

```
mempalace/
├── README.md                  ← 英文版
├── README_CN.md               ← 你在这里（中文版）
├── mempalace/                 ← 核心包
│   ├── cli.py                 ← CLI 入口点
│   ├── mcp_server.py          ← MCP 服务器（19 个工具）
│   ├── knowledge_graph.py     ← 时序实体图
│   ├── palace_graph.py        ← 房间导航图
│   ├── dialect.py             ← AAAK 压缩
│   ├── miner.py               ← 项目文件摄取
│   ├── convo_miner.py         ← 对话摄取
│   ├── searcher.py            ← 语义搜索
│   ├── onboarding.py          ← 引导式设置
│   └── ...                    ← 参见 mempalace/README.md
├── benchmarks/                ← 可复现的基准测试运行器
│   ├── README.md              ← 复现指南
│   ├── BENCHMARKS.md          ← 完整结果 + 方法论
│   ├── longmemeval_bench.py   ← LongMemEval 运行器
│   ├── locomo_bench.py        ← LoCoMo 运行器
│   └── membench_bench.py      ← MemBench 运行器
├── hooks/                     ← Claude Code 自动保存钩子
│   ├── README.md              ← 钩子设置指南
│   ├── mempal_save_hook.sh    ← 每 N 条消息保存
│   └── mempal_precompact_hook.sh ← 紧急保存
├── examples/                  ← 使用示例
│   ├── basic_mining.py
│   ├── convo_import.py
│   └── mcp_setup.md
├── tests/                     ← 测试套件
├── assets/                    ← logo + 品牌素材
└── pyproject.toml             ← 包配置（v3.0.0）
```

---

## 环境要求

- Python 3.9+
- `chromadb>=0.4.0`
- `pyyaml>=6.0`

无需 API 密钥。安装后无需互联网。一切本地运行。

```bash
pip install mempalace
```

---

## 贡献

欢迎 PR。设置和指南请参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT — 参见 [LICENSE](LICENSE)。

<!-- Link Definitions -->
[version-shield]: https://img.shields.io/badge/version-3.1.0-4dc9f6?style=flat-square&labelColor=0a0e14
[release-link]: https://github.com/milla-jovovich/mempalace/releases
[python-shield]: https://img.shields.io/badge/python-3.9+-7dd8f8?style=flat-square&labelColor=0a0e14&logo=python&logoColor=7dd8f8
[python-link]: https://www.python.org/
[license-shield]: https://img.shields.io/badge/license-MIT-b0e8ff?style=flat-square&labelColor=0a0e14
[license-link]: https://github.com/milla-jovovich/mempalace/blob/main/LICENSE
[discord-shield]: https://img.shields.io/badge/discord-join-5865F2?style=flat-square&labelColor=0a0e14&logo=discord&logoColor=5865F2
[discord-link]: https://discord.com/invite/ycTQQCu6kn
