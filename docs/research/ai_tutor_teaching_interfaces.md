# K12 AI 教学界面与生成式白板研究

> 状态：研究结论，供 Open Learning MVP 决策
>
> 研究日期：2026-08-31
>
> 范围：聚焦 K12（少数产品覆盖大学阶段会明确标注），只采用产品官方页面、官方帮助中心/博客、官方论文或公开源码作为证据。本文不把营销页面自动当成技术事实。
>
> 证据标记：`[事实]` 是一手资料明确写出的能力；`[源码事实]` 是公开源码可直接观察到的实现；`[推论]` 是基于事实提出的架构判断；`[未知]` 是公开资料没有回答、需要实测或向厂商确认的内容。

## 0. 先给结论

### 0.1 市场上其实是四种不同的“讲解器”

| 类型 | 代表产品 | 讲解的主媒介 | Agent/系统实际做什么 |
| --- | --- | --- | --- |
| 对话式苏格拉底 | Khanmigo、ChatGPT Study Mode、Gemini Guided Learning、CK-12 Flexi | 对话、分层文字、问题、上传材料 | 选择下一问、提示、解释层级、检查理解；通常不直接操作自由画布 |
| 结构化课件/组件 | Synthesis Tutor、Photomath、Khanmigo interactive diagrams、Flint interactive artifacts | 预制或受限的图表、操作题、动画、数学模型 | 选择组件/参数/题目状态；渲染器负责确定性布局与互动 |
| 共享白板与读板 | iDroo、Flint、`ai-math-tutor` | 学生在板上写，Tutor 读取选中/可见/最近内容 | 重点是理解学生当前工作并给下一步；AI 是否写回画板必须单独核实 |
| 真人感/实时生成白板 | Studdy、ChalkLearn、Hearthslate、Dhee、Lumi、Dudely、Brightboard | 语音与“边讲边写/画”的同步体验 | 多数只有产品级声明，未公开协议；不能据此证明 AI 在发送低层笔迹 |

核心判断：**“AI 会在黑板上写”不是一个单一能力。** 至少要区分：学生自由笔迹、AI 视觉读板、AI 低层笔迹输出、AI 结构化对象输出、预制动画。当前公开一手资料中，真正可以从源码确认的，是受限的语义 action/shape，而不是任意低层画笔；产品页面常说的“实时写/画”则大多没有公开实现细节。

### 0.2 对 Open Learning 的决策

Open Learning 不应把“任意写黑板”实现为让模型生成任意页面代码、任意 DOM 或任意画布 API。推荐采用：

```text
Codex Voice 的教学对话
  → Skill 选择一个认知动作
  → open-learning CLI 提交一个小而版本化的 board patch
  → 本机校验与教学场景状态
  → 受限 renderer 渲染文字、公式、图、关系和交互
  → renderer 回读稳定对象/学生事件
  → Codex 决定下一步或等待学生
```

这同时满足三件事：

1. 语音承担因果、直觉、鼓励和提问；画板承担空间关系、步骤、变化和共同注意点。
2. 每次只传本轮必要的语义变化，减少 token，允许用户打断后取消或改写待执行动作。
3. 画板拥有布局、公式、图表和安全边界，模型不负责坐标、样式和可执行代码。

### 0.3 最重要的反营销结论

- `[事实]` Flint 的官方更新明确描述了学生白板、AI 理解白板内容并更新数学图表/生成视觉内容；这是目前产品材料中最接近“学生工作 → AI 读板 → AI 改板”的证据。
- `[源码事实]` `zicojiao/ai-math-tutor` 公开了 tldraw + LiveKit + Gemini 的完整小型实现：AI 输出的是 Zod 校验的 `write_text`、`write_formula`、`hint_card` 等语义动作，浏览器负责布局，AI shape 与 student shape 分开。这是 Open Learning 最有价值的可复用证据。
- `[事实]` Hearthslate、Studdy、ChalkLearn、Dhee、Lumi、Dudely、Brightboard 等官方页面都使用了“live whiteboard”“draw/write while explaining”一类表述；但公开资料没有证明其是逐笔生成、可读回、可取消的低层 stroke protocol。
- `[未知]` 没有找到公开资料证明任何一个上述商业产品允许 Agent 任意写入 HTML/JS，或将完整 tldraw/Excalidraw 低层对象 API 直接暴露给模型。

因此，Open Learning 的 MVP 应把“任意内容的灵活度”解释为**可组合的受限语义对象**，而不是“任意代码自由度”。

## 1. 先定义“画板能力”的五个层级

| 层级 | 定义 | 例子 | 证明标准 |
| --- | --- | --- | --- |
| L0 学生自由输入 | 学生用笔、文字、公式、图片或拖拽对象完成工作 | iDroo、Flint、tldraw POC | 产品帮助/可运行界面确认学生能编辑 |
| L1 AI 视觉读板 | AI 接收截图、结构化 shape、选中对象或可见区域，给语言反馈 | iDroo、Flint、`ai-math-tutor` | 官方文档或源码明确输入上下文 |
| L2 AI 低层笔迹 | Agent 逐笔输出 stroke/pointer path，笔迹本身是协议对象 | 商业页面偶有“real pen strokes”声明 | 必须有公开协议、源码或可重复 demo；截图不算 |
| L3 AI 结构化对象 | Agent 输出文字、公式、点、线、箭头、卡片、图表或状态动作；renderer 画出来 | `ai-math-tutor`、MathVoice、Khanmigo 图表、Photomath | schema/action/renderer 可审计 |
| L4 预制/确定性动画 | 系统用题型或概念模板回放步骤、曲线、棋子、数字块等 | Photomath、Synthesis、Duolingo avatar | 官方明确模板/动画或可观察的固定组件 |

“像老师在黑板上写”可能只是 L4 动画，也可能是 L3 结构化对象的时间序列；只有 L2 才是低层笔迹。L2 不是教学价值的必要条件，甚至可能使回放、校验、布局稳定性和多语言成本更差。

## 2. 产品矩阵：K12 如何讲解

下表把“官方承诺”和“我们可以推断的技术”分开。除特别标注外，未声称对产品进行了独立的运行时测试。

