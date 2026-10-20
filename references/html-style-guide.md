# 报告 HTML 风格规范

深色玄学风，与用户既有报告保持一致。改版式主要改 `templates/report-template.html`，改颜色改这里。

## 配色变量（:root）

```css
:root{
  --bg1:#1a1a2e; --bg2:#16213e; --bg3:#0f3460;   /* 背景渐变三段 */
  --gold:#ffd700;   /* 主强调：标题、边框、重点 */
  --cyan:#22d3ee;   /* 次强调：小标题、标签 */
  --purple:#a855f7; /* 三强调：专题标签 */
  --green:#4ade80;  /* 正向/核心结论 */
  --txt:#e8e6df;    /* 正文 */
  --muted:#9aa3b2;  /* 弱化文字 */
  --card:rgba(255,255,255,.05);  /* 卡片底 */
}
```

## 页面骨架

```
body 背景：linear-gradient(135deg, var(--bg1), var(--bg2), var(--bg3))
.wrap  容器：max-width 880–900px，居中
h1     主标题：金色、字距 4px、居中
.sub   副标题：muted 灰、居中
.card  卡片：圆角 24px、金色半透明边框、外阴影
  .card h2  卡片标题：金色 + 左侧 4px 金色竖条
  .card h3  小节标题：青色
```

## 常用组件

| 组件 | 类名 | 用途 |
|---|---|---|
| 信息格栅 | `.basic` / `.grid2` | 基本资料、贵人画像四宫格 |
| 柱状排盘 | `.pgrid` > `.pillar` | 四柱展示（大字干支） |
| 表格 | `table` | 逐年表、大运表、对比表 |
| 标签 | `.tag`(金) / `.tagc`(青) / `.tagp`(紫) | 关键词胶囊 |
| 核心结论 | `.core` | 大字绿色一句话总断 |
| 警示文字 | `.warn` | 暗线提醒（#ffb4a2） |
| 金句 | `.quote` | 结尾引言 |
| 免责 | `.footer` | 底部声明 |

## 字体

`font-family:'Noto Serif SC',serif;`（衬线，有传统感）
引入：`<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">`

## 响应式

```css
@media(max-width:640px){ .basic,.pgrid,.grid2,.twocol{ grid-template-columns:repeat(2,1fr) } }
```

## 内容结构模板（建议顺序）

1. **基本资料卡**：性别、公历/农历生日、四柱、命宫
2. **核心结论**：一句话总断（.core）+ 大运定位表
3. **分主题卡片**：事业 / 财运 / 贵人 / 感情 / 健康（按需）
4. **对比表**：多年对比或多维度汇总
5. **操作建议**：分年度 / 分场景的可执行清单
6. **金句** + **免责声明**

## 注意

- 所有颜色用变量，便于整套换肤。
- 表格首行用 `<th>`（自动金色表头）。
- 字号：正文 14–14.5px，表格 13.5px，h1 30px。
- 不用外部 JS，纯静态 HTML，保证离线可看、可保存。
