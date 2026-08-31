# Plugin 安装与学习首页 UI 变更方案

> Status: approved
>
> Owner: Project owner
>
> Approved by: Project owner（2026-08-31 对话需求）
>
> Approved at: 2026-08-31

## 1. 决策摘要

- 变更：把应用入口改为 Plugin 安装检测；安装成功后进入学习卡片首页，保留实时画板作为学习会话详情。
- 用户：已安装 Codex、准备通过 Codex Voice 学习的中英文用户。
- 主要用户任务：完成 Open Learning Plugin 安装并知道如何从 Codex 发起第一节课。
- 期望结果：应用每 5 秒确认一次本机安装状态；首次检测到安装后确认成功；以后启动先检测再进入首页。
- 不做什么：不在应用内修改 Codex 配置，不托管账号登录，不创建课程管理、搜索或云同步。
- 更简单的方案及未采用原因：仅展示命令会迫使普通用户使用终端，不能满足“从 Codex Plugins 添加 Git 地址”的产品流程。

## 2. 用户意图

| 意图 | 用户 | 场景 | 占比 | 成功标准 |
| --- | --- | --- | ---: | --- |
| 安装 Plugin | 首次用户 | 第一次打开应用 | 65% | 能复制 Git 地址、按步骤添加，并被应用自动检测 |
| 发起第一节课 | 已安装用户 | 安装完成或再次启动 | 25% | 能从默认教程卡理解在 Codex 中如何触发 |
| 查看当前学习画板 | 学习中的用户 | Codex 已创建会话 | 10% | 首页出现当前会话卡，打开后进入实时画板 |

## 3. 信息架构与布局

- 进入方式：应用启动后立即检查 Plugin；未安装进入安装页，已安装进入首页或首次成功 Dialog。
- 视觉层级：页面标题与唯一主要操作优先；安装步骤或卡片列表其次；版本和状态信息最低。
- 主要操作：安装页复制 Git 地址；成功 Dialog 开始使用；首页打开教程或当前会话。
- 次要操作：重新检测、返回学习首页。
- 响应式变化：安装页最大宽度 672 px；首页最大宽度 960 px；卡片网格从多列收为单列。
- 溢出和长文案处理：Git 地址单行滚动；标题截断；页面主体允许垂直滚动。

## 4. 状态

- 正常：Plugin 已启用，显示学习卡片首页。
- Loading：首次检查使用 Skeleton；后续检查保留当前页面并更新状态文案。
- Empty：没有真实学习会话时显示默认教程卡，不显示无内容死胡同。
- Disabled：检查期间禁用手动重试；复制地址不依赖检查状态。
- Success：首次检测到已安装时显示带遮罩的成功 Dialog。
- Error 与恢复：找不到 Codex 或查询失败时说明影响，并提供重新检测。
- Offline / unavailable：本地 CLI 查询不依赖网络；Git Marketplace 安装失败由 Codex 界面负责说明。
- Cancelled：成功 Dialog 不提供关闭；用户明确点击“开始使用”完成首次引导。
- Destructive：不适用；本流程不删除或覆盖用户数据。

## 5. 组件和 Token

- 复用的 shadcn 组件：Button、Badge、Skeleton、Empty、Sonner。
- 新增的 shadcn 组件：Card、Dialog。
- 自定义组件及现有 primitive 不足的原因：实时教学画板继续使用 renderer-owned primitives；Plugin 轮询是产品状态逻辑，不是视觉 primitive。
- 颜色 token：background、surface、foreground、muted-foreground、interactive、success、warning、border。
- 字体 token：系统 sans 与 mono；只使用 400、500、600。
- 间距、圆角、尺寸、阴影和动效 token：4 px 网格；Card 12 px；Dialog 使用 shadcn 默认 overlay；150–250 ms，并尊重 reduced motion。

## 6. 操作后果

| 操作 | 可撤销 | 外部或重要影响 | 自动 / 直接操作 / 明确确认 | 恢复方式 |
| --- | --- | --- | --- | --- |
| 复制 Git 地址 | 是 | 写入系统剪贴板 | 直接操作 | 再次复制或覆盖剪贴板 |
| 在 Codex 安装 Plugin | 是 | 修改 Codex 本地 Plugin 配置 | 用户在 Codex 中明确操作 | 在 Codex Plugins 中移除 |
| 开始使用 | 是 | 只保存本地 onboarding 完成状态 | 明确确认 | Plugin 被移除后自动回到安装页 |

## 7. 中英文案

| ID | 界面与状态 | 用户需要 | English | 简体中文 | 无障碍或播报文案 | 限制或后果 |
| --- | --- | --- | --- | --- | --- | --- |
| install.title | 安装页 | 理解入口 | Install the Codex plugin to get started | 安装 Codex 插件即可使用 | 页面主标题 | 无 |
| install.copy | 安装页 | 获取地址 | Copy Git address | 复制 Git 地址 | 复制 Marketplace Git 地址 | 覆盖剪贴板 |
| install.checking | 安装页 | 知道自动检测 | Checking every 5 seconds | 每 5 秒自动检查 | 正在检查 Plugin 安装状态 | 无 |
| success.title | Dialog | 确认完成 | Open Learning is ready | Open Learning 已安装 | Plugin 安装成功 | 无 |
| success.start | Dialog | 进入产品 | Start using | 开始使用 | 开始使用 Open Learning | 保存本地完成状态 |
| library.title | 首页 | 找到内容 | Learning space | 学习空间 | 页面主标题 | 无 |
| guide.title | 默认卡片 | 学会触发 | Start your first lesson | 开始第一节学习 | 打开入门教程 | 无 |

## 8. 可访问性与国际化

- 语义结构和可访问名称：页面使用 header/main；步骤使用有序列表；卡片操作使用 button；Dialog 有 title 与 description。
- 键盘顺序和 Focus：主要操作在说明后；Dialog 自动聚焦并在完成后恢复；卡片完整可键盘触发。
- 非颜色状态提示：所有状态点同时带文字。
- Reduced motion：只使用 token 化过渡并由全局 reduced-motion 规则关闭。
- 200% 文字缩放：主体可滚动，卡片网格收为单列，不依赖固定高度承载正文。
- 英文和中文长度风险：按钮允许内容宽度；Git 地址独立滚动；标题与说明分别占行。

## 9. 验收

- [x] 一个界面只有一个主要任务和主要操作。
- [x] 产品 UI 复用 shadcn primitive。
- [x] 正常、异步、空、错误和恢复状态已定义。
- [x] 所有颜色和尺寸来自 `DESIGN.md`。
- [x] 中英文可见文案和无障碍文案完整。
- [ ] 键盘、Focus、Reduced Motion 和缩放已验证。
- [x] 评审结果与批准人、日期已记录。

## 10. 评审结果

- Decision: approved
- Notes: 按项目 owner 在 2026-08-31 提出的页面流程实施；不新增账号、课程管理或云端状态。