| 产品 | 目标与教学策略 | 视觉媒介 | 实时/打断 | Agent 控制粒度 | 评估、安全与可信度 |
| --- | --- | --- | --- | --- | --- |
| Khanmigo | 面向学习者的引导式 tutor，不直接代答；新版本可生成互动数学/科学图 | 互动图表、几何形状、平行坐标图；不是自由白板 | 学生拖动图形后 tutor 响应；无逐笔协议 | `[未知]` Gemini 图表输出 schema 未公开 | 图表相关性/清晰度评估；内容与 moderation；家长/教师可见性 |
| ChatGPT Study Mode | 先问目标/基础，分层解释、苏格拉底提问、知识检查 | 文字、上传的笔记/图片/PDF；可请求图表，但可用工具取决于会话 | Voice 可被打断是 ChatGPT 能力；Study Mode 没有专属画板协议 | 自然语言回答；无公开 board action | 官方承认会犯错、偶尔直接给答案；需遵循学校规则 |
| Gemini Guided Learning / LearnLM | 探究问题、分步拆解、按需要适配；LearnLM 是教育调优能力 | 图片、图示、视频、互动 quiz、卡片/学习指南 | 对话轮次与 quiz 互动；无逐笔证据 | `[未知]` 卡片/互动输出 schema 未公开 | Google 说明生成式 AI 可能出错，需要事实核查；研究/红队为厂商披露 |
| Synthesis Tutor | K–5 数学微课、数字操作物、连续微评估；掌握后推进 | digital playground、可操作模型、清晰可视化 | 按作答调整节奏/难度；无自由画板或语音打断证据 | 可能由课程组件/状态机驱动；内部 schema 未公开 | 每课 micro-assessment、教师进度报告；确定性内容占比高 |
| Photomath | 扫题后给多种方法、逐步推导、提示和概念解释 | OCR 后的公式、图形、number line/chips/tiles 等 Animated Tutorials | 扫描很快；动画是可回放教程，不是实时共画 | 求解器/专家规则/动画模板；无公开 LLM board API | 官方承认 OCR/神经网络/solver 可能出错；可编辑识别结果并报告错误 |
| Duolingo Max | 受 CEFR/场景约束的语音角色扮演；对话后反馈 | Lily avatar、转录和反馈，不是教育白板 | Video Call 可实时说、要求重复/放慢；有对话边界 | 蓝图约束 opener/question/free chat/closer；下一问单独生成 | 设计者写系统指令；中途评估迷惑/不当内容；抽取事实供下一次个性化 |
| CK-12 Flexi | 专家内容结合生成式回答；提示、追问、例子和练习 | FlexBook 卡片、互动模拟、视频、推荐内容；“Boards”是资源路线，不等于自由画板 | 对话与练习轮次；无实时白板证据 | 自然语言回答，知识库/内容卡片；schema 未公开 | AI-GENERATED 标识，教师掌控；专家库与生成内容区分；官方明示会错 |
| Flint | 教师配置活动/材料/标准，Sparky 引导而非代做；支持数学图和互动活动 | 学生白板；数学图、生成视觉、拖拽/排序/3D 等互动 artifact | 活动互动、历史与分析；没有公开逐笔时序 | `[未知]` 公开资料未给 action/schema；至少支持图/互动 artifact 级别 | 教师预览/编辑、guardrails、rubric、管理员可见、flagging 与分析 |
| iDroo | 让学生保留思考，AI Tutor 给 hint、step check、解释、类似练习 | 学生共享白板，文本/公式/图/自由笔迹；AI 读取板 | 白板协作实时；AI 是轮次式 side panel，无语音打断证据 | `[事实]` 选中对象、最近变化、可见区域作为输入；AI 写回板未知 | 最终答案请求会被引回推理；AI 可能犯错；课程、进度、家庭/教师权限 |
| Studdy | 上传题目/课本，个性化、逐步讲解，随时提问并适配节奏 | 官方称 interactive/infinite AI canvas、动态图/图示 | 官方声称实时可视解释、可打断；协议和延迟未知 | `[未知]` 只确认产品层“写/画”声明，未确认低层 stroke | 材料/节奏个性化；guardrails/课程对齐为官方声明，需实测 |
| ChalkLearn | 逐步写解、练习、提示、调整难度；支持 voice mode | 官方称 live whiteboard，页面展示公式/编号步骤 | 官方称听、暂停、被打断、实时反馈；实现未知 | `[未知]` 没有公开动作 schema | 主题/上传材料/团队分析；教学质量与评分机制未公开 |

### 2.1 Khanmigo：从纯对话走向“可操作语义图形”

