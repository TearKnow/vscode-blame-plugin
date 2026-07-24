# Git Blame Annotate

行号左侧热力色块；悬停看作者 / 时间 / commit；编辑时保留，保存后刷新。

## 使用

行号右键 → **切换 / 隐藏 Git Blame 注解**

仅支持本地 Git 文件（聊天输入框不可用）。

## 打包 VSIX

需要 Node.js。clone 后先安装依赖，再打包：

```bash
npm install
npx vsce package
```

会在项目根目录生成 `git-blame-annotate-x.y.z.vsix`。安装：

```bash
code --install-extension git-blame-annotate-x.y.z.vsix
```

或在 VS Code / Cursor 中选择 “Install from VSIX…”。
