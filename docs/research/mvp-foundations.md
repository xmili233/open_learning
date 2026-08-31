# MVP 基础研究底稿

> 截止 2026-08-31 的研究笔记；这不是 README，也不是最终产品方案。文中用 `[事实]` 表示原始资料直接支持，用 `[推论]` 表示基于事实的设计判断，用 `[假设/待验证]` 表示尚未被官方文档或学习实验确认的事项。
>
> 其中 MCP 候选分析保留为历史研究记录，不代表当前架构。当前已采用 [`CLI_FIRST_ARCHITECTURE.md`](../CLI_FIRST_ARCHITECTURE.md) 的 Skill → CLI → 本机 IPC 方案。

## 0. 先行结论：把 MVP 定义为一条可测的本地闭环

- `[事实]` Codex Voice 是 ChatGPT 桌面端中的宿主能力，可在 Codex 任务中进行语音轮次、打断、追问和方向变更；Voice 遵循该任务已有的权限，当前官方定价页说明桌面 Voice 不能通过 API key 调用。[官方 Voice 文档](https://learn.chatgpt.com/docs/features/voice) [官方定价与用量文档](https://learn.chatgpt.com/docs/pricing) `[推论]` 对本项目应把它当作宿主能力，而不是 Electron 可直接嵌入的语音 API。
- `[推论]` 最小技术闭环应是：**Codex 桌面端 Voice（项目不实现）→ 已加载的 skill → 一个受限的本地 MCP/工具接口 → Electron 主进程校验 → 实时教学工作区渲染与读回**。Electron 只负责教学过程中的画板状态、会话恢复和安全的工具边界；课后总结不是这条链路的主要目标。
- `[假设/待验证]` 官方文档没有承诺“Voice 一定能在所有桌面端计划、地区和配置下调用本地自定义 MCP 并控制一个正在运行的 Electron 实例”。这必须在目标平台上做安装后端到端测试，不能写成产品保证。
- `[范围排除]` 本项目不实现 OpenAI Realtime API、WebRTC/WebSocket/SIP 音频链路、麦克风采集、STT/TTS、语音模型或语音传输；不把 Codex Voice 复制进 Electron。subagent、多代理编排、任意 HTML/脚本画布和远程内容也不属于第一版闭环。

## 1. Codex Voice：可复用宿主，不拥有其 SLA

| `[事实]` | 对 MVP 的含义 |
|---|---|
| Voice 可在 ChatGPT 桌面端的 Chat、Work、Codex 中通过自然轮次交流；用户可以在响应中打断、追问或改变方向，也能开始新线程、检查已有线程并发送后续指令。[Voice 文档](https://learn.chatgpt.com/docs/features/voice) | 画板动作应可被中途改向，并提供可读的当前状态；不要假定一次语音指令必然完整结束。 |
| Voice 需先进入 voice chat；首次使用可能请求麦克风及 macOS 屏幕上下文权限。屏幕上下文会采集前台窗口的图像和可访问文本。[Voice 文档](https://learn.chatgpt.com/docs/features/voice) | 应明确告知用户权限和隐私边界；MVP 不需要额外申请麦克风或屏幕权限，画板可作为普通本地窗口运行。 |
| Voice 的可用性受计划、工作区 rollout、麦克风权限及桌面端状态影响；桌面端同时只允许一个活动 Voice 会话，语音有独立的滚动时间窗口。通过 Voice 启动的任务仍消耗 Codex 用量；当前官方页说明桌面 Voice 不能用 API key 调用。[Voice 文档](https://learn.chatgpt.com/docs/features/voice) [定价与用量文档](https://learn.chatgpt.com/docs/pricing) | 不承诺“无限语音”或统一成本；引导页应有宿主要求和失败提示，产品指标应记录失败原因。 |
| 截止本文日期，官方定价页按计划给出桌面 Voice 的约略时长/额度（例如 Plus 约 15–30 分钟、部分 Pro 档位约 1–2.5 小时，Business/Edu/Enterprise 的信用额度按约 6 credits/分钟计）；页面同时说明无限 Voice 不等于无限 Codex 任务。[定价与用量文档](https://learn.chatgpt.com/docs/pricing) | 这些数字和计划规则会变动，只能用于当前测试成本预算，不能写成项目承诺；记录实际计划、用量和失败原因。 |
| 官方 Voice 文档描述能力和用量，没有给出本项目可采用的端到端延迟 SLA。[Voice 文档](https://learn.chatgpt.com/docs/features/voice) | 测量“用户停止说话→画板出现最终状态”的 p50/p95，以及打断后恢复时间；不要从语音文案推导性能承诺。 |

## 2. Skill、AGENTS.md、Plugin 与本地 MCP 的边界

### 2.1 配置与分发不是运行时授权

- `[事实]` Skill 是包含 `SKILL.md`、资源和可选脚本的任务工作流包；Codex 会按名称/描述渐进式发现，选中后再读取完整指令。Skill 可在仓库 `.agents/skills`、用户 `~/.agents/skills` 等位置发现，并可通过 `agents/openai.yaml` 声明工具依赖。[Build skills 文档](https://learn.chatgpt.com/docs/build-skills)
- `[事实]` Codex 在工作前读取层级化的 `AGENTS.md`；全局、项目根到当前目录的指导会合并，越近的文件越晚生效，默认合并大小上限为 32 KiB。[AGENTS.md 文档](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- `[事实]` Plugin 是可安装分发包，可同时包含 skill、MCP server 或两者；官方将 standalone skill 定位为个人/迭代工作流，将 plugin 定位为需要共享、打包或分发的稳定能力。[Build plugins 文档](https://learn.chatgpt.com/docs/build-plugins)
- `[推论]` 安装 skill、读取 AGENTS.md、安装 plugin 都不应被视为“已启动画板服务”或“已授予 Electron 权限”。尤其 `agents/openai.yaml` 的依赖声明与自动安装/自动连接之间的关系，官方文档没有作出足够承诺。
- `[待验证]` 安装向导至少要验证：skill 是否被 Codex 发现、MCP 是否在 Codex 的 MCP 列表中、重启后是否仍可用、用户是否看到了权限/批准提示；不要仅以文件已落盘作为成功。

### 2.2 MCP/本地连接候选

`[事实]` Codex 的本地客户端可直接连接 MCP server；文档支持由命令和环境变量启动的 STDIO server，也支持 Streamable HTTP（含 bearer/OAuth）。桌面端、CLI、IDE 共享同一 Codex 主机配置；配置位于 `~/.codex/config.toml`，项目级配置只对受信任项目启用。桌面端可在 Settings → MCP servers 添加并重启，CLI 有 `codex mcp add/list/login`。[MCP 文档](https://learn.chatgpt.com/docs/extend/mcp)

| 路径 | 研究判断与风险 |
|---|---|
| **一个本地 STDIO MCP server** | `[推论]` 最适合先做协议验证：工具面窄、无需公开端口。MCP 进程如何找到正在运行的 Electron（以及应用重启、退出时如何处理）仍是本项目代码问题，需原型验证，不能由 MCP 文档替代。 |
| Skill 内的本地脚本/工具 | `[事实]` Skill 可以带可选脚本；`[待验证]` 具体 Codex 客户端如何发现、批准、传递参数和管理脚本生命周期，需要目标客户端实测，不应假定它等同于 MCP。 |
| localhost Streamable HTTP | `[事实]` 协议受支持；`[推论]` 第一版没有必要为画板增加 HTTP 监听、认证和端口生命周期，除非 STDIO 原型证明不够。 |
| Codex app-server 嵌入 Electron | `[事实]` app-server 面向富客户端提供 JSON-RPC、线程、审批和流事件，但官方将 `codex app-server` 命令及 WebSocket transport 标为 experimental/unsupported for production；部分 shell/process 能力还可能在沙箱外运行。[App server 文档](https://learn.chatgpt.com/docs/app-server)。`[推论]` 不把它作为 MVP 的生产依赖；先用已支持的 Codex 桌面端 + MCP 验证价值。 |

`[推论]` 画板工具接口应采用少量、可组合且幂等的 canonical operations（例如创建/更新/删除受限对象、连线、聚焦、清空、读取当前局部状态），返回短确认，而不是回传整张画布、HTML、SVG 或长自然语言。官方延迟指南指出生成更少输出 token、减少请求、流式传输可降低等待；定价文档也说明输入、历史、工具结果和响应都会计入用量，且每个 MCP server 会增加消息上下文。[延迟优化指南](https://developers.openai.com/api/docs/guides/latency-optimization) [定价与用量文档](https://learn.chatgpt.com/docs/pricing)

这是“更快、更省上下文”的工程推论，不是 Codex Voice 的性能或学习效果保证。工具 schema、返回大小、p50/p95 延迟和失败重试必须实际测量。

## 3. Subagent：明确后置，避免用并行换来 token 和协调成本

- `[事实]` Codex/ChatGPT Work 可以并行启动专门 subagent；每个 subagent 会独立进行模型和工具工作，通常比同等单 agent 消耗更多 token。它们适合读密集、可拆分任务；并行写入会带来冲突和协调成本。[Subagents 文档](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- `[事实]` Subagent 继承父任务的沙箱/权限模式；模型、推理强度等未指定时继承父设置，审批或非交互权限失败可能中断工作。[Subagents 文档](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- `[推论]` MVP 先不启用 subagent：单一主 agent + 单一画板工具更容易测量延迟、用量、顺序和错误。未来若加入，先限定为只读检索/总结，明确输入、输出和是否等待，不让多个 agent 同时写同一画板。

## 4. Electron 安全边界：画板渲染器必须是受限解释器

`[事实]` Electron 官方安全清单要求：远程内容不得启用 Node integration；保持 `contextIsolation`、渲染器 sandbox 和 CSP；限制导航及新窗口；处理权限请求；保持 Electron 和依赖更新；校验 IPC sender；不要把未经信任的内容交给 `shell.openExternal`。Electron 主进程权限高，渲染器应通过 IPC 请求受控能力。[Electron 安全](https://www.electronjs.org/docs/latest/tutorial/security) [进程沙箱](https://www.electronjs.org/docs/latest/tutorial/sandbox)

`[事实]` `contextIsolation` 默认开启；官方建议用 `contextBridge` 暴露窄 API，明确反对直接暴露整个 `ipcRenderer.send/invoke/on`，并要求过滤参数和事件来源。[Context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc) [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)

`[推论]` MVP 的安全底线：

1. 画板状态只接受版本化、allowlist 的结构化数据（节点类型、文本长度、坐标范围、关系类型）；拒绝 HTML、JavaScript、`eval`、任意 URL 和动态组件。
2. Electron 主进程/预加载层只暴露 `applyBoardOperation`、`getBoardSummary` 等最小函数；不把原始 IPC 或 Node API 暴露给 renderer。每次调用校验 sender、schema、大小、版本、幂等键和错误返回。
3. 默认保持 `nodeIntegration: false`、`contextIsolation: true`、sandbox 开启，并设置限制性 CSP；画板尽量使用本地打包资源/自定义协议。MVP 不嵌入远程网页；若以后必须显示远程内容，应放在单独的非特权视图并重新做导航、权限和链接审计。
4. MCP server 不应获得任意文件/命令能力。若 Electron 与本地工具通过 socket 或其他 IPC 连接，应使用仅本机可达的私有通道、握手/身份校验和超时；这是应用级安全推论，需按目标操作系统实测。

## 5. 结构化视觉表达：有依据的设计假设，不是已证实的产品效果

| 原始证据 | 能支持什么，不能支持什么 |
|---|---|
| Ainsworth 的 DeFT 框架认为，多种外部表征可能为复杂新概念提供互补、约束或建构作用，但收益取决于表征设计、教学功能和学习者需要执行的认知任务；学习者在表征之间转换也可能困难。[Learning and Instruction 原文摘要](https://www.sciencedirect.com/science/article/pii/S0959475206000259) | 支持“画板值得作为可检验媒介”；不支持“任何 AI 图示都提高学习效率”。 |
| Gobert 与 Clement 对 58 名五年级学生的板块构造学习研究发现，学生生成图示组在空间/静态及因果/动态理解后测上优于摘要/纯文本组。[Wiley 原文摘要](<https://doi.org/10.1002/(SICI)1098-2736(199901)36:1%3C39::AID-TEA4%3E3.0.CO;2-I>) | 说明特定年龄、学科、任务下“生成图示”可能有益；样本和任务不能外推到 Electron 或 agent 自动生成的画板。 |
| Wang、Yang、Kyle（2023）对 136 名中国高中生的研究中，六种画图/检索条件即时测验无显著差异；延迟测验中检索练习优于无检索，两个画图条件彼此无差异，且文献指出无指导绘图可能增加外在认知负荷。[开放获取原文](https://link.springer.com/article/10.1186/s43031-023-00083-4) | 直接提醒 MVP 不能把“有图”当作干预；应测试检索、解释、反馈、准确性和负担。 |
| Mayer 与 Moreno 的多媒体学习综述以双通道、有限容量和主动加工为理论基础，指出当加工需求超过容量时会发生认知过载。[Educational Psychologist 原文摘要](https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_6) | 可作为设计约束（少而清晰、与任务对齐）；不是本项目画板效果的实验证明。 |

`[推论]` 结构化输出可能同时带来两类工程收益：agent 只发送短操作而非整段 HTML，Electron 以固定 schema 确定性渲染；它可能让学习者获得外部化、可操作的中间表征。后半句是 `[假设/待验证]`，必须用同等内容的文本对照测量理解、延迟保持、迁移、纠错时间和错误负担，不能只测“画板是否漂亮”或 token 数。

## 6. MVP 的证据门槛与主要风险

### 必须先证明的最小闭环

1. 用户在支持的 Codex 桌面端进入 Voice；Codex 能发现指定 skill，并按明确指令调用**一个**本地 MCP/工具。
2. 工具只能产生受限 board operation；Electron 拒绝畸形、超大、越权或过期版本，渲染后可读回短摘要。
3. 安装向导、MCP 配置、Codex/Electron 重启和应用未启动时的错误均可解释；没有静默修改用户配置或静默扩大权限。
4. 记录端到端动作延迟、Voice 打断恢复、工具错误/重试、操作字节数、输入/输出 token（能取得时）和状态一致性。
5. 用小规模、预注册的理解/保持/迁移任务做文本对照；若没有学习收益或负担更高，不能宣称愿景已被验证。

### 风险与验证动作

| 风险 | 证据状态 | 第一验证 |
|---|---|---|
| Voice 的计划、地区、rollout、权限或用量限制导致不可用 | 官方已明确存在限制 | 在目标账号和 macOS/Windows 上做安装后冒烟测试，并提供失败路径。 |
| Skill 安装是否自动配置/启动自定义 MCP、Voice 是否能在讲解前或过程中触发该 MCP | 官方文档未承诺 | 完成“安装→重启→列出工具→Voice 调用→画面先出现→语音引用→连续修改→画板读回”的真实测试；只在回答结束后生成图则判定失败。 |
| Electron 与 MCP 进程连接的生命周期、身份和竞态 | 应用级未知 | 测应用关闭/重开、重复请求、乱序、超时、旧版本操作和并发写入。 |
| agent 参数错误、注入 HTML/URL 或返回过大 | 安全上必须假定会发生 | schema 校验、allowlist、大小上限、幂等键、审计日志和可恢复错误。 |
| 实时画板减少文本 token 但没有提高理解，或增加认知负荷 | 学习证据不确定 | 与相同教学策略的 Voice-only 做即时、延迟和迁移对照；只在讲解后出现的总结图不算完成实时画板干预。 |
| Electron/桌面端/Codex 文档和行为变化 | 版本敏感 | 锁定并定期升级依赖；把宿主能力探测、MCP 连通性和 renderer 安全检查加入验收。 |

### 仍需回答的关键问题

- 支持的 Codex 桌面端 Voice 是否会在实际会话中调用用户配置的自定义本地 MCP，并允许画面在对应语音讲解之前或过程中出现？哪些计划/工作区策略会改变结果？
- skill 的 `agents/openai.yaml` 工具依赖是声明、提示还是可自动安装/连接？安装向导的最小人工步骤是什么？
- MCP server 在 Electron 尚未启动、崩溃或升级时，如何返回可解释错误并恢复，而不留下可被其他进程滥用的监听面？
- 采用本地 STDIO 足以覆盖目标平台吗？若不能，何时才值得评估 localhost HTTP 或 app-server？
- 在相同学习内容和任务下，结构化画板相对短文本的收益是否超过交互、等待和纠错成本？

## 主要原始来源（访问日期：2026-08-31）

- [ChatGPT Voice](https://learn.chatgpt.com/docs/features/voice)
- [Codex pricing and usage](https://learn.chatgpt.com/docs/pricing)
- [Build skills](https://learn.chatgpt.com/docs/build-skills)
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [MCP](https://learn.chatgpt.com/docs/extend/mcp)
- [Build plugins](https://learn.chatgpt.com/docs/build-plugins)
- [Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [OpenAI latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron process sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- [Ainsworth (2006), DeFT](https://www.sciencedirect.com/science/article/pii/S0959475206000259)
- [Gobert & Clement (1999)](<https://doi.org/10.1002/(SICI)1098-2736(199901)36:1%3C39::AID-TEA4%3E3.0.CO;2-I>)
- [Wang, Yang & Kyle (2023)](https://link.springer.com/article/10.1186/s43031-023-00083-4)
- [Mayer & Moreno (2003)](https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_6)
