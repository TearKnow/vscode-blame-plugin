# Git Blame Annotate

行号旁 **Git Blame 热力色条**：越新越深；悬停显示作者、时间、commit、提交说明。

## 效果

- 行号右键 → `切换 / 隐藏 Git Blame 注解`
- 行首色条（左边框，编辑时保持显示，不跟光标乱跳）
- 悬停行首：Git 信息（可与语言提示叠在一起）
- 保存后重新 `git blame` 刷新

> 色条可能轻微盖住行首几个字，但不写入文件；这是为了编辑时稳定、不闪躲。

## 安装（VSIX）

1. command+shift+p搜索“install from VSIX”选择文件
2. command+shift+p搜素“reload window“

## 本地开发 / 打包

1. 然后执行：

```bash
npm install
npm run compile
npx @vscode/vsce package --no-dependencies --allow-missing-repository
```

2. 成功后会在项目根目录生成 `git-blame-annotate-<version>.vsix`
