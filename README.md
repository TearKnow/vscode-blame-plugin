# Git Blame Annotate

行号与代码之间的 **Git Blame 热力色条**（Cursor / VS Code）：越新颜色越深；悬停显示作者、时间、commit；编辑时保留，保存后刷新。

## 效果

- 行号区域 **右键** → `切换 Git Blame 注解` / `隐藏 Git Blame 注解`
- 行号右侧（代码左侧）显示热力色条
- 悬停色条：作者、时间、commit 短哈希、提交说明
- 不插入文字，编辑不受影响；保存后自动重新 `git blame`

## 安装（VSIX）

1. 扩展面板 → `...` → **Install from VSIX…**
2. 选择仓库里的 `git-blame-annotate-*.vsix`（当前为 `0.3.3`）
3. 命令面板执行 **Developer: Reload Window**

## 本地开发

```bash
cd d:\www\vscode-git-blame-annotate
npm install
npm run compile
```

用 Cursor / VS Code 打开本目录，按 `F5` 启动「Run Extension」，在新窗口打开任意 Git 仓库文件，右键行号即可。

也可命令面板搜索：`Git Blame 注解: 切换 Git Blame 注解`。

## 打包

```bash
npm run compile
npx @vscode/vsce package --no-dependencies --allow-missing-repository
```

生成的 `git-blame-annotate-x.y.z.vsix` 在项目根目录。

## 说明

- 每个编辑器独立记住开关；切换文件会按该文件状态刷新。
- 仅支持本地 `file://` 的 Git 跟踪文件；聊天 / Composer 输入框不可用。
- 未跟踪 / 非 Git 文件会提示失败。