`[事实]` Khan Academy 将 Khanmigo 定义为会通过问题、提示和解释引导学习者的 AI tutor，并连接其课程内容。[Khanmigo 官方介绍](https://www.khanacademy.org/khanmigo)

`[事实]` Khan Academy 2026 年官方更新描述了数学/科学互动图：Khanmigo 判断视觉有帮助时生成图表、几何形状、平行坐标图等；学生可以拖动线段或顶点，系统识别变化并继续教学。[Khan Academy 官方更新](https://blog.khanacademy.org/new-ai-tools-bring-interactive-diagrams-and-targeted-practice-thanks-to-khan-academys-partnership-with-google-org/) [Google 官方说明](https://blog.google/products-and-platforms/products/education/khan-academy-back-to-school/)

`[推论]` 这更像“语义图形 + 用户事件”的闭环，而不是 AI 每帧重绘一张黑板：图形的可交互性、坐标约束和拖拽反馈应由 renderer 负责。

`[未知]` 官方没有披露 Gemini 生成图形时的 wire format、shape 生命周期、增量传输方式、被打断时的取消语义或是否支持学生自由笔迹。

`[借鉴]` 对 Open Learning，优先实现“点/线/区间/图表可以被学生改变，并把事件回读给 Codex”，而不是追求模拟手写质感。

### 2.2 ChatGPT Study Mode：教学政策强，画板不是其产品核心

`[事实]` Study Mode 会询问已有知识和目标，以苏格拉底方式提问，逐层解释，一次一个问题地检查理解，并能参考上传的笔记、课程大纲、练习、图片或 PDF。[OpenAI Help Center：Study Mode](https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt)

`[事实]` 官方限制说明 Study Mode 可以被要求提供图表或视觉解释，但生成图片、互动视觉和其他工具取决于会话中可用的能力；官方同时承认会犯错，偶尔会直接给答案。[同一官方帮助文档](https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt)

`[事实]` ChatGPT Voice 支持自然打断与转录；这是对话产品的 Voice 能力，不是 Study Mode 已经拥有一个可被 Voice 驱动的实时白板。[OpenAI Voice Mode Help](https://help.openai.com/en/articles/20001274)

`[推论]` Open Learning 可以复用其“目标/基础 → 分层解释 → 检查 → 调整”的教学循环，但必须额外定义 `focus`、`wait_for_student`、`check` 和 board patch；不能假设普通对话会自行产生稳定的画板状态。

### 2.3 Google Guided Learning / LearnLM：多模态卡片和互动检查

`[事实]` Guided Learning 官方描述了开放式探问、分步拆解和适应用户需求的解释；Google 还称响应可包含图片、图示、视频和互动 quiz。[Google 官方博客](https://blog.google/products-and-platforms/products/education/guided-learning/)

`[事实]` Learn About 的官方帮助页列出图片、视频、常见误解、停下来思考、知识测试、互动指南和上传材料等学习组件，并明确提醒生成式 AI 可能犯错，需要核查。[Google Search Help：Learn About](https://support.google.com/websearch/answer/15662709?hl=en)

`[事实]` Google 的 LearnLM 资料说明其是针对学习场景调优的能力，后来整合进 Gemini；Google Cloud 页面还披露了教育评估、专家比较和红队等厂商研究。[Google AI for Developers：LearnLM](https://ai.google.dev/gemini-api/docs/learnlm) [Google Cloud：LearnLM](https://cloud.google.com/solutions/learnlm)

`[未知]` 公开资料没有给出 Guided Learning 的卡片 JSON、renderer contract、白板对象模型或视觉动作粒度。厂商披露的学习效果数字不等于 Open Learning 的独立证据。

`[借鉴]` 用受限的 `explain`、`misconception`、`stop_and_think`、`quiz` 语义块覆盖常用教学动作，再由本地 renderer 保证一致性。

### 2.4 Synthesis Tutor：把讲解变成可操作的微课状态机

`[事实]` Synthesis Tutor 面向大约 5–11 岁儿童，强调 hands-on activities、visualizations、step-by-step guidance 和实时 micro-assessments；当系统看到理解后才推进。[Synthesis Tutor](https://www.synthesis.com/tutor) [Synthesis 教师页面](https://www.synthesis.com/educators)

`[事实]` 官方文章将课程描述为每次围绕一个想法的 5–6 分钟 micro-lesson，包含 digital playgrounds、视觉模型和学生可操作的 problem spaces。[官方产品文章](https://www.synthesis.com/blog/why-math-finally-clicks-with-synthesis-tutor)

`[推论]` 这不是“让 LLM 现场画完整黑板”，而是内容/状态/评估驱动的组件系统。对 K12 更可靠的做法是将高频教学动作预先建成可交互组件，Agent 只选择组件和下一步策略。

`[未知]` Synthesis 的内部题型 schema、模型参与边界和画面增量机制未公开；没有证据证明其 AI 会逐笔自由书写。

### 2.5 Photomath：确定性求解器 + 预制视觉解释

`[事实]` Photomath 官方描述的流程是拍照/OCR 识别公式，再用问题求解算法和 expert system 生成步骤；用户可以查看不同方法、提示和概念解释。[Photomath Help：工作原理](https://support.google.com/photomath/answer/14328660?hl=en) [Photomath 官方主页](https://photomath.com/)

`[事实]` Photomath Plus 提供 Animated Tutorials，使用 number line、chips、algebra tiles、图形等视觉模型模拟老师解释；这些是可回放的教程，不是用户和 Agent 共同编辑的自由画布。[Photomath Help：Animated Tutorials](https://support.google.com/photomath/answer/14330572?hl=en)

`[推论]` 数学事实、变形步骤、采样点和动画时序应由确定性引擎或可验证结构产生；语言模型适合选择解释路径和提示层级，不适合直接发明算术结果。

`[借鉴]` Open Learning 的公式 renderer 和图形 renderer 应保留可验证中间值；每个 `step` 可以携带“由哪一步变换而来”的语义，而不是只保存屏幕上的像素。

### 2.6 Duolingo Max：实时感来自“约束后的开放对话”

`[事实]` Video Call/Roleplay 使用 GPT-4 驱动场景对话；Video Call 有实时语音角色、转录和交互后反馈。[Duolingo Max 官方介绍](https://blog.duolingo.com/duolingo-max/) [Video Call 官方说明](https://blog.duolingo.com/video-call/)

`[事实]` Duolingo 工程文章明确说不能让 LLM 完全自由运行：学习设计师写系统指令，通话有 opener、first question、free conversation、closer 的 blueprint；首问由独立的 Conversation Prep 生成，通话后再从 transcript 抽取事实供下次使用。[Duolingo 工程文章](https://blog.duolingo.com/ai-and-video-call/)

`[推论]` “自然”不是没有结构，而是把结构藏在界面后面。Open Learning 也应把一次教学拆成小阶段：提出问题、画一个动作、等待回答、检查、继续/重讲。用户打断时取消未执行的 patch，并重新规划当前阶段。

`[未知]` Duolingo 的头像动画不说明教育图形 renderer；没有证据证明其在白板上画图。

### 2.7 CK-12 Flexi：生成内容与专家内容分层

`[事实]` CK-12 官方帮助说明 Flexi 会根据自然语言问题给个性化解释、步骤和追问；官方概览还把提示与 CK-12 内容、互动模拟和视频结合。[Flexi 工作方式](https://help.ck12.org/hc/en-us/articles/47867156140059-What-is-Flexi-and-How-Does-Flexi-Work) [Flexi 概览](https://info.ck12.org/flexi-overview)

`[事实]` 教师指南明确区分带 `AI-GENERATED` 标识的学生回答与 CK-12 专家编写的 library cards，并要求教师检查生成内容；限制说明承认模型可能犯错。[CK-12 教师指南](https://help.ck12.org/hc/en-us/articles/36419540412187-Using-Flexi-in-Your-Classroom-A-Guide-for-Teachers) [Flexi 生成式 AI 限制](https://help.ck12.org/hc/en-us/articles/18005531406875-The-Limitations-of-Flexi-s-Generative-AI)

`[事实]` “My Feed & Boards” 在官方概览中被标为 coming soon 的资源组织能力，不能当作已经存在的生成式教学白板。

`[借鉴]` Open Learning 的画面应区分 `generated` 与 `verified`；公式/图表结果可以由 renderer 或 solver 验证，解释性文字可以标出其生成状态。

## 3. 白板专项：哪些产品真的“让 AI 写”

### 3.1 证据分级

| 等级 | 含义 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| A：源码/协议 | 有公开源码、schema、renderer 或可复现的端到端实现 | Agent 到画板的实际对象/动作边界 | 不能证明学习效果或商业产品同样实现 |
| B：官方功能 + 可操作 demo/帮助 | 一手产品资料与可运行界面相互支持 | 产品确实提供某种白板交互 | 通常不能证明低层传输、模型输出、每笔增量 |
| C：官方宣传/截图 | 官网说会写、画、实时生成 | 产品团队的功能方向/承诺 | 不能证明当前版本可用、可读回、可取消或是 raw stroke |
| D：二手描述 | 测评/帖子/营销转载 | 只作线索 | 本报告不作为能力证据 |

### 3.2 公开资料中最接近生成式白板的产品

| 产品 | 公开一手证据 | 最谨慎的结论 | 证据级别 |
| --- | --- | --- | --- |
| Flint | 官方 V5 更新称学生有 interactive whiteboard，AI 能理解白板内容并更新数学图和 AI-generated visuals；官方学生/教师文档另提 graphs、活动、分析 | 可以确认“学生板 + AI 读/更新高层视觉内容”的产品能力；不能确认 raw stroke 或公开 action schema | B |
| Studdy | 官方 partnership/产品页称 Interactive Whiteboard Tutor、infinite AI canvas、动态 graphs/diagrams、实时视觉解释和可提问/打断 | 可以确认官方设计目标是生成式白板；实现粒度、协议、当前版本稳定性未知 | C→B（需实测） |
| ChalkLearn | 官方页称 AI tutor 在 live whiteboard 上逐步写解；voice mode 支持听、暂停、打断，页面展示 LaTeX 步骤 | 可以确认“产品宣称实时白板 + 语音教学”；无法由页面证明是低层笔迹而非语义步骤渲染 | C |
| Hearthslate | 官网称 Ms. Vector 一边讲解一边在板上画，使用 real pen strokes 和 real-time narration，并提供无账号 demo 入口 | 这是最值得实际点开的 K12 demo；仍无公开协议，不能把“real pen strokes”当源码事实 | B（官方声明 + demo） |
| Dhee Learning | 官方页面向 3–8 年级，称 voice + live whiteboard，孩子提问时逐步讲并实时画，配合 checkpoints/challenges | 可以确认面向 K12 的实时白板产品定位；AI 是否输出原子 stroke、能否读回对象未知 | C |
| Lumi | 官方页称可边讲边画曲线/力/细胞/思维导图，支持中途打断、重新解释和点板提问 | 是强产品声明，但没有公开实现/协议；页面上的“notice when stopped following”不能当已验证模型能力 | C |
| Dudely | 官方页称 board move-by-move 构建，支持 voice/pen/point，学生尝试后诊断、重教、重试 | 可作为高中 STEM 交互白板假设；掌握判断和绘图管线未公开 | C |
| Brightboard/Chalk-1 | 官方工程文章称可同时 think/speak/listen/drive whiteboard，写方程、草图、标注，处于 pre-alpha/beta | 说明团队在做同步生成白板；没有公开协议，也没有独立质量证据 | C |

这组证据的共同缺口：产品页面描述的是用户体验词（write、draw、live、real-time），而不是可审计的 `action`、`shape owner`、`version`、`cancel` 或 `readback`。因此不能直接得出“Agent 可以像人一样任意写”。

### 3.3 iDroo：真正成熟的是“AI 读学生的板”，不是 AI 自由画板

`[事实]` iDroo 提供共享实时白板，学生/教师可以画、写、加入公式、上传作业并保存板面。[iDroo Features](https://app.idroo.com/features)

`[事实]` AI Tutor 面板的官方帮助明确列出四个入口：检查答案、给提示、解释所见、生成练习题。它可以使用 selected objects、recently changed content 或 visible area；看不清时会要求放大。回答只对打开面板的用户私有。[iDroo AI Tutor 帮助](https://app.idroo.com/help/board-ai-tutor)

`[事实]` AI Tutor 的产品页强调“selected step or visible board work”，并将 answer-only 请求引导回 reasoning；官方承认 AI 会犯错。[iDroo AI Tutor](https://app.idroo.com/features/ai-tutor)

`[事实]` 公开帮助说明白板对象编辑和协作变化实时可见，文本/公式的每次编辑也会广播给协作者。[iDroo 对象编辑](https://app.idroo.com/help/editing-objects)

`[未知]` 官方资料没有说 AI Tutor 会把回答直接写回板，也没有公开其对象识别、截图压缩或 action schema。故应分类为 **L0 + L1，非已证实的生成式白板**。

`[借鉴]` Open Learning 应采用它的“聚焦上下文”设计：让 Codex 读 `selection`、`recent_events`、`visible_region`，而不是每轮把完整画板和所有历史重新塞给模型。

### 3.4 Flint：最强的商业产品级证据，但仍没有公开低层协议

`[事实]` Flint 官方介绍涵盖教师上传材料、AI guardrails、分级活动、数学 2D/3D graph、公式编辑、白板、图片处理和课堂分析。[Flint 官方产品页](https://flintk12.com/)

`[事实]` Flint V5 官方更新写明：学生使用 interactive whiteboard；AI 可以 view/understand 内容，并用 mathematical graphs 和 AI-generated visuals 更新板面；教师可以查看白板交互历史。[Flint V5](https://flintk12.com/whats-new/flint-v5)

`[事实]` 学生帮助页描述 Sparky 使用数学工具给出逐步解、抛物线图和生成视频；教师可以先预览和修改活动，随后查看分析。[Flint 学生入门](https://help.flintk12.com/en/articles/14831558-get-started-as-a-student-in-flint) [Flint 教师入门](https://help.flintk12.com/en/articles/9126131-get-started-with-flint-for-teachers)

`[推论]` Flint 的可靠架构更可能是“学生输入/板面理解 → 教学策略 → 高层 graph/artifact → 应用 renderer”，而非将整个白板低层 API 暴露给模型。新版本的 drag/sort/3D 活动尤其说明结构化 artifact 比任意手写更适合评估。

`[未知]` shape schema、事件协议、模型/renderer 边界、语音打断、patch 取消和单次输出上限均未公开。

`[借鉴]` 教师 preview/edit、guardrail、白板历史、rubric 和后续活动，是 K12 产品比“画面好看”更重要的控制面。

### 3.5 Studdy、ChalkLearn、Hearthslate、Dhee、Lumi、Dudely：应先验证行为，再借鉴叙事

这些产品值得观察，因为它们把“讲解”呈现为语音与画面同步，而不是聊天框旁边放一张静态总结图：

- `[事实]` Studdy 官方称上传材料后在 interactive/infinite AI canvas 上逐步讲解，能生成动态图表/图示并允许中断提问。[Studdy 官方产品页](https://studdyai.com/) [Studdy 官方合作页](https://studdyai.com/partnerships)
- `[事实]` ChalkLearn 官方称 tutor 在 live whiteboard 上逐步写出解决方案，voice mode 可以听、暂停并在被打断时继续；定价页把 whiteboard、LaTeX、文件/OCR、session replay 分开列出。[ChalkLearn 官方页](https://getchalklearn.com/) [ChalkLearn 定价](https://getchalklearn.com/pricing)
- `[事实]` Hearthslate 官方称其 K–12 tutor “by drawing on a board while she explains”，并声称是真实笔迹和实时讲解；官网提供可直接试用的 demo。[Hearthslate](https://hearthslate.com/)
- `[事实]` Dhee Learning 官方定位 Class 3–8，描述 voice + live whiteboard、逐步讲解、理解检查、记忆会话和家长 mastery 视图。[Dhee Learning](https://www.dheelearn.com/)
- `[事实]` Lumi 官方面向 GCSE/A-Level，描述边讲边画、支持中途打断、指出板上部分继续追问，且能画曲线、力、细胞和思维导图。[Lumi](https://www.trylumi.co/)
- `[事实]` Dudely 官方描述 STEM tutor 逐步构建 board，学生可以 voice 或 pen 交互，系统在尝试后诊断并重教。[Dudely](https://dudely.co/)

`[未知]` 对上述产品均未找到公开的逐笔协议、shape 归属、局部 patch/readback、公式验证器或模型调用日志。产品页面里的“real pen strokes”可能是低层笔迹，也可能是语义笔画对象的回放；必须以实际网络/源码/开发者文档确认，不能把 marketing 词汇当架构。

### 3.6 CANtutor：反例——“动画插图”不等于实时生成白板

`[事实]` CANtutor 官方页展示 voice/sight/live whiteboard 和数学步骤/图表等产品方向，但页面同时明确某些 panel 是 “Animated illustration — not a screen recording”，录制能力仍在开发中。[CANtutor](https://www.cantutor.ai/)

`[结论]` 这类页面可以证明产品愿景或 UI 方向，不能证明 Agent 在当前会话中按原子动作实时控制画板。Open Learning 的竞品评估必须把“演示插图、录播、预制动画、真实交互板”分开。

## 4. 开源实现深挖：zicojiao/ai-math-tutor

这是目前最接近 Open Learning 核心设想的公开小型实现：语音 tutor 看学生的数学板面，选择一个下一步，用语义动作更新 AI 注释，然后等待学生继续。

### 4.1 能确认的技术栈与流程

`[源码事实]` 项目 README 描述的技术栈是 Next.js、tldraw、LiveKit，以及 STT → LLM → tools → TTS 的 voice-first 流程；AI 同时接收结构化 canvas context 和 screenshot，AI annotations 与 student work 分离。[项目 README](https://github.com/zicojiao/ai-math-tutor)

公开流程可以概括为：

```text
学生写/画/上传题目
  → tldraw 产生结构化 shapes 与最近事件
  → 浏览器整理选择区、可见区和截图
  → LiveKit RPC 发送受限上下文
  → Gemini 生成 narration + canvas actions
  → Zod 校验动作与边界
  → 浏览器计算布局并应用 AI shapes
  → TTS 讲解，ask_student 后等待学生事件
```

项目是小型 POC（README 的公开仓库规模很小），没有学习效果、生产 SLA 或商业稳定性证据；这里借鉴的是边界和协议，而不是把它当成已验证产品。

### 4.2 Agent 输出的是语义 action，不是 HTML/自由 tldraw API

`[源码事实]` `canvas-protocol.ts` 使用 Zod 定义 canvas shape、event、context 和 tutor command。已公开的 AI action 包括：

| action | 教学含义 | renderer 责任 |
| --- | --- | --- |
| `write_text` | 放一段短文字/标签 | 选择字体、尺寸和位置 |
| `write_formula` | 放 LaTeX 公式 | KaTeX 渲染、错误降级和尺寸限制 |
| `hint_card` | 给学生一个提示卡 | 卡片布局与可访问呈现 |
| `highlight` | 强调已有对象 | 绑定目标 ID，避免重新绘制 |
| `draw_arrow` | 指向对象/区域 | 计算锚点、避让已有内容 |
| `mark_wrong` / `mark_correct` | 标记学生步骤 | 绑定 student shape，保留原因 |
| `correct_step` | 以结构化方式改正一步 | 组合标记、公式或说明动作 |
| `ask_student` | 结束本轮并等待学生 | 进入等待状态，不继续自动画 |
| `clear_ai_annotations` | 清除 tutor 临时标注 | 只清 AI owner 的对象，不删学生内容 |

`[源码事实]` command 包含 narration 与 1–24 个 actions；文字/LaTeX 有长度上限；坐标值要求有限、归一化并限制在 0–4000 范围；context schema 对 shape 和 recent event 也有上限。这里的坐标是协议内部的安全边界，不是要求模型承担完整布局。

源码入口可直接审阅：

- [canvas-protocol.ts](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/canvas-protocol.ts)
- [canvas-context.ts](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/canvas-context.ts)
- [board-understanding.ts](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/board-understanding.ts)
- [apply-tutor-actions.ts](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/apply-tutor-actions.ts)
- [tutor-action-layout.ts](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/tutor-action-layout.ts)
- [canvas-events.ts](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/canvas-events.ts)
- [tutor-turn-state.ts](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/tutor-turn-state.ts)
- [agent canvas bridge](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/agent/src/canvas_bridge.ts)

### 4.3 对上下文和 token 成本的处理

`[源码事实]` `canvas-context.ts` 中的公开常量体现了一个很实用的策略：LiveKit RPC 上限约 15,360 bytes，canvas context 预算约 14,000，结构化摘要预算约 2,600；最近事件只取有限条，shape 文本截断，按预算逐级减少 shape 数量，若截图造成超限则先移除截图。

`[源码事实]` board understanding 会优先学生 owner 的 text/draw/image 等有用 shape，最多整理有限步骤，并将内容分类为 problem、student_step、scratch；selected/recent/last 内容用于判断当前焦点。

`[推论]` Open Learning 应采用“两层上下文”：先传结构化对象和事件，只有模型确实需要视觉细节时才附截图；不要每轮发送整个画布。`read` 的结果也应是短的稳定摘要，而不是把 renderer 的实现细节暴露给 Skill。

### 4.4 owner、布局、等待状态是关键细节

`[源码事实]` AI 写入的 shape 带有 `owner=ai` 和 `role=tutor-annotation` 元数据；清除动作只删除 AI 注释。事件监听忽略 AI/system shape，因此 AI 自己的更新不会被误判为学生的新回答。

`[源码事实]` layout 模块由浏览器根据已有矩形、学生对象和目标 bounds 计算位置，AI 内容通常放在右侧/下方并避让学生工作；模型不负责测量文字宽度和重排整板。

`[源码事实]` `ask_student` 会进入 `waiting_for_student`；接收到学生 shape event 后才变成 `student_responded`。这把“讲解结束”和“学生真的动手”区分开。

`[推论]` 这三个边界应直接进入 Open Learning MVP：

1. **owner 隔离**：`student`、`ai`、`system` 不能互相误删。
2. **renderer 布局**：Agent 给语义和相对意图，不给绝对排版责任。
3. **显式等待**：每次画完一个认知动作后允许 Codex 等用户说话、写字、拖拽或确认。

### 4.5 这个实现仍然没有解决什么

- `[未知]` 它没有证明自由笔迹生成比语义对象更有效；AI 主要写文字、公式、箭头和卡片。
- `[未知]` 没有学习效果、延迟分布或多语言评估。
- `[未知]` 依赖 tldraw 的生产许可证/版本边界需要单独审查，不能简单等同为普通 MIT 依赖。
- `[推论]` Open Learning 可以复制其协议思想，但不必复制其实时传输层；本项目已经决定 CLI-first，CLI 应成为唯一外部入口，内部 IPC/桌面状态由应用负责。

## 5. 第二个开源参照：llSourcell/mathvoice

`[事实]` MathVoice README 将 Brain、Whiteboard、Voice 分开：Brain 负责 Socratic tutor，Whiteboard 使用 KaTeX/Mafs，Voice 使用 Web Speech API；模型输出包含 message、whiteboard、errorAnalysis、topicUpdate、expectsResponse。[MathVoice README](https://github.com/llSourcell/mathvoice)

`[源码事实]` 其 tutor route 使用受限工具/结构化返回；whiteboard 命令包含 equation、graph、step、annotation、clear 等类型。`use-whiteboard-sync.ts` 按估计的语音时长调度命令，clear 可以立即执行，其他命令可被取消。[Tutor route](https://github.com/llSourcell/mathvoice/blob/main/src/app/api/tutor/route.ts) [Whiteboard sync](https://github.com/llSourcell/mathvoice/blob/main/src/hooks/use-whiteboard-sync.ts)

`[推论]` 这验证了另一条重要路线：语音和视觉不要输出两份互相独立的内容；应共享一个“讲解时间线”，但 UI 仍需要允许用户打断、取消剩余动作并回到当前语义状态。

`[限制]` 这是个人/开源项目，不是 K12 成效证据。它可用于理解协议和同步，不应作为产品安全性、数学正确性或学习效果的证明。

## 6. 对 Open Learning 的架构建议

### 6.1 建议的最小教学事件模型

每一轮不是“输出一篇答案”，而是一个可取消的 `LessonTurn`：

```json
{
  "turn_id": "turn-07",
  "phase": "explain",
  "narration": "斜率表示每向右走 1 格，直线向上或向下多少。",
  "operations": [
    {"op": "put", "id": "slope-rule", "kind": "formula", "value": "m = Δy / Δx"},
    {"op": "focus", "ids": ["rise", "run"]}
  ],
  "expect": {"kind": "student_prediction", "target": "next-step"}
}
```

这里的 JSON 只表示教学语义；真实 CLI schema 应继续遵循项目已有的版本、稳定 ID、`base_version`、`read` 和原子 patch 约束。

### 6.2 MVP action vocabulary

建议 P0 只做以下动作：

| 动作 | 用途 | 是否立即做 |
| --- | --- | --- |
| `put` | 添加一个概念/例子/步骤/问题/公式 | 是 |
| `update` | 改变当前对象的文本、状态或值 | 是 |
| `remove` | 移除已经完成使命的临时脚手架 | 是 |
| `focus` | 高亮/聚焦已有对象 | 是 |
| `reveal` | 显示一个已存在但隐藏的步骤 | 是 |
| `ask` | 让语音停下来，等学生作答 | 否，进入等待 |
| `check` | 标记待检查对象并返回短状态 | 否，等待模型/用户反馈 |
| `clear_ai` | 清除 tutor 临时标注 | 是 |

对象 kind 先覆盖 `text`、`formula`、`step`、`question`、`example`；图表、函数图、几何和流程图都作为受限 renderer 的后续 kind，不把任意第三方 spec 直接作为 wire format。

### 6.3 renderer 分层

- **文字**：受限 CommonMark；禁用原始 HTML。
- **公式**：KaTeX；限制长度、展开、trust 和错误回退。
- **图表**：Open Learning 的短 `chart` DSL，再编译到受限 Vega-Lite 子集；不接受完整 Vega spec。
- **函数图**：数值表达式 AST + Mafs；不接受 JavaScript 函数或 `eval`。
- **几何**：后续用受限点/线/圆/约束对象；不暴露 JSXGraph 低层 API。
- **关系图**：后续再接受限 `diagram`；不让 Mermaid/D2/Graphviz 成为底层场景状态。
- **动画**：只允许有限的 reveal/highlight/move/transform；动画由 renderer 控制并可被取消。

这条边界保留接近 HTML 的组合能力，但不把执行代码、CSS 布局、远程 iframe 或安全风险交给 Agent。

### 6.4 语音、画板与打断的协同规则

建议把一次真实讲解固定为：

```text
准备上下文
  → patch 一个视觉动作
  → 语音解释该动作
  → focus 当前对象
  → ask / wait
  → 读 student event 或 voice answer
  → update / correct / reveal
```

打断时：

1. 停止 TTS/Voice 当前输出（由 Codex 提供的能力负责）。
2. CLI 不继续自动应用尚未执行的 patch。
3. 读取当前 board version、selection 和最近学生事件。
4. 将未完成的 `LessonTurn` 标为 cancelled/replanned，而不是回滚学生已经写下的内容。
5. 只提交与新问题相关的最小 update/focus/ask patch。

### 6.5 K12 必须有的控制面

- 学生对象和 AI 对象分 owner，AI 不能误删学生作业。
- 公式、图表、单位和数值计算尽量走可验证 renderer/solver。
- 每个生成解释可标记 `generated`；可核验内容标记 `verified` 并带来源或规则。
- Skill 默认不直接代做，优先提示、反问、相似题和错误定位。
- 教学动作、学生回应、board version 和最终检查结果可审计，但不保存不必要的原始录音。
- 支持教师/家长可见性、敏感内容拦截和会话删除策略；这些是产品要求，不应等到“做 subagent”时再补。

## 7. 一个 K12 真实教学例子：七年级“斜率”

目标不是在课后生成漂亮总结，而是在 Codex Voice 中共同完成一次理解循环。

### Turn 1：建立最小直觉

Codex 先说：“我们先不记公式，看一条向右走的路。每向右 1 格，它上升多少？”

板面 patch 只放三个对象：坐标网格、起点、向右 1/向上 2 的箭头。语音解释“上升量”和“水平移动量”，不朗读坐标和工具参数。

### Turn 2：把直觉变成语义对象

Codex patch：

```json
{
  "operations": [
    {"op": "put", "id": "rise", "kind": "step", "title": "上升量", "body": "Δy = 2"},
    {"op": "put", "id": "run", "kind": "step", "title": "水平移动量", "body": "Δx = 1"},
    {"op": "put", "id": "slope-rule", "kind": "formula", "title": "斜率", "body": "m = Δy / Δx = 2"},
    {"op": "focus", "ids": ["rise", "run", "slope-rule"]}
  ]
}
```

然后语音问：“如果水平移动变成 2 格，你猜斜率会变成多少？”此时不再自动讲下一段。

### Turn 3：学生回答/拖拽后再改板

学生说“还是 2”，或在板上拖动第二个点。renderer 回传学生事件和新的 `point-b` 值。Codex 读取事件，更新 `run` 和 `slope-rule`，突出“同样上升 2，但走得更远，单位上升变少”。

### 为什么这个例子适合 Open Learning

- 语音提供直觉、比喻、反问和纠错。
- 画板提供同一组点、箭头、比例和公式，学生可以指着它追问。
- 每次 patch 只改变一个认知动作，token 远低于重新生成整页。
- 学生事件是真正的理解证据，不能只根据“听起来懂了”推进。
- 没有任何一步要求模型输出任意页面代码或低层笔迹。

## 8. MVP 分期与非目标

### P0：先验证“Voice + 语义画板”

- CLI-first：`open`、`patch`、`read`，应用关闭时 CLI 可启动应用。
- stable ID、版本、owner、原子 patch、局部 readback。
- `text`、`formula`、`step`、`question`、`example`。
- focus/reveal/ask/check/clear AI annotations。
- KaTeX 公式和受限 CommonMark。
- Codex Skill 约束“一次一个认知动作；先 patch/聚焦，再口头引用；需要时等待学生”。
- 记录 patch 到语音/学生事件的时间关系，用于后续评估。

### P1：有证据后再增加交互视觉

- 受限 `plot`：函数 AST、domain、采样上限、可拖动参数。
- 受限 `chart`：柱状/折线/散点、少量 encoding、命名数据更新。
- 点、线、箭头、区间和简单几何对象。
- 学生拖拽/书写/选择事件的语义回读。
- 可取消的 reveal/highlight/step timeline。

### 暂不做

- 任意 HTML、CSS、JavaScript、MDX、iframe 或远程嵌入。
- 完整 Vega-Lite、Mermaid、D2、Graphviz、Excalidraw/tldraw 低层 API 作为 Agent wire format。
- 让模型生成逐笔自由手写以替代语义公式/图形。
- 自建 Voice、录音链路或第二个 MCP 传输层；Voice 使用 Codex，外部画板接口使用 CLI。
- 在没有学习成效证据前做通用 K12 课程、家长后台、多人课堂和 subagent 编排。

## 9. 最小验证计划

对每个声称“有 AI 白板”的产品，按相同脚本检查：

1. 让 tutor 讲一道含公式、图形和错误答案的七年级题。
2. 在中途打断，改问一个与当前对象相关的问题。
3. 让学生在板上改一个数字或拖动一个点。
4. 检查 AI 是否能读到**刚改的对象**，是否只改相关区域。
5. 观察是否能撤销/取消未完成动作，是否误删学生内容。
6. 记录首次视觉响应、每一步出现时间、语音与视觉是否同步、失败后的恢复方式。
7. 区分五种输出：学生笔迹、AI 读板、AI raw stroke、AI semantic object、预制动画。

Open Learning 自己的 P0 eval 也应采用同一套指标：达到预先定义的解释标准所需时间、即时迁移题、24 小时后保持率、patch 成功率、错误视觉比例、打断恢复时间和上下文字节数。**“画面漂亮”“动作很多”“token 少”都不是学习效果的替代指标。**

## 10. 来源索引

以下均为一手来源；产品能力随版本变化，引用只支持文中对应的事实，不代表对未公开实现的推断。

### 教学产品

- [Khanmigo 官方介绍](https://www.khanacademy.org/khanmigo)
- [Khan Academy：互动图表与 targeted practice](https://blog.khanacademy.org/new-ai-tools-bring-interactive-diagrams-and-targeted-practice-thanks-to-khan-academys-partnership-with-google-org/)
- [Google：Khan Academy back to school 更新](https://blog.google/products-and-platforms/products/education/khan-academy-back-to-school/)
- [OpenAI Help：Using Study Mode](https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt)
- [OpenAI Help：Voice Mode](https://help.openai.com/en/articles/20001274)
- [Google：Guided Learning](https://blog.google/products-and-platforms/products/education/guided-learning/)
- [Google Search Help：Learn About](https://support.google.com/websearch/answer/15662709?hl=en)
- [Google AI for Developers：LearnLM](https://ai.google.dev/gemini-api/docs/learnlm)
- [Google Cloud：LearnLM](https://cloud.google.com/solutions/learnlm)
- [Synthesis Tutor](https://www.synthesis.com/tutor)
- [Synthesis Educators](https://www.synthesis.com/educators)
- [Synthesis：Why math finally clicks](https://www.synthesis.com/blog/why-math-finally-clicks-with-synthesis-tutor)
- [Photomath Help：工作原理](https://support.google.com/photomath/answer/14328660?hl=en)
- [Photomath Help：Animated Tutorials](https://support.google.com/photomath/answer/14330572?hl=en)
- [Photomath](https://photomath.com/)
- [Duolingo Max](https://blog.duolingo.com/duolingo-max/)
- [Duolingo Video Call](https://blog.duolingo.com/video-call/)
- [Duolingo：AI and Video Call engineering](https://blog.duolingo.com/ai-and-video-call/)
- [CK-12 Flexi 工作方式](https://help.ck12.org/hc/en-us/articles/47867156140059-What-is-Flexi-and-How-Does-Flexi-Work)
- [CK-12 Flexi 概览](https://info.ck12.org/flexi-overview)
- [CK-12 教师指南](https://help.ck12.org/hc/en-us/articles/36419540412187-Using-Flexi-in-Your-Classroom-A-Guide-for-Teachers)
- [CK-12 生成式 AI 限制](https://help.ck12.org/hc/en-us/articles/18005531406875-The-Limitations-of-Flexi-s-Generative-AI)

### 白板/生成视觉产品

- [Flint](https://flintk12.com/)
- [Flint V5 whiteboard 更新](https://flintk12.com/whats-new/flint-v5)
- [Flint 学生入门](https://help.flintk12.com/en/articles/14831558-get-started-as-a-student-in-flint)
- [Flint 教师入门](https://help.flintk12.com/en/articles/9126131-get-started-with-flint-for-teachers)
- [iDroo Features](https://app.idroo.com/features)
- [iDroo AI Tutor on Boards](https://app.idroo.com/help/board-ai-tutor)
- [iDroo AI Tutor](https://app.idroo.com/features/ai-tutor)
- [iDroo Study and AI Tutor](https://app.idroo.com/help/study-ai-tutor)
- [iDroo 对象编辑](https://app.idroo.com/help/editing-objects)
- [Studdy](https://studdyai.com/)
- [Studdy Interactive Whiteboard Tutor](https://studdyai.com/partnerships)
- [ChalkLearn](https://getchalklearn.com/)
- [ChalkLearn pricing/features](https://getchalklearn.com/pricing)
- [Hearthslate](https://hearthslate.com/)
- [Dhee Learning](https://www.dheelearn.com/)
- [Lumi](https://www.trylumi.co/)
- [Dudely](https://dudely.co/)
- [Brightboard / Chalk-1](https://brightboardai.com/)
- [Brightboard：Meet Chalk-1](https://brightboardai.com/articles/meet-chalk-1-the-tutor-that-speaks-listens-and-writes-%E2%80%94-all-at-once)
- [CANtutor](https://www.cantutor.ai/)

### 开源实现

- [`zicojiao/ai-math-tutor` README](https://github.com/zicojiao/ai-math-tutor)
- [`ai-math-tutor` canvas protocol](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/canvas-protocol.ts)
- [`ai-math-tutor` context budgeting](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/canvas-context.ts)
- [`ai-math-tutor` board understanding](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/board-understanding.ts)
- [`ai-math-tutor` applying actions](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/apply-tutor-actions.ts)
- [`ai-math-tutor` action layout](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/tutor-action-layout.ts)
- [`ai-math-tutor` turn state](https://github.com/zicojiao/ai-math-tutor/blob/main/apps/web/lib/math-tutor/tutor-turn-state.ts)
- [`llSourcell/mathvoice` README](https://github.com/llSourcell/mathvoice)
- [`mathvoice` tutor route](https://github.com/llSourcell/mathvoice/blob/main/src/app/api/tutor/route.ts)
- [`mathvoice` whiteboard sync](https://github.com/llSourcell/mathvoice/blob/main/src/hooks/use-whiteboard-sync.ts)

## 最终判断

K12 AI 教学的成熟部分不是“让模型自由画”，而是把教学拆成**可控的认知动作**：先激活已有知识，再用一个视觉对象承载一个关系，随后让学生预测/操作，最后根据学生事件决定重讲、纠正或推进。商业产品把这一过程包装成聊天、卡片、操作物或实时白板；公开源码则显示，最可维护的实现是稳定 ID + 结构化上下文 + 受限 action + renderer 布局 + 明确等待状态。

所以 Open Learning 的差异化不应是更像一个“会画画的聊天机器人”，而应是：**让 Codex Voice 在真实讲解中通过 CLI 逐步操控一块可读、可验证、可打断、不会吞掉学生思考的语义画板。**
