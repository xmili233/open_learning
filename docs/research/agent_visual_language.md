# Agent Visual Language：面向实时教学画板的视觉描述层研究

> 状态：研究结论，待产品负责人确认
>
> 研究日期：2026-08-31
>
> 研究范围：只采用项目官方文档、规范和官方 GitHub 源码/README 作为事实来源。文中 `[事实]` 表示原始资料直接支持，`[推论]` 表示基于这些事实对 Open Learning 的判断，`[待验证]` 表示需要在本项目中测量或实测的假设。

## 0. 先给结论

Open Learning 不应该把 agent 的输出定义成“可以执行的 HTML 页面”，也不应该试图用一套通用标记语言覆盖文档、统计图、函数图和几何画板。更合适的方向是：

> **一个很小的、版本化的教学 patch 协议，加上一组受限的语义 block；每个 block 交给专门的安全 renderer，布局、样式、动画、命中测试和增量更新由应用掌握。**

这保留了 HTML 的“组合不同视觉内容”的能力，却不把 HTML 的执行能力、CSS 布局负担和浏览器攻击面交给 agent。

### 推荐的 MVP 组合

| 层 | MVP 采用 | 原因 |
| --- | --- | --- |
| 教学 patch | 现有 `open-learning board patch`，增加稳定 ID、版本、`put/update/remove/focus/reveal` 语义 | agent 只发送本次教学动作，不重写整张画布；适合 Voice 中被打断和改向 |
| 文字 | 受限 CommonMark，由 `react-markdown` 渲染；禁用原始 HTML，组件只来自 allowlist | Markdown 的 token 密度和可读性好；react-markdown 默认不使用 `dangerouslySetInnerHTML`，可接 sanitize |
| 公式 | KaTeX，MVP 默认 `trust: false`、限制展开/尺寸、`throwOnError: false` | 同步、无依赖、快、支持服务端渲染；TeX 文本本身也很紧凑 |
| 统计图 | 自有 `chart` 小 DSL，编译到 Vega-Lite 的受限子集 | Vega-Lite 是声明式 JSON 语法，支持 encoding、聚合、分层、选择和命名数据增量更新 |
| 函数图 | 自有数值表达式 AST，先接 Mafs；必要时再接 JSXGraph | Mafs 是 React 原生数学可视化组件；JSXGraph 补足交互几何，但其低层 API 不应直接暴露给 agent |
| 几何图 | MVP 先不做完整语言；保留 `geometry` 类型的接口位置，未来借鉴 Penrose 的“语义对象与视觉约束分离” | 几何是高价值场景，但完整约束求解器会增加 token、性能和确定性成本 |
| 流程/关系图 | MVP 不依赖 Mermaid、D2 或 Graphviz；后续按需增加受限 `diagram` block | 三者都适合整图文本编译，不适合核心 patch 的细粒度对象生命周期；D2/Graphviz 还有发行和安全边界成本 |
| 任意 HTML/JS/iframe | MVP 禁止；未来如确有需求，单独做显式信任、权限和 sandbox 能力 | “任意内容”与“不执行 agent 代码”是相互冲突的要求，不能在同一个默认 block 中解决 |

这不是再发明一种“大而全的 Markdown”。**协议只负责教学对象和变化；各 renderer 只负责一种可验证的内容。** 当前产品的 CLI-first 边界、对象生命周期和 `concept/example/question/step` 类型继续作为上层约束，见 [`MVP_PROPOSAL.md`](../MVP_PROPOSAL.md) 与 [`CLI_FIRST_ARCHITECTURE.md`](../CLI_FIRST_ARCHITECTURE.md)。

### 一句话架构

```text
Codex Voice + Skill
        ↓ 低 token 的 board patch
open-learning CLI
        ↓ schema / 版本 / 大小 / 安全校验
教学场景模型（稳定 ID、语义对象、关系、可见性）
        ↓ renderer adapter
CommonMark | KaTeX | Vega-Lite | Mafs/JSXGraph
        ↓
Electron/React 画板（布局、动画、焦点、读回）
```

### 需要先接受的边界

- `[推论]` “接近 HTML 的灵活度”应理解为**可组合的视觉 block 覆盖主要教学任务**，不是允许任意 DOM、CSS、脚本和远程嵌入。
- `[推论]` 对 agent 来说，越接近浏览器编程，越难做到短、可验证和可回放；对学习者来说，画面越自由也越可能出现布局跳动、视觉噪音和错误图示。
- `[待验证]` 结构化画板是否真的提升理解，需要与相同 Voice 教学策略的 Voice-only 对照；token 少或画面漂亮都不等于学习效果好。

## 1. 需求拆解：不要把四类语言混成一类

### 1.1 文字不是画图语言

