# Git Blame Annotate

行号旁 **Git Blame 热力色条**：越新越深；悬停显示作者、时间、commit、提交说明。

## 效果

- 行号右键 → `切换 / 隐藏 Git Blame 注解`
- 行首色条（左边框，编辑时保持显示，不跟光标乱跳）
- 悬停行首：Git 信息（可与语言提示叠在一起）
- 保存后重新 `git blame` 刷新

> 色条可能轻微盖住行首几个字，但不写入文件；这是为了编辑时稳定、不闪躲。

## 安装（VSIX）

1. 扩展面板 → `...` → **Install from VSIX…**
2. 选择 `git-blame-annotate-0.3.20.vsix`
3. **Developer: Reload Window**

## 本地开发 / 打包

```bash
npm install
npm run compile
npx @vscode/vsce package --no-dependencies --allow-missing-repository
```
