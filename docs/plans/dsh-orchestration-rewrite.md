# DSH 版编排重写方案

> **已实施**。本文是决策记录，描述方案与取舍理由，不是现行规范。
> 现行权威文档：[`docs/agents/orchestration.md`](../agents/orchestration.md)（派发契约）与 [`docs/agents/ticket-runbook.md`](../agents/ticket-runbook.md)（单 ticket 流水线）。
> 第六节的四项取舍已按推荐执行：停在开 PR、文档放 `docs/agents/`、删除原两份文件、方案暂不发 issue。

把 `command-agent.md`（调度器）与 `worker-agent.md`（单工单流水线）重写成在 **DeepSeek Harness** 上真正能跑的版本。

---

## 一、方法与依据

上游 `writing-for-agents` 的核心主张是：写文档前先确认「这份材料该以什么形态存在」。所以本方案不照搬原文结构，而是先做两件事：

1. **读真实契约**：把 9 个相关技能的实际说明读完（而非凭 README 摘要推断），确定每个技能真正做什么、由谁能调用。
2. **读真实运行时**：核对 DSH 源码里子 Agent、workflow、技能发现的实际行为与硬上限。

| 依据 | 来源 |
| --- | --- |
| `implement` 的真实职责 | `.agents/skills/implement/SKILL.md`（全文 8 行） |
| 红-绿循环、seam 需预先约定 | `.agents/skills/tdd/SKILL.md` |
| 双轴评审、并行子 Agent | `.agents/skills/code-review/SKILL.md` |
| 主流程与上下文卫生 | `.agents/skills/ask-matt/SKILL.md` |
| 相位边界决策树 | `.agents/skills/ask-matt/PHASE-BOUNDARIES.md` |
| Agent Brief 是唯一权威规格 | `.agents/skills/triage/AGENT-BRIEF.md` |
| ticket 是垂直切片 + 阻塞边 | `.agents/skills/to-tickets/SKILL.md` |
| 文档写法（信息层级、leading word、禁用否定式） | `.agents/skills/writing-for-agents/SKILL.md` |
| 技能调用机制（模型/用户调用的取舍） | `.agents/skills/writing-for-agents/SKILL-MECHANICS.md` |
| 子 Agent 共享父会话 cwd | `packages/subagent/subagent/src/child-agent.ts:146` |
| 技能发现只扫一层、`.git` 定位仓库根 | `packages/skill/skill-filesystem/src/index.ts:251,723,945` |
| workflow 并发/总量上限 | `packages/workflow/workflow-worker-thread/src/index.ts:117-119,151` |
| 子 Agent 深度上限默认 3 | `packages/subagent/tool-subagent/src/index.ts:94` |

---

## 二、原设计的六个硬结论

原文档的设计意图（调度与执行分离、环境隔离、垂直切片、禁止自审、CI 失败二分）**成立且值得保留**。但作为本仓库的配置，有六处与真实契约冲突。

### 结论 1：常驻调度循环在 DSH 里没有对应物

`command-agent.md:22` 要求「持续循环执行调度逻辑」，`:39` 要求「实时轮询所有子 Agent 状态」，`worker-agent.md:74` 要求「CI 超时 20 分钟」。

DSH 是**回合制**的：一轮由人发起，子 Agent 只在会话内存在，没有常驻 daemon，也没有可挂起的计时器。这段循环无法翻译，只能换成「按需触发的一次性派发」。

### 结论 2：`verify` 技能不存在，且违反它自己的规则

`worker-agent.md:31` 固定调用 `skill({name: "verify"})`。已安装的 25 个技能里没有 `verify`。而 `worker-agent.md:11` 自己写着「全程使用标准 skill 调用，禁止自定义流程」——它调用了一个不存在的标准技能。

### 结论 3：`implement` 不是它被指派的主开发技能

`worker-agent.md:21` 把 `implement` 当主开发技能。真实的 `implement/SKILL.md` 全文只有 8 行：用 `/tdd`、跑类型检查与测试、用 `/code-review`、**「Commit your work to the current branch」**。

它不做垂直切片，不建 worktree，不生成 PR。`worker-agent.md:101` 要求的 worktree 隔离与它「提交到当前分支」的行为**直接冲突**。

### 结论 4：用户调用型技能无法被 Agent 链式调用

这是最容易被忽略、也最能决定架构的一条。`SKILL-MECHANICS.md:10-12` 规定：设了 `disable-model-invocation: true` 的技能**没有任何 Agent 能触达**，只能人打字调用。

