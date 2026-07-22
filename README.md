# Git Blame Annotate

PhpStorm 风格的 **行首 Git Blame** 扩展（Cursor / VS Code）。

## 效果

- 行号区域 **右键** → `切换 Git Blame 注解` / `隐藏 Git Blame 注解`
- 在每行代码 **最前面** 显示：`YYYY/M/D 星期X  author`（同文件内等宽对齐）
- 按文件内相对新旧上色：**越新背景越深**
- 悬停显示作者、时间、commit 短哈希、提交说明

> VS Code 无法在行号左侧插入独立列，因此 annotate 画在行首（方案 1）。

## 本地运行

```bash
cd d:\www\vscode-git-blame-annotate
npm install
npm run compile
```

然后用 Cursor / VS Code 打开本目录，按 `F5` 启动「Run Extension」，在新窗口中打开任意 Git 仓库文件，右键行号即可。

也可命令面板搜索：`Git Blame 注解: 切换 Git Blame 注解`。

## 配置

| 配置项 | 默认 | 说明 |
|--------|------|------|
| `gitBlameAnnotate.dateLocale` | `zh-CN` | 日期/星期 locale |
| `gitBlameAnnotate.maxAuthorLength` | `16` | 作者名最大长度 |
| `gitBlameAnnotate.heatLevels` | `8` | 热力分档数 |

## 说明

- 每个编辑器独立记住开关状态；切换文件会按该文件状态刷新。
- **编辑时立刻清除注解**，避免行首装饰与代码错位；保存后（或撤销到未修改）自动重新 `git blame`。
- 未跟踪 / 非 Git 文件会提示失败。
