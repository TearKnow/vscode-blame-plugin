# Blame Align / Dirty Clear / Hover Summary Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** 固定行首 blame 宽度、编辑时清注解、悬停显示提交说明、菜单中文，并打出新 vsix。

**Architecture:** 在现有 `before` 装饰上设统一 `width`；`extension.ts` 监听文档变更即时 clear，保存或变干净后 refresh；`blame.ts` 解析 porcelain `summary`；`package.json` 命令标题中文化。

**Tech Stack:** VS Code Extension API、TypeScript、git blame --line-porcelain、vsce

## Global Constraints

- 保持行首 annotate（不改行尾）
- 编辑不实时 blame，仅 clear；保存 / 撤销干净后 refresh
- 无新依赖

---

### Task 1: blame summary

**Files:** `src/blame.ts`

- [ ] `BlameLine` 增加 `summary: string`
- [ ] porcelain 解析 `summary `，写入 commitMeta
- [ ] `npm run compile` 通过

### Task 2: 对齐 + hover

**Files:** `src/decorate.ts`

- [ ] `before` 增加统一 `width: `${labelWidth + 2}ch``
- [ ] hover 增加 summary 行（有则显示）
- [ ] compile 通过

### Task 3: 脏文件生命周期 + 中文菜单

**Files:** `src/extension.ts`, `package.json`, `README.md`

- [ ] `onDidChangeTextDocument`：开启 blame 时 clear；若 `!isDirty` 则 refresh
- [ ] 命令 title 中文
- [ ] README 同步
- [ ] compile + `npx vsce package` 生成新 vsix