实测确认：本会话的技能目录里**只有模型调用型技能**（`code-review`、`tdd`、`grilling`…），用户调用型的 `implement`、`ask-matt`、`triage`、`to-spec`、`grill-with-docs` 全部不在其中。

因此「worker 自动依次驱动 implement → tdd → code-review」在 DSH 里**不可能成立**。可用的替代只有两条：

- **A. 人按 flow 顺序驱动**（`ask-matt` 描述的主流程本就是给人走的）；
- **B. 子 Agent 用文件读取**（`read .agents/skills/tdd/SKILL.md`），绕开技能调用机制。

### 结论 5：worktree 与「清理分支」自相矛盾

`command-agent.md:48` 要求「必须完整清理 worktree，禁止残留脏分支」，`worker-agent.md:85` 又要 squash 合并进主干。

PR 必须先有源分支才能存在。删了分支，PR 就失去源。这两条无法同时满足，必须二选一：**要么保留分支到合并后，要么放弃 PR 直接本地合并**。

### 结论 6：七条「禁止」正是上游点名的反模式

`worker-agent.md:100-107` 的「强制禁止反模式（零容忍）」七条全是 `禁止 X` 句式。

`writing-for-agents/SKILL.md:74` 明确指出：**用禁止来引导会把被禁行为拉进上下文，让它更可用**（"don't think of an elephant"）。正确做法是**陈述正面目标**，禁令只留作无法正面表达的硬护栏。

这七条可以无损改写为正面表述，例如「禁止跳过 RED 阶段」→「先写失败测试，再写让它通过的最小实现」。

---

## 三、原设计概念 → DSH 真实对应物

| 原设计概念 | DSH 真实对应物 | 说明 |
| --- | --- | --- |
| Issue 任务池 | GitHub Issues | 已配置，`gh` 在沙箱内可用 |
| DAG 阻塞边 | GitHub 原生 blocked_by | `to-tickets` 在真 tracker 上直接写原生依赖 |
| 「就绪可调度队列」 | **frontier**：阻塞项全部完成的 ticket | `ask-matt` 已有此概念，无需自建队列 |
| 调度循环 | **人驱动的一次性派发** | 或用 `workflow` 扇出 |
| 子 Agent 隔离 | `subagent` / `workflow` | ⚠️ 子 Agent 共享父 cwd，隔离靠 git worktree |
| 失败重试 `max_retry=3` | 无内建机制 | 每轮显式重派，或 workflow 的 per-item 处理 |
| `skill({name:"implement"})` | 读 `implement/SKILL.md` 并执行 | ⚠️ 用户调用型技能，Agent 无法用技能机制触达 |
| `skill({name:"tdd"})` | 读 `tdd/SKILL.md` 并执行 | 同上 |
| `skill({name:"code-review"})` | 读 `code-review/SKILL.md` 并执行 | 该技能内部自会并行拉两个子 Agent |
| `skill({name:"verify"})` | **无对应物** | 需内联「类型检查 + 测试 + 构建」为 runbook 步骤 |
| 独立评审实例 | `code-review` 内部的并行子 Agent | 已内建，且做的是双轴（规范 + 规格） |
| Agent Brief | `AGENT-BRIEF.md` 定义的结构化 issue 评论 | 是 worker 的权威输入，比原 JSON 入参更丰富 |
| 固定 JSON 入参 | ticket + Agent Brief 正文 | 无需自定义结构体，tracker 本身就是接口 |
| 垂直切片 | `to-tickets` 的 tracer-bullet 规则 | 已在 ticket 生成阶段强制 |
| CI 二分处理 | 保留（有价值），但阈值改为显式 | 原「20 分钟超时」需人工确认 |
| 自动合并 | **改为停在 PR**（建议） | 见第六节待确认项 |
| 自动解冲突 | `/resolving-merge-conflicts` | 该技能要求按意图逐块解析，**绝不 `--abort`**；自动吞掉冲突与其设计相悖 |
| 标签 `ready-for-agent` | 一致 | 仓库已建 |
| 标签 `hitl-required` / `afk-available` / `blocked` | 无对应，应废弃 | 统一为 `ready-for-human` / `ready-for-agent` / 原生依赖 |

### 运行时硬上限（本机实测）

