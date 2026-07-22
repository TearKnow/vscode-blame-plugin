# Git Blame Annotate 优化设计

日期：2026-07-22  
状态：已确认

## 背景

扩展已实现 PhpStorm 风格行首 Git Blame 注解，但仍有三个问题：

1. 各行注解块宽度不一致，代码起点不对齐（中英文混排时 `padEnd` 空格不够）。
2. 注解画在行首 `before`，编辑时行号与注解错位，版面错乱；当前仅在保存后刷新。
3. 悬停只显示作者、时间、commit 短哈希，缺少提交说明（summary）。

另外：行号右键菜单命令标题为英文，不便快速识别，需改为中文。

## 目标

| 需求 | 成功标准 |
|------|----------|
| 对齐 | 同一文件内所有 blame 蓝块右边缘对齐，代码列起点一致 |
| 编辑安全 | 文档一改动立即清除注解；保存（或撤销至干净）后恢复正确 blame |
| 悬停信息 | Hover 包含提交说明（summary） |
| 菜单文案 | 行号右键 / 命令面板相关标题为中文 |

非目标：不改为行尾 inline blame；不在编辑过程中实时重算 blame。

## 方案概要

采用「行首固定宽 + 脏文件清注解 + 悬停补 summary」：

- 继续用 `DecorationRenderOptions.before` 画在行首。
- 为本文件最长标签设置统一 CSS `width`。
- 内容变更时立刻 `clear()`；保存或文档变干净后再 `refresh`。
- 解析 porcelain 的 `summary` 写入 hover。
- `package.json` 中命令 `title` 改为中文。

## 架构与改动面

```
extension.ts  — 脏文件生命周期（change / save / undo 干净）
blame.ts      — BlameLine 增加 summary；解析 porcelain summary
decorate.ts   — 固定 width 对齐；hover 增加提交说明
package.json  — 命令中文标题
README.md     — 同步行为与菜单说明
```

无新模块；不引入依赖。

## 行为与生命周期

1. **开启**：现有 toggle/show；跑 `git blame` 并 `decorator.apply`。
2. **内容变更**：`onDidChangeTextDocument`，若该编辑器 blame 已开启且 `document` 为当前文件 → `decorator.clear()`。开关状态（`enabledForEditor`）保持为 true；状态栏可仍显示 Blame On，表示「开着但暂不画」。
3. **保存**：现有 `onDidSaveTextDocument` → `refresh`（重新 blame + apply）。
4. **撤销至干净**：若 `onDidChangeTextDocument` 后 `!document.isDirty` 且该编辑器 blame 开启 → 自动 `refresh`（避免只能靠再保存）。
5. **关闭 / 切编辑器**：逻辑不变。

防抖：清除是即时的；自动 refresh 仅在「保存」或「变干净」时触发，不对每次按键 debounce blame。

## 对齐

1. 对文件内所有 `formatLabel` 结果取最大字符长度 `labelWidth`（现有逻辑保留）。
2. 每条 `before` 设置相同 `width`，例如 `` `${labelWidth + 2}ch` ``（含左右空格余量），利用 VS Code decoration attachment 的恒定宽度对齐。
3. `contentText` 仍可 `padEnd`；可选为 attachment 指定等宽 `fontFamily`（与编辑器接近）以降低混排偏差。
4. 不改为行尾 `after`。

## 悬停内容

`BlameLine` 增加可选字段 `summary: string`。

从 `git blame --line-porcelain` 解析以 `summary ` 开头的行，写入 commit 元数据缓存（与 author / author-time 同级）。

Hover Markdown 顺序：

1. **作者**
2. 本地化完整时间
3. `` `短哈希(8)` ``
4. 提交说明（空或缺失则省略该行）

## 菜单中文

| command | title（建议） |
|---------|----------------|
| `gitBlameAnnotate.toggle` | 切换 Git Blame 注解 |
| `gitBlameAnnotate.show` | 显示 Git Blame 注解 |
| `gitBlameAnnotate.hide` | 隐藏 Git Blame 注解 |

`category` 可保持 `Git Blame` 或改为 `Git Blame 注解`（实现时与菜单可读性一致即可）。

## 错误处理

- `git blame` 失败：现有错误提示与关闭逻辑不变。
- 无 summary 的 commit：hover 不显示空行。
- 非 file scheme / 未跟踪文件：现有警告不变。

## 测试要点

1. 打开 blame：各行蓝块等宽，代码列对齐。
2. 键入一字：注解立即消失；状态栏仍可显示 On。
3. 保存：注解按新 blame 恢复。
4. 开启 blame 后编辑再 Undo 到干净：注解自动恢复且与行对应。
5. 悬停某行：可见提交说明。
6. 行号右键：看到中文「切换/隐藏 Git Blame 注解」。

## 范围外

- 编辑中 debounce 实时 blame
- 行尾 / 独立 gutter 列
- 点击跳转 commit、复制哈希等交互增强