普通解释、定义、代码片段和问题适合 CommonMark。`react-markdown` 的官方 README 描述了从 Markdown 到 mdast、再到 hast/React 组件的解析管线，并强调默认安全、可接 remark/rehype 插件和自定义组件；只有显式使用 `rehype-raw` 时才会重新解析 HTML，且该路径只适合信任内容。[react-markdown README](https://github.com/remarkjs/react-markdown)

因此文字 block 应该承担“可读的语义内容”，而不是承担布局和任意页面结构。MVP 可支持标题、段落、列表、强调、代码、链接（链接仍需协议限制），并把公式、图表作为独立 block。

### 1.2 公式不是普通 Markdown

KaTeX 支持把 TeX 渲染为 HTML/MathML；官方文档说明它同步、无依赖、可在服务端输出，并可通过 `throwOnError: false` 在错误时显示原始输入。[KaTeX README](https://github.com/KaTeX/KaTeX) [KaTeX API 与选项](https://katex.org/docs/api) [KaTeX options](https://katex.org/docs/options)

MathJax 覆盖 LaTeX、MathML 和 AsciiMath，并提供无障碍能力；但动态内容更新需要重新 typeset，删除旧内容前还需要 `typesetClear` 来避免遗留 MathItem 和内存增长。[MathJax README](https://github.com/mathjax/MathJax) [MathJax 动态 typeset](https://docs.mathjax.org/en/latest/advanced/typeset.html)

`[推论]` 公式必须是独立、可替换的语义节点，而不是 agent 拼接 HTML 的副作用。MVP 先选 KaTeX；若产品把 MathML、屏幕阅读器、AsciiMath 或更强的复制/无障碍作为硬要求，再评估 MathJax，不在首版同时维护两套引擎。

### 1.3 图表不是“画几个 div”

Vega-Lite 官方将自己定义为用于交互图形的高层 grammar，以 JSON spec 表达 mark、encoding、数据和变换，再编译成 Vega；其 spec 支持 layer、facet、concat、repeat，自动生成常用轴/图例/scale，且提供 JSON Schema 校验能力。[Vega-Lite overview](https://vega.github.io/vega-lite/docs/) [Vega-Lite spec](https://vega.github.io/vega-lite/docs/spec.html)

它天然适合柱状图、折线图、散点图、分布、对比和随数据变化的图。它不应该直接成为 agent 的完整 wire format：完整 Vega-Lite spec 对模型过于冗长，也会暴露不必要的 transform、signal、URL data 和样式自由度。

`[推论]` 让 agent 发送 `chart` 的小 DSL，再由应用补全 Vega-Lite defaults，能保留 declarative grammar 的表达能力，同时把 token、schema 和安全面压缩到产品需要的范围。

### 1.4 函数与几何需要数值/约束语义

Mafs 以 React 组件展示数学可视化，支持函数、参数曲线、不等式、向量场等；其文档说明函数曲线使用递归自适应采样，采样深度越高越精确但性能和 SVG path 大小也会上升。[Mafs README](https://github.com/stevenpetryk/mafs) [Mafs plots](https://mafs.dev/guides/display/plots)

JSXGraph 是面向交互几何、函数绘图和数据可视化的 JavaScript 库，采用 `board.create(elementType, parents, attributes)` 这样的低层对象 API，涵盖点、直线、圆、曲线、函数图、滑块和交互关系。[JSXGraph README](https://github.com/jsxgraph/jsxgraph) [JSXGraph geometry elements](https://jsxgraph.org/wiki/index.php?title=Geometry_Element)

`[推论]` agent 不应发送 JavaScript 函数或 JSXGraph 的任意 parents/attributes。应发送受限数值表达式（例如 `add`, `mul`, `sin`）及 domain、采样上限、可拖动参数；renderer 负责编译、采样和绘制。这样可以保留“函数图会动”的交互，同时不把 `eval` 或低层坐标计算交给模型。

### 1.5 关系图是可选 block，不是底层场景模型

Mermaid 用 Markdown-inspired 文本定义 20 多类关系/流程图，并提供 sanitization 与 sandboxing 配置；官方 README 同时警告外部用户内容可能包含恶意脚本，sandbox 会牺牲部分交互能力。[Mermaid README](https://github.com/mermaid-js/mermaid)

D2 和 Graphviz 都把文本描述编译为 SVG/PNG/PDF 等图形。D2 的 README 说明其是 diagram scripting language、支持层级对象和多个 layout engine，但项目使用 MPL-2.0；Graphviz 官方文档说明 DOT 有完整的 graph/node/edge/subgraph/attribute 语法，官方 README 还提醒核心对蓄意攻击并不健壮，不应直接暴露为攻击面。[D2 README](https://github.com/terrastruct/d2/blob/master/README.md) [Graphviz README](https://gitlab.com/graphviz/graphviz/-/raw/main/README.md) [Graphviz DOT language](https://graphviz.org/doc/info/lang.html) [Graphviz license](https://graphviz.org/license/)

`[推论]` Mermaid/D2/Graphviz 可作为后续“整张关系图” renderer 或离线导出器，但不应成为 MVP 的节点/边状态模型。核心模型应知道 `posterior`、`evidence` 和 `updated-by` 的稳定 ID，而不是只保存一段无法细粒度读回的图文本。

## 2. 候选方案比较

下面的“低 token”“增量”和“安全”是针对 Open Learning 的工程判断，不是项目官方对这些库的性能承诺。能力判断均链接到项目官方资料。

| 方案 | 表达能力 | token/增量 | 交互与数学 | 安全与 Electron/React | 许可证与维护信号 | 决策 |
| --- | --- | --- | --- | --- | --- | --- |
| MDX | Markdown + JSX、JavaScript expression、import/export，接近可编程页面 | 编译产物/作者语法都比 Markdown 重；整段编译 | 可组合 React 组件，但数学/图表靠额外插件 | 官方明确把 MDX 定义为 programming language，任意不可信作者不安全；需编译器和 JSX runtime | MIT；官方仓库/文档完整，但安全风险与范围不匹配 | **不作为 agent wire format**；可作为受信作者工具 |
| Markdoc | Markdown tags、属性、schema、条件/partial，语义化程度高 | 比 MDX 可控；仍是通用文档编译管线，patch 语义需另建 | React renderer 友好；数学/图表需自定义 tags | parse → transform → render 可插入验证，但 custom tag 若允许任意 render 仍需信任边界 | MIT；官方仓库和文档可用 | **借鉴 tag/schema 思路**，不直接暴露完整 Markdoc |
| react-markdown | CommonMark/GFM 到 React 组件，少量 plugin | 文本紧凑；React 只替换变化的虚拟 DOM 节点 | 不负责图表/公式本身，但容易接 renderer | 默认安全，不执行原始 HTML；插件/组件仍可能引入风险 | MIT；官方维护仓库/文档 | **采用作文字层** |
| Mermaid | 20+ 类图/关系图的文本语言 | 一次文本替换为主，整图再解析；不利于单对象 patch | 图类型丰富，非公式/函数/几何主力 | 有 sanitization/sandbox；外部内容和 HTML-like 语法仍需谨慎 | MIT；README 说明 active community/frequent releases | **后置可选**，独立 `diagram` block |
| D2 | 层级对象、主题、layout engine、SVG/PNG/PDF | 整图编译；布局和外部进程增加延迟 | 适合关系图，不是数学绘图引擎 | Go CLI/library，Electron 集成与发行更重；输入仍需隔离 | MPL-2.0；官方仓库有源码和 docs | **不进 MVP**，可用于导出 |
| Graphviz | DOT 语法成熟、layout engine 和多种输出 | 整图编译；属性语法很宽、agent 负担大 | 图布局强；不适合教学公式/函数互动 | 官方 README 警告对蓄意攻击不健壮；通常需要进程/原生依赖 | EPL-2.0；志愿者维护，需按版本审计 | **不进实时核心**，最多离线导出 |
| Vega-Lite + Vega | declarative JSON grammar、层/分面/变换/选择 | 完整 spec 偏长；命名 data + changeset 支持局部数据更新 | 统计图强，点选/刷选/缩放可用；数学不是主力 | schema 可验证；URL/表达式/自定义 signal 需 allowlist；React adapter 存在 | Vega-Lite BSD-3-Clause；官方仓库历史/文档完整 | **采用为 chart renderer，外包一层小 DSL** |
| KaTeX | TeX → HTML/MathML/SVG-like output，常用数学覆盖好 | 公式 source 很紧凑、同步替换单节点 | 数学排版强；不是图表/几何交互 | `trust` 可开启危险命令，默认必须关闭并限制大小/展开 | MIT；官方仓库/文档完整 | **MVP 默认公式 renderer** |
| MathJax | LaTeX、MathML、AsciiMath，强无障碍 | 异步且较重；动态删除/重排需生命周期清理 | 公式与可访问性最强；复制和表达式探索更好 | 多种输出模式；动态内容必须 typeset/typesetClear | Apache-2.0；官方仓库/文档完整 | **高级/无障碍 fallback**，暂不和 KaTeX 并存 |
| Typst | 强大的文档标记、函数、脚本、数学、bibliography | 编译器有增量理念；但 HTML export 仍实验性、无 fragment 方案 | 适合长文档/打印，不是实时局部画板 | scripting/raw HTML 与 CLI 发行边界过大；HTML export 官方标为 incomplete/experimental | Apache-2.0；官方仓库活跃 | **不进实时核心**，未来做导出 |
| Penrose | Domain/Substance/Style 三语言，语义对象和视觉约束分离 | 约束优化/整图更新；完整语言对 agent 太重 | 数学/技术概念图很强，交互仍有 experimental 部分 | 语义与视觉分离是好模型；运行时和编译面较大 | MIT；官方仓库/文档完整 | **借鉴架构**，后续做受限 geometry |
| JSXGraph | 交互几何、函数图、滑块、轨迹等低层对象 | 对象可局部更新，但 agent 若直接编写 API 会很长 | 几何交互很强 | API/属性面宽；双 LGPL/MIT 需仔细选择与归属 | LGPL-2.1-or-later / MIT 双许可证；官方仓库/文档 | **作为 geometry adapter 候选**，不暴露原 API |
| Mafs | React 数学组件，函数、参数曲线、不等式、向量场 | renderer 局部更新；自适应采样有性能上限 | 函数图最适合 React MVP；不提供通用关系图 | agent 只给受限 AST，不给 JS 函数；本地 bundle 简单 | MIT；官方仓库含测试/文档 | **MVP plot renderer 候选** |
| Excalidraw | 通用无限画布、shape、library、导出与 `.excalidraw` JSON | shape 级 patch 可行，但位置/样式/图形细节 token 很高 | 自由手绘和用户编辑强，不专注数学语义 | MIT；React 集成成熟；通用 shape 面扩大安全/一致性测试 | MIT；官方仓库/文档完整 | **不作为 agent 语义层**；用户自由绘图时再评估 |
| tldraw | React infinite canvas SDK，自定义 shape/tool/binding，AI starter kit | typed action、结构化 shape data、streaming 思路很有参考价值 | 交互画布非常强，可自定义 HTML shape | SDK 默认不是 permissive open source；生产需按其许可证处理；sandbox embed 仍需隔离 | tldraw license（非普通 OSS）；官方 AI 文档丰富 | **不作为默认依赖**；只借鉴 typed actions/validation |

## 3. 重点项目的研究结论

### 3.1 MDX：灵活度最高，但正因为是语言而不适合 agent 默认输出

`[事实]` MDX 将标准 Markdown 与 JSX、JavaScript expression 以及 ESM import/export 组合，组件可以导入或在文档内定义；官方文档强调它会被编译为 JavaScript。[MDX what is MDX](https://mdxjs.com/docs/what-is-mdx/)

`[事实]` MDX 官方安全文档直接提醒：MDX 是 programming language，随机互联网作者的 MDX 不安全，sandbox 也很难，建议使用 iframe/操作系统 sandbox 等隔离。[MDX getting started/security](https://mdxjs.com/docs/getting-started/)

`[推论]` MDX 可用于内部作者写教材或开发者定义 renderer，但不能让 Voice 中的 agent 任意提交 import、JS expression、组件名或 JSX。否则“减少 token”和“安全可验证”会退化为运行一个不可信编译器输入。

### 3.2 Markdoc：值得借鉴的是 typed tags，不是整个文档系统

`[事实]` Markdoc 在 Markdown 语法之上增加 tag；官方文档支持 tag attributes、children、schema 中的 `render/transform/validate`，并以 parse → transform → React render 作为典型管线。[Markdoc README](https://github.com/markdoc/markdoc) [Markdoc tags](https://markdoc.dev/docs/tags)

`[推论]` 这正好说明了一个可行方向：agent 输出的是受限 tag（如 `formula`、`chart`、`plot`），应用先 transform/validate，再选择固定 renderer。区别在于 Open Learning 的 tag 集合应小得多，且不允许自定义 render 函数、任意组件和任意属性。

### 3.3 react-markdown：文字层的默认选择

`[事实]` react-markdown 的默认流程把 Markdown 解析为 mdast，再转为 hast/React；README 说明它默认不使用 `dangerouslySetInnerHTML`，支持自定义 components，并且 React 只替换变化的虚拟 DOM 节点。原始 HTML 默认不按 HTML 执行；`rehype-raw` 只应在信任内容时使用，必要时可接 `rehype-sanitize`。[react-markdown README](https://github.com/remarkjs/react-markdown)

`[推论]` MVP 的文字 body 可以直接沿用 CommonMark 子集；renderer 之外的教学对象、状态、焦点、动画仍然必须走场景模型，不能把整个 board 当成一篇 Markdown 文档。

### 3.4 Mermaid、D2、Graphviz：整图生成器，不是核心场景协议

Mermaid 的优势是 agent 很容易生成和人类阅读的流程图文本，适合解释调用链、时间线、状态转换；官方 README 还提供 sanitization、securityLevel 和 sandbox 相关说明。[Mermaid README](https://github.com/mermaid-js/mermaid)

D2 的优势是层级对象、自动布局、主题和多种输出格式；它既可以 CLI 运行也可以作为 Go library，但发行一个 Go 编译链和处理 MPL-2.0 依赖会使 Electron MVP 更重。[D2 README](https://github.com/terrastruct/d2/blob/master/README.md)

Graphviz 的优势是成熟、稳定的图布局和 DOT 生态；它的官方安全说明却明确提醒不要把核心当成能抵御蓄意攻击的安全边界。[Graphviz README](https://gitlab.com/graphviz/graphviz/-/raw/main/README.md) `[推论]` 这足以排除“实时直接吃 agent 未审计 DOT”的方案。

三者共同的问题是：一次 patch 修改一个节点时，通常需要重新解析/布局整张图；用户点选的语义对象也难以可靠映射回 agent 的稳定 ID。若未来使用，应将整图视为一个带 `source` 和 `renderer` 的可替换 block，且在独立 sandbox/worker 中运行。

### 3.5 Vega-Lite：统计图和可视分析的最佳基础，但要包一层

`[事实]` Vega-Lite 的 spec 使用 mark、encoding、data 和 transform 表达图形；官方文档列出 aggregate、bin、filter、regression、window 等变换，也支持 layer/facet/concat/repeat。[Vega-Lite spec](https://vega.github.io/vega-lite/docs/spec.html) [Vega-Lite transforms](https://vega.github.io/vega-lite/docs/transform.html)

`[事实]` Vega-Lite 的 point selection 支持点击/切换，interval selection 支持拖动、平移和缩放；Vega runtime 的 named data 可以通过 View API 和 changeset 插入/删除数据后再运行。[Vega-Lite selection](https://vega.github.io/vega-lite/docs/selection.html) [Vega-Lite data](https://vega.github.io/vega-lite/docs/data.html) [Vega View API](https://vega.github.io/vega/docs/api/view/)

`[事实]` `react-vega` 提供 React 组件/hooks；README 说明 spec 变化会重新 embed，而动态数据应使用 View API。[react-vega README](https://github.com/vega/react-vega)

`[推论]` Open Learning 的 `chart` DSL 应只保留教学最常用的字段：`data`、`mark`、`x/y/color/size`、有限的 `transform`、`selection` 和 `title/description`。MVP 禁止 URL data、任意 signal、任意 expression 和外部 image；内联数据限制行数/字段数，更新优先使用稳定数据集 ID 和 append/replace 操作。

### 3.6 KaTeX 与 MathJax：速度和无障碍之间做清晰取舍

`[事实]` KaTeX 官方文档称其 fast、同步、无依赖，并支持 server-side rendering。安全文档说明生成的 HTML 对 script/code injection 有防护，但 `trust` 选项可允许加载外部资源或改变 HTML 属性，且应控制 `maxSize`/`maxExpand`；官方也建议对输出继续采用适当 sanitizer。[KaTeX README](https://github.com/KaTeX/KaTeX) [KaTeX security](https://katex.org/docs/security)

`[事实]` MathJax 官方支持 LaTeX、MathML、AsciiMath，并重视屏幕阅读器、自动语音和 expression explorer；其动态 typeset API 要求在插入和删除数学时维护生命周期。[MathJax README](https://github.com/mathjax/MathJax) [MathJax typeset](https://docs.mathjax.org/en/latest/advanced/typeset.html)

`[事实]` MathJax 的 SVG 输出是自包含的，但官方说明 SVG path 不能复制/粘贴；若复制和可访问性是重点，应该选择 CHTML/MathML 输出并额外提供“复制公式源码”动作。[MathJax output](https://docs.mathjax.org/en/latest/output/index.html) [MathJax SVG](https://docs.mathjax.org/en/latest/output/svg.html)

`[推论]` MVP 用 KaTeX `htmlAndMathml`（或等效可访问输出）、关闭 `trust`，并为每个公式保留原始 TeX 以便复制。MathJax 作为后续无障碍/复杂 MathML 模式，不要为“看起来支持更多语法”而在首版引入双引擎。

### 3.7 Typst：很好的编译型文档，不是实时场景 DSL

`[事实]` Typst 的设计目标包括易学、可组合和增量性能，内置 markup、数学、bibliography 和 scripting；官方仓库采用 Apache-2.0。[Typst README](https://github.com/typst/typst)

`[事实]` 官方 HTML reference 仍把 HTML export 标为 experimental/incomplete，明确说明没有 CSS，fragment 支持也属于未来方向。[Typst HTML reference](https://typst.app/docs/reference/html/)

`[推论]` Typst 很适合未来把一节课导出为 PDF/长文档，或者供可信作者编写高质量讲义；它的脚本语言、整篇编译和 HTML 尚未成熟的状态，不适合成为 Codex 实时 patch 的默认语言。

### 3.8 Penrose：最值得借鉴的“语义与视觉分离”

`[事实]` Penrose 将 Domain、Substance、Style 拆为三个程序：Domain 定义类型/谓词，Substance 只声明对象和关系，不写渲染指令；Style 通过 selector、collector、常量和约束把语义对象映射成图形。[Penrose GitHub](https://github.com/penrose/penrose) [Substance reference](https://penrose.cs.cmu.edu/docs/ref/substance/overview) [Style reference](https://penrose.cs.cmu.edu/docs/ref/style/overview)

`[推论]` Open Learning 应吸收这条原则：agent 表达“这个对象是什么、和谁有关、当前要突出什么”，renderer 决定节点尺寸、箭头、颜色、间距和动画。不要让 agent 编写一份 Style 文件，更不要让它每次决定像素坐标。

Penrose 的完整多语言和约束优化流程仍然过重；它适合作为未来 `geometry` 设计的概念参考，而不是 MVP 的依赖。

### 3.9 Mafs/JSXGraph：函数图先选高层组件，几何再加低层 adapter

Mafs 的 React-first API 和函数可视化很符合 Electron renderer；但官方文档明确指出递归采样有精度/性能权衡，必须由 adapter 限制 domain、depth 和 path 大小。[Mafs plots](https://mafs.dev/guides/display/plots)

JSXGraph 的元素类型和 parents/attributes API 足以覆盖滑块、点、交点、轨迹、圆和函数图；它的能力也因此很容易变成 agent 要填写大量低层细节。[JSXGraph README](https://github.com/jsxgraph/jsxgraph) [JSXGraph geometry elements](https://jsxgraph.org/wiki/index.php?title=Geometry_Element)

`[推论]` 采用两个高层 block：

- `plot`：数值表达式 AST + domain + axes + optional parameters，MVP 用 Mafs；
- `geometry`：对象类型 + 语义约束 + 可拖动参数，未来可由 JSXGraph 或自研 renderer 实现。

两者共享稳定 ID 和 patch 生命周期，但不共享任意 renderer 属性。这样“把滑块从 1 改到 2”是短更新，而不是重新发送整段 JavaScript。

### 3.10 Excalidraw/tldraw：交互白板经验很有价值，但不是本项目的默认语义层

Excalidraw 提供无限画布、shape/library、undo/redo、多语言、PNG/SVG/clipboard 导出以及 `.excalidraw` JSON；它很适合用户亲自涂画或修改，但自由 shape 的位置、尺寸和样式会让 agent payload 迅速膨胀。[Excalidraw README](https://github.com/excalidraw/excalidraw)

tldraw 的官方 AI 文档提供了更接近本项目的经验：让 agent 读取截图与结构化 shape data，通过 typed actions 修改对象，并验证/清洗参数、纠正 ID、流式应用结果；它还指出结构化数据与图像结合能帮助 agent 理解画布。[tldraw AI 文档](https://github.com/tldraw/tldraw/blob/main/apps/docs/content/docs/ai.mdx)

但 tldraw 官方许可证文档明确说明默认 SDK 不是 permissive open source，生产使用需要相应许可证（例如 commercial/hobby/trial 形式）。[tldraw license](https://github.com/tldraw/tldraw/blob/main/apps/docs/content/community/license.mdx)

`[推论]` 我们应借鉴 tldraw 的 typed action、结构化 readback、ID 修正和 validation，而不是把 tldraw SDK 加入 Open Learning 的开源 MVP。除非产品明确转向通用白板，否则 Excalidraw/tldraw 都属于后置能力。

## 4. 建议的最小分层 DSL

以下是协议草案，不是本次要实现的 API；字段名用于说明边界，最终名称应和现有 CLI schema 一起评审。

### Layer 0：transport / patch

每个 patch 表达一个**原子教学动作**，而不是一段页面源码：

```text
patch {
  session: "bayes-1"
  base_version: 12
  operations: [ ... ]
}
```

MVP 的 operation 只保留：

| Operation | 含义 | 注意 |
| --- | --- | --- |
| `put` | 创建或完整替换一个稳定 ID 的对象 | 幂等；同 ID 不产生重复对象 |
| `update` | 修改允许变化的字段或 block 数据 | 不允许跨类型隐式转换 |
| `remove` | 删除对象或边 | 删除后 readback 可明确返回 missing |
| `focus` | 设置当前语音要指向的对象 | 不改变语义内容 |
| `reveal` | 显示/隐藏已有对象或某个 block | 让“先画后讲/逐步展开”可表达 |
| `clear` | 清理一组临时脚手架 | 必须列出 ID，不能静默清空整个 session |

服务端/主进程在整个 operations 列表上做 schema、版本和大小校验；任意一项失败就拒绝整批，不留下半个教学动作。`base_version` 不匹配时 agent 必须先 `read` 局部状态再重试，避免旧语音轮次覆盖用户或新轮次的修改。

### Layer 1：语义场景

对象沿用当前 MVP 的教学语义（`concept`、`example`、`question`、`step`），并增加可组合的 block：

```text
node id="posterior" kind="concept" layout="flow:right" {
  title: "Posterior"
  body: [text(...), formula(...)]
}
edge from="evidence" to="posterior" label="updates"
```

agent 可以声明 `layout="flow:right"`、`layout="stack"`、`layout="compare"` 等有限布局意图；不得提交 `x/y/width/height`、CSS、SVG path 或 DOM。renderer 负责让已有对象尽可能保持位置稳定，并在新对象出现时做局部布局。

### Layer 2：受限 block

#### `text`

- 输入：CommonMark 子集；标题、段落、列表、强调、代码、受限链接。
- 禁止：原始 HTML、JSX、脚本、style 属性、远程 iframe/image、任意 rehype plugin。
- renderer：react-markdown + 固定 components + sanitizer。

#### `formula`

- 输入：TeX source、`display`、可选 label/description。
- renderer：KaTeX；保留 source 供复制和错误回显。
- 安全默认：`trust: false`，限制 `maxSize/maxExpand`，错误不阻断整堂课。

#### `chart`

agent 只描述教学数据和视觉映射，示意如下：

```text
chart id="posterior-bars" mark="bar" data="beliefs" {
  x: category
  y: probability
  color: phase
  select: category
}
```

renderer 编译到 Vega-Lite 的 allowlisted spec。MVP 建议允许：`bar/line/point/area/rule`、`x/y/color/size`、有限 aggregate/bin/filter、标题/描述、point/interval selection；禁止 URL data、任意 signal、任意 HTML tooltip 和未限制的 expression。

数据与图形分开：

```text
data id="beliefs" columns=[category, probability, phase]
data.append id="beliefs" rows=[...]
```

这对应 Vega 的 named data/change API，可以只更新数据而不重建 spec；真正的 View API 增量行为仍要在 Electron 中测量。[Vega data](https://vega.github.io/vega-lite/docs/data.html) [Vega View API](https://vega.github.io/vega/docs/api/view/)

#### `plot`

agent 不传 JavaScript 字符串给 `eval`，而传一个受限的数值表达式：

```text
plot id="line" expr={add(mul(2, x), 1)} domain={x:-2..3}
```

允许的函数集合由应用固定，例如 `add/sub/mul/div/pow/sin/cos/exp/log/abs/min/max`；限制 AST 深度、常数范围、domain、采样点和渲染时间。MVP renderer 可用 Mafs；geometry 需要点、线、圆、交点和约束时再接 JSXGraph adapter。

#### `diagram`（后置）

如果确有流程图需求，定义 `diagram` 为独立、可替换的 source block，并限制类型（例如 `flow`/`sequence`）。MVP 不依赖 Mermaid；启用时用 sandbox、固定 config、长度/节点上限，且不把它当作主场景对象。D2/Graphviz 只考虑离线 export。

#### `html-sandbox`（明确非 MVP）

只有产品明确接受以下条件时才评估：用户可见的“这是自定义页面”提示、显式权限/信任、独立 sandbox/iframe、无本机 IPC/Node 权限、导航和网络 allowlist、内容大小和生命周期限制。它不能成为普通 `body` 的 fallback，也不能被 Skill 默默打开。

### Layer 3：renderer-owned presentation

由 Electron/React 自己掌握：

- 自动布局、节点尺寸和连线；
- 默认主题、层级、动画和 reduced-motion；
- focus/selection、键盘导航、屏幕阅读器描述；
- canvas/SVG/HTML 的具体实现；
- 图表与函数采样、错误占位和超时；
- copy formula source、copy chart data、PNG/SVG export；
- readback 的简短语义摘要。

agent 不应知道这些实现细节。这样未来将 KaTeX 换成 MathJax、Mafs 换成 JSXGraph，不会改变 Skill 的教学动作协议。

## 5. 一个真实的 Voice 教学例子

主题：用 Codex Voice 理解“证据如何改变贝叶斯后验”。目标不是课后生成一张总结图，而是让每一个 patch 配合当下的语音解释。

### 动作 1：建立最小心智模型

Codex 先调用一个 patch：放入 `prior`、`evidence`、`posterior` 三个对象，建立两条关系，并显示公式：

```text
put prior      kind=concept  title="先验"
put evidence   kind=example  title="新证据"
put posterior  kind=concept  title="后验" body=[formula("P(H|E)=P(E|H)P(H)/P(E)")]
put edge(prior → posterior, "updated by")
put edge(evidence → posterior, "changes")
focus [prior, evidence, posterior]
```

Voice 随后说：“先看左边的先验，它是看到这次证据之前的相信程度；证据出现后，我们得到右边的后验。” 画板负责对象和关系，语音负责直觉，不重复朗读 JSON。

### 动作 2：把抽象关系变成可观察变化

Codex 更新同一个 `posterior`，并追加一个小图表的数据，而不是重新画整张页面：

```text
update posterior body=[formula("P(H|E)=0.75")]
put chart posterior-bars data="beliefs" x=phase y=probability mark=bar
focus posterior-bars
```

Voice 说：“注意柱子的高度从 0.40 变成 0.75；这不是把先验改写成事实，而是把新证据纳入后的信念更新。” 用户此时可以打断：“如果证据不可靠呢？”

### 动作 3：响应追问而不是堆积总结

Codex 不新增一整页解释，而是直接更新证据对象，显示对照并聚焦变化：

```text
put counterexample kind=example title="不可靠证据" layout="compare"
update beliefs append=[{phase:"weak evidence", probability:0.48}]
focus [counterexample, posterior-bars]
```

Voice 接着问用户：“如果似然接近 0.5，后验应该更接近先验还是更接近 1？”用户答错时，Codex 只修改当前对象/数据，再让用户预测下一次变化。完成使命的 `evidence` 脚手架可 `remove`，避免画板累积成杂乱总结。

`[推论]` 这个例子要求的不是 HTML 自由度，而是四件事：稳定对象、可替换公式、增量数据图、语音可以引用的焦点。它正是分层 DSL 能以较少 token 覆盖的交集。

## 6. 安全、验证和故障边界

### 6.1 输入安全

1. 只接受版本化 JSON/等价结构化 payload；拒绝 HTML、JS、JSX、CSS、`eval`、任意 SVG、任意 URL 和未知 block type。
2. 对 patch 做总字节、operation 数、对象数、文本长度、Markdown 深度、公式长度、chart 行数/字段数、plot AST 深度、domain、采样点和执行时间限制。
3. 所有 kind、layout intent、mark、transform、selection、函数名和属性都来自 allowlist；未知字段默认拒绝而不是静默传递。
4. 版本冲突整批拒绝；操作使用稳定 ID 和幂等 request ID；renderer 不接受未经主进程校验的 IPC 对象。

### 6.2 各 renderer 的安全默认

- **文字**：react-markdown 默认不执行 HTML；不要启用 `rehype-raw`。若未来允许某个 raw tag，必须给出明确 sanitize schema。[react-markdown README](https://github.com/remarkjs/react-markdown)
- **公式**：KaTeX `trust: false`；不接受 `includegraphics`、HTML class/style 等外部资源/属性命令；限制 `maxExpand/maxSize`，保留 TeX source。[KaTeX security](https://katex.org/docs/security)
- **图表**：只允许内联或应用已拥有的数据；不允许 agent 传远程 URL、任意 signal、任意 tooltip HTML；Vega 的 expression 只留固定字段或经过 AST/长度检查的子集。[Vega-Lite data](https://vega.github.io/vega-lite/docs/data.html) [Vega signals](https://vega.github.io/vega/docs/signals/)
- **函数/几何**：数值 AST 解释器，不执行 JavaScript；限制采样和时间；错误只显示安全的“无法绘制此表达式”。
- **Mermaid（未来）**：保留 sanitization 和 sandbox；不因为默认 sanitizer 存在就把不可信流程图当作安全边界。[Mermaid README](https://github.com/mermaid-js/mermaid)
- **D2/Graphviz（未来）**：在隔离 worker/进程中离线渲染，不接受来自网络的任意输入；Graphviz 官方已提示其核心不适合直接承受蓄意攻击。[Graphviz README](https://gitlab.com/graphviz/graphviz/-/raw/main/README.md)
- **HTML（未来）**：只能在显式 sandbox 能力中出现；不能访问 Electron Node、IPC 或用户文件。

### 6.3 可验证性

每个 patch 在进入 renderer 前应产生短结果：`accepted(version=13, changed=[posterior,posterior-bars])`，或结构化错误：`rejected(code=LIMIT_EXCEEDED, path=operations[1].data)`。不要把完整 SVG/HTML/画布快照回传给 agent。

必须记录而不必播报给用户的指标：

- patch 到首个可见变化的 p50/p95；
- Voice 打断后从 `read` 到下一次 patch 的延迟；
- payload 字节/模型 token（能取得时）；
- schema 拒绝率、renderer 错误率、版本冲突率；
- 每个教学动作的对象数、变更数、画面跳动次数；
- Voice-only 与画板条件下的理解、延迟保持、迁移和纠错时间。

`[待验证]` 本文没有声称某个库会自动带来学习收益，也没有声称“JSON 一定比 HTML 少多少 token”。这些应以固定教学任务、固定模型和真实 Codex Voice 会话做基准。

## 7. 许可证与依赖决策

许可证是截至研究日期从官方仓库或官方许可证页看到的信号，不替代发布前的依赖树、字体、插件和二进制许可审计。

| 依赖/项目 | 官方许可证信号 | 对 Open Learning 的处理 |
| --- | --- | --- |
| MDX / Markdoc / react-markdown | MIT（各自官方仓库） | 可用于可信作者工具或文字 renderer；MDX 仍受执行代码风险限制 |
| Mermaid | MIT（官方 README/repo） | 后置可选，受 sandbox/config 限制 |
| D2 | MPL-2.0（官方 README） | 不作为默认 Electron 依赖；若导出再评估合规 |
| Graphviz | EPL-2.0（官方 license） | 不作为实时核心；若发行二进制需做 EPL/原生包审计 |
| Vega-Lite / Vega | Vega-Lite 官方仓库标示 BSD-3-Clause；Vega 项目及 `react-vega` 也需逐包锁定 | 适合 MVP，但发行前锁定版本和 NOTICE |
| KaTeX | MIT（官方仓库） | MVP 默认 |
| MathJax | Apache-2.0（官方仓库） | 后续可选；检查字体/组件包清单 |
| Typst | Apache-2.0（官方仓库） | 未来 export，不进实时 renderer |
| Penrose | MIT（官方仓库/docs） | 借鉴模型；未来 adapter |
| JSXGraph | LGPL-2.1-or-later / MIT 双许可（官方 README） | 选用具体发行方式前做法律确认；不暴露原 API |
| Mafs | MIT（官方仓库） | 函数图候选 |
| Excalidraw | MIT（官方仓库） | 只在产品需要自由白板时评估 |
| tldraw SDK | 官方文档说明采用 tldraw license，不是普通 permissive OSS；starter kit 的许可证不能替代 SDK 许可证 | 默认不依赖；先借鉴 typed actions |

官方来源： [MDX](https://github.com/mdx-js/mdx) [Markdoc](https://github.com/markdoc/markdoc) [react-markdown](https://github.com/remarkjs/react-markdown) [Mermaid](https://github.com/mermaid-js/mermaid) [D2](https://github.com/terrastruct/d2/blob/master/README.md) [Graphviz license](https://graphviz.org/license/) [Vega-Lite](https://github.com/vega/vega-lite) [Vega](https://github.com/vega/vega) [react-vega](https://github.com/vega/react-vega) [KaTeX](https://github.com/KaTeX/KaTeX) [MathJax](https://github.com/mathjax/MathJax) [Typst](https://github.com/typst/typst) [Penrose](https://github.com/penrose/penrose) [JSXGraph](https://github.com/jsxgraph/jsxgraph) [Mafs](https://github.com/stevenpetryk/mafs) [Excalidraw](https://github.com/excalidraw/excalidraw) [tldraw license](https://github.com/tldraw/tldraw/blob/main/apps/docs/content/community/license.mdx)

## 8. MVP 的明确范围

### P0：必须完成

1. `board patch` 的原子、版本化和稳定 ID 语义；`read` 能返回当前对象摘要、焦点和版本。
2. `concept/example/question/step` 对象 + `text`/`formula` block。
3. CommonMark 安全渲染、KaTeX 公式渲染、复制公式 source。
4. `chart` 小 DSL 的最小 Vega-Lite adapter：bar/line/point、x/y、内联数据、replace/append、point selection。
5. `plot` 小 DSL 的表达式 allowlist、domain/采样限制，以及 Mafs 函数图；无 JavaScript evaluation。
6. renderer 错误/超限/版本冲突的可读状态；英文和简体中文状态文案。
7. 一个真实 Voice 学习脚本，证明“先 patch，再用语音引用，追问后局部 update/remove”，而不是讲完再生成总结图。

### P1：验证 P0 之后再做

- JSXGraph adapter：拖点、滑块、交点、几何约束；
- MathJax accessibility mode；
- Mermaid `diagram` block，限定 flow/sequence 且 sandbox；
- chart 的 facet/layer、更多 transform、chart data copy/export；
- 画面历史、教学步骤回放和局部导出。

### 明确不做

- 任意 MDX/JSX/JavaScript；
- 任意 HTML/CSS/SVG/iframe；
- 把 Mermaid/D2/Graphviz 当作底层 board model；
- 完整 Typst 实时文档编辑器；
- 完整 Penrose 多语言/约束系统；
- 把 Excalidraw/tldraw 的通用 shape API 暴露给 agent；
- subagent 并行写同一画布；
- 自动生成“课后总结图”代替实时教学动作。

## 9. 开发前的验证顺序

1. 用固定的“斜率”和“贝叶斯更新”教学脚本，对比完整 Vega-Lite/完整 HTML/本文小 DSL 的 payload 字节、模型 token、首个可见变化延迟和错误率；不要预先假定结果。
2. 只实现 `text + formula`，先跑通 patch → renderer → readback；确认 Voice 打断、版本冲突和局部更新。
3. 加入 chart named data，测 `replace/append` 是否真的避免整图重建；确认 `react-vega` spec 变化的生命周期和销毁行为。[react-vega README](https://github.com/vega/react-vega)
4. 加入 plot 数值 AST，做表达式深度、采样点、极端 domain、NaN/Infinity 和超时测试；确认 Mafs 采样行为符合上限。[Mafs plots](https://mafs.dev/guides/display/plots)
5. 用键盘、屏幕阅读器、英文、简体中文、reduced-motion、窗口缩放和断开 renderer 的情形验收；图表和公式都要有文本描述/复制路径。
6. 只有 P0 证明实时 patch 有价值后，再决定 geometry、diagram 和 export；每个新 renderer 都必须说明它如何做 ID、patch、sanitize、超时和许可证审计。

## 10. 最终推荐清单

**现在采用：** 小型版本化 patch；稳定 ID 的语义 scene；受限 CommonMark/react-markdown；KaTeX；Vega-Lite 子集；受限数值 AST + Mafs；renderer-owned layout/style/animation。

**现在借鉴但不依赖：** Markdoc 的 typed tag/validate；Penrose 的 semantic/style 分离；tldraw 的 typed actions、结构化 readback、validation 和 streaming。

**以后按需求加入：** MathJax（无障碍/复杂数学）、JSXGraph（交互几何）、Mermaid（受限流程图）、Typst（文档/PDF export）。

**当前筛掉：** 任意 MDX、D2/Graphviz 实时核心、完整 Penrose、通用 Excalidraw/tldraw 画布、任意 HTML/JS sandbox 默认能力。

这条路线最重要的取舍是：**不追求一种语言在语法上“什么都能写”，而追求 agent 在每个教学时刻只需表达“要让学习者看到什么变化”。** 这才同时服务低 token、实时 patch、安全验证和 Voice 指向性。