| 限制 | 值 | 来源 |
| --- | --- | --- |
| workflow 并发子 Agent | 默认 `min(16, 核数-2)` = **14**（本机 16 核） | `workflow-worker-thread/src/index.ts:151` |
| workflow 单次总子 Agent 数 | **1000** | 同文件 `:118` |
| workflow 单次 hook 处理条目 | 4096 | 同文件 `:119` |
| `subagent` 深度上限 | 默认 **3**（0 表示禁止派生） | `tool-subagent/src/index.ts:94` |
| 子 Agent 工作目录 | **继承父会话 cwd，非隔离副本** | `subagent/src/child-agent.ts:146` |

最后一条是并发的根本约束：**并行派发多个 ticket 必须各自 `git worktree`，否则会在同一工作区互相踩踏。**

---

## 四、三个候选方案

### 方案甲：只重写文档，全部人工驱动

两份文件改写成 DSH 版 runbook，人按 `/implement` 逐个 ticket 走，上下文用 `/clear` 隔离。

- ✅ 零额外上下文开销；与上游 flow 完全一致；不会与 `ask-matt` 打架
- ❌ 没有自动化，原设计追求的「AFK 调度」完全放弃
- 适合：只想要一份准确的执行规范

### 方案乙：runbook + 模型调用型 dispatcher 技能（推荐）

在方案甲基础上，增加一个**模型调用型**技能负责派发，实现部分自动化。

- dispatcher 解析 blocked_by 图 → 取 frontier → 对每个就绪 ticket 派 `subagent` → 收集结构化报告
- ✅ 保留了原设计的核心价值（DAG + 隔离 + 独立评审）
- ✅ 一次派发多个 ticket，是本方案的性能收益来源
- ⚠️ 模型调用型技能会带来**常驻上下文开销**（description 每轮都在）
- 边界：派发与汇总自动，**合并与验收仍由人决定**

### 方案丙：workflow 脚本批量扇出

用 `workflow` 工具写 JS 脚本，把一批 ticket 跑 `pipeline()`。

- ✅ 吞吐最高，14 路并发
- ❌ workflow 无文件系统访问，纯协调层，复杂逻辑写不进去
- ❌ 脚本要现写现跑，不是可复用资产
- 适合：一次性的大批量迁移

**推荐乙。** 理由是它在「自动化程度」与「与上游契约一致」之间取平衡，且 dispatcher 是唯一需要模型调用型的部分——runbook 本身仍可以是用户调用型，零常驻开销。

---

## 五、推荐方案的详细设计

### 5.1 文件布局

```
.agents/skills/
  dispatch-tickets/
    SKILL.md            ← 模型调用型（有 description，父 Agent 可自主触发）
docs/agents/
  orchestration.md      ← 派发契约：队列语义、隔离规则、失败处理、返回结构
  ticket-runbook.md     ← 单 ticket 执行流水线（正面表述，含完成判据）
```

**为什么这样分**（依据 `SKILL.md:31-43` 的信息层级 + `:54-59` 的拆分规则）：

- `dispatch-tickets` 必须是技能：父 Agent 要能自主触达，这只有模型调用型能做到。
- runbook 放在 `docs/agents/` 而非技能：它是**被内联进子 Agent prompt 的文本**，如果做成技能，每个子 Agent 都要多一次读取往返；作为普通文档，派发方直接读进来拼进 prompt。
- 两份文档**不合并**：派发逻辑与执行逻辑的读者不同（父 vs 子），合并会让每个读者都载入无关的一半。

### 5.2 runbook 的结构（对应 `worker-agent.md`）

按信息层级重排，每个阶段给出**可判定的完成判据**（`SKILL.md:47-52`）：

| 阶段 | 内容 | 完成判据 |
| --- | --- | --- |
| 0 环境 | 建 worktree、切 `issue/<n>-<slug>` 分支 | `git worktree list` 含该路径；分支存在 |
| 1 读规格 | 读 issue 正文 + Agent Brief 评论 | 能复述验收标准条目数与 Out of scope |
| 2 定 seam | 写下将要测试的 seam，**先与用户确认** | 用户确认（`tdd/SKILL.md:22` 强制） |
| 3 红绿循环 | 一次一个 seam：红 → 绿 | 每个验收标准都有对应通过的测试 |
| 4 本地验证 | 类型检查 + 测试 + 构建全绿 | 三条命令退出码均为 0 |
| 5 双轴评审 | 读 `code-review/SKILL.md` 执行 | 两个轴的报告均已产出；阻断级问题为零 |
| 6 交付 | 提交、推送、开 PR | PR URL 可访问，且关联 issue |
| 7 报告 | 返回结构化结果 | 返回体含 issue_id / status / pr_url |

