import * as vscode from 'vscode'
import { blameFile } from './blame'
import { BlameDecorator } from './decorate'

const CTX = 'gitBlameAnnotate.active'

let decorator: BlameDecorator
let enabled = new WeakMap<vscode.TextEditor, boolean>()
let status: vscode.StatusBarItem
let gen = 0

export function activate(context: vscode.ExtensionContext): void {
  decorator = new BlameDecorator()
  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  status.command = 'gitBlameAnnotate.toggle'
  status.tooltip = '切换 Git Blame 注解'

  context.subscriptions.push(
    decorator,
    status,
    vscode.commands.registerCommand('gitBlameAnnotate.toggle', () => {
      void toggle()
    }),
    vscode.commands.registerCommand('gitBlameAnnotate.hide', () => {
      void setActive(false)
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      void onEditor(editor)
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const editor = vscode.window.activeTextEditor
      if (editor?.document === doc && enabled.get(editor)) {
        void refresh(editor)
      }
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      const editor = vscode.window.activeTextEditor
      if (editor && enabled.get(editor)) {
        void refresh(editor)
      }
    }),
  )

  void vscode.commands.executeCommand('setContext', CTX, false)
}

export function deactivate(): void {
  decorator?.dispose()
}

async function toggle(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }
  await setActive(!enabled.get(editor))
}

async function setActive(active: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  if (!active) {
    gen += 1
    enabled.set(editor, false)
    decorator.clear(editor)
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
    return
  }

  enabled.set(editor, true)
  await vscode.commands.executeCommand('setContext', CTX, true)
  status.text = '$(sync~spin) Blame…'
  status.show()
  void refresh(editor)
}

async function onEditor(editor: vscode.TextEditor | undefined): Promise<void> {
  if (!editor) {
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
    return
  }
  if (enabled.get(editor)) {
    status.text = '$(sync~spin) Blame…'
    status.show()
    void refresh(editor)
  } else {
    decorator.clear(editor)
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
  }
}

async function refresh(editor: vscode.TextEditor): Promise<void> {
  const my = ++gen
  if (editor.document.uri.scheme !== 'file') {
    enabled.set(editor, false)
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
    vscode.window.showWarningMessage('Git Blame 仅支持本地文件')
    return
  }

  try {
    const lines = await blameFile(editor.document.uri.fsPath)
    if (my !== gen || !enabled.get(editor)) {
      return
    }
    decorator.apply(editor, lines)
    status.text = '$(git-commit) Blame On'
    status.show()
  } catch (error) {
    if (my !== gen) {
      return
    }
    enabled.set(editor, false)
    decorator.clear(editor)
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
    const msg = error instanceof Error ? error.message : String(error)
    vscode.window.showErrorMessage(`Git Blame 失败: ${msg}`)
  }
}
