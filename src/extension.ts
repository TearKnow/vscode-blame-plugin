import * as vscode from 'vscode'
import { blameFile } from './blame'
import { BlameDecorator } from './decorate'

const ACTIVE_KEY = 'gitBlameAnnotate.active'

let decorator: BlameDecorator
let enabledForEditor: WeakMap<vscode.TextEditor, boolean>
let statusBar: vscode.StatusBarItem

export function activate(context: vscode.ExtensionContext): void {
  decorator = new BlameDecorator()
  enabledForEditor = new WeakMap()
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.command = 'gitBlameAnnotate.toggle'
  statusBar.tooltip = '切换 Git Blame Annotate'

  context.subscriptions.push(
    decorator,
    statusBar,
    vscode.commands.registerCommand('gitBlameAnnotate.toggle', () => toggle()),
    vscode.commands.registerCommand('gitBlameAnnotate.show', () => setActive(true)),
    vscode.commands.registerCommand('gitBlameAnnotate.hide', () => setActive(false)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      void onEditorChanged(editor)
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const editor = vscode.window.activeTextEditor
      if (editor && editor.document === doc && enabledForEditor.get(editor)) {
        void refresh(editor)
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.document !== event.document) {
        return
      }
      if (!enabledForEditor.get(editor)) {
        return
      }
      if (event.contentChanges.length === 0) {
        return
      }
      // 编辑中立刻清掉，避免行首注解与代码错位
      decorator.clear()
      updateStatusBar(true)
      // 撤销到干净状态时自动恢复
      if (!event.document.isDirty) {
        void refresh(editor)
      }
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      const editor = vscode.window.activeTextEditor
      if (editor && enabledForEditor.get(editor)) {
        void refresh(editor)
      }
    }),
  )

  void setContext(false)
  updateStatusBar(false)
}

export function deactivate(): void {
  decorator?.dispose()
}

async function toggle(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }
  const next = !enabledForEditor.get(editor)
  await setActive(next)
}

async function setActive(active: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  if (!active) {
    enabledForEditor.set(editor, false)
    decorator.clear()
    await setContext(false)
    updateStatusBar(false)
    return
  }

  enabledForEditor.set(editor, true)
  await refresh(editor)
}

async function onEditorChanged(editor: vscode.TextEditor | undefined): Promise<void> {
  if (!editor) {
    decorator.clear()
    await setContext(false)
    updateStatusBar(false)
    return
  }

  if (enabledForEditor.get(editor)) {
    await refresh(editor)
  } else {
    decorator.clear()
    await setContext(false)
    updateStatusBar(false)
  }
}

async function refresh(editor: vscode.TextEditor): Promise<void> {
  const filePath = editor.document.uri.fsPath
  if (editor.document.uri.scheme !== 'file') {
    vscode.window.showWarningMessage('Git Blame Annotate 仅支持本地文件')
    enabledForEditor.set(editor, false)
    await setContext(false)
    updateStatusBar(false)
    return
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'Git Blame Annotate',
      },
      async () => {
        const lines = await blameFile(filePath)
        if (!enabledForEditor.get(editor)) {
          return
        }
        await decorator.apply(editor, lines)
        await setContext(true)
        updateStatusBar(true)
      },
    )
  } catch (error) {
    enabledForEditor.set(editor, false)
    decorator.clear()
    await setContext(false)
    updateStatusBar(false)
    const message = error instanceof Error ? error.message : String(error)
    vscode.window.showErrorMessage(`Git Blame 失败: ${message}`)
  }
}

async function setContext(active: boolean): Promise<void> {
  await vscode.commands.executeCommand('setContext', ACTIVE_KEY, active)
}

function updateStatusBar(active: boolean): void {
  if (active) {
    statusBar.text = '$(git-commit) Blame On'
    statusBar.show()
  } else {
    statusBar.hide()
  }
}