关键改动：

- **第 2 阶段的 seam 确认是硬闸门**。`tdd/SKILL.md:22` 原文：「No test is written at an unconfirmed seam.」原 worker 文档完全没有这一环。
- **第 3 阶段去掉「重构态」**。`tdd/SKILL.md:38` 明确：「Refactoring is not part of the loop.」重构属于评审阶段。原 worker 把重构塞进红绿循环，与上游冲突。
- **第 5 阶段不再自建评审实例**，改为读取 `code-review/SKILL.md`——它内部已经并行拉两个子 Agent，且做的是双轴，比原设计的「工程规范轴 + 需求对齐轴」更完整。

### 5.3 dispatcher 的逻辑（对应 `command-agent.md`）

```
1. 取任务：gh issue list --label ready-for-agent --state open
2. 过滤 frontier：剔除有未关闭 blocker 的、已 assign 的
3. 逐条派发：subagent(prompt = 契约 + runbook + ticket 内容, run_in_background: true)
4. 收集：子 Agent 结算后回报（issue_id / status / pr_url / error）
5. 汇总：输出表格 + 失败清单；合并与验收交还给人
```

**正面表述的约束**（替代原「强制约束规则」七条）：

- 派发前先建 worktree，保证子 Agent 在独立工作区运行
- 每个 ticket 一个子 Agent，一个分支
- 子 Agent 结算后，由父级清理其 worktree
- 循环依赖在派发前检出并标记为需人工处理

**关于重试**：DSH 无内建 `max_retry`。改为**显式重派**——派发方在收到 `status: failed` 后，检查错误类型再决定是否重派，并把重试次数写进汇总表。这比一个固定数字更诚实。

### 5.4 失败处理（保留原设计的二分法）

原 `worker-agent.md:63-69` 的「代码缺陷 vs 基础设施抖动」二分值得保留，改为显式操作：

| 失败类型 | 判定信号 | 动作 |
| --- | --- | --- |
| 代码缺陷 | 测试失败、类型错误、lint 不过 | 回到红绿循环，重走 3→4→5 |
| 基础设施抖动 | 依赖拉取失败、网络异常 | 只重跑该命令 |
| 规格不清 | 验收标准互相矛盾或缺失 | **停下来问人**，不猜 |

CI 超时阈值改为派发时显式传入，不写死在文档里。

---

## 六、待你确认的取舍

### 待确认 1：worker 在第 6 阶段停在哪里？

- **A. 停在开 PR（推荐）**：PR 是天然的人工闸门，与「未经审查不合并」一致，也让 CI 结果真正起作用
- **B. 自动 squash 合并**：更接近原设计，但会让 `code-review` 的阻断判定形同虚设，且与保留分支的需求冲突
- **C. 本地合并、不开 PR**：最接近 `implement` 的原始行为（提交到当前分支），但失去 CI 与评审留痕

### 待确认 2：`docs/agents/orchestration.md` 与 runbook 放哪？

- **A. `docs/agents/`（推荐）**：与 `domain.md`、`issue-tracker.md` 同级，语义一致
- **B. 保留在仓库根目录**：与原文件位置一致，改动最小

### 待确认 3：原两份文件怎么处理？

- **A. 删除（推荐）**：git 历史已保留（commit `8c16dae`），可随时取回
- **B. 保留并加废弃标记**：多两份会让人误读的文档

### 待确认 4：是否把本方案也发到 GitHub issue？

便于按新工单流追踪，也顺便验证一遍 `gh issue create` 链路。

---

## 七、实施步骤（确认后）

1. 写 `docs/agents/ticket-runbook.md`
2. 写 `docs/agents/orchestration.md`
3. 写 `.agents/skills/dispatch-tickets/SKILL.md`（模型调用型，带 description）
4. 用本次的验证脚本思路，校验技能可被 DSH 发现（25 → 26）
5. 删除或标记原两份文件
6. 在 `AGENTS.md` 加一行指针，指向 orchestration 文档
7. 提交并推送

**验收判据**：`dispatch-tickets` 出现在 DSH 技能目录中；两份 `docs/agents/` 文档无「禁止 X」句式（`writing-for-agents/SKILL.md:74`）；runbook 每个阶段都有可判定的完成判据。
