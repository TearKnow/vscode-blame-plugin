import * as vscode from 'vscode'
import { blameFile } from './blame'
import { BlameDecorator, registerBlameHover } from './decorate'

const CTX = 'gitBlameAnnotate.active'

let decorator: BlameDecorator
/** 按文件 URI 记住开关（不能按 TextEditor：切 tab 时实例会变，状态会丢） */
const enabledUris = new Set<string>()
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
    registerBlameHover((uri) => enabledUris.has(uri)),
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
      if (editor?.document === doc && isEnabled(editor)) {
        void refresh(editor)
      }
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      const editor = vscode.window.activeTextEditor
      if (editor && isEnabled(editor)) {
        void refresh(editor)
      }
    }),
  )

  void vscode.commands.executeCommand('setContext', CTX, false)
}

export function deactivate(): void {
  decorator?.dispose()
}

function uriKey(editor: vscode.TextEditor): string {
  return editor.document.uri.toString()
}

function isEnabled(editor: vscode.TextEditor): boolean {
  return enabledUris.has(uriKey(editor))
}

async function toggle(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }
  await setActive(!isEnabled(editor))
}

async function setActive(active: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  if (!active) {
    gen += 1
    enabledUris.delete(uriKey(editor))
    decorator.clear(editor)
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
    return
  }

  enabledUris.add(uriKey(editor))
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
  if (isEnabled(editor)) {
    status.text = '$(sync~spin) Blame…'
    status.show()
    await vscode.commands.executeCommand('setContext', CTX, true)
    void refresh(editor)
  } else {
    decorator.clear(editor)
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
  }
}

async function refresh(editor: vscode.TextEditor): Promise<void> {
  const my = ++gen
  const key = uriKey(editor)
  if (editor.document.uri.scheme !== 'file') {
    enabledUris.delete(key)
    await vscode.commands.executeCommand('setContext', CTX, false)
    status.hide()
    vscode.window.showWarningMessage('Git Blame 仅支持本地文件')
    return
  }

  try {
    const lines = await blameFile(editor.document.uri.fsPath)
    if (my !== gen || !enabledUris.has(key)) {
      return
    }
    // 编辑器可能已切走，只画仍对应同一文件的 editor
    if (editor.document.uri.toString() !== key) {
      return
    }
    decorator.apply(editor, lines)
    if (vscode.window.activeTextEditor?.document.uri.toString() === key) {
      status.text = '$(git-commit) Blame On'
      status.show()
    }
  } catch (error) {
    if (my !== gen) {
      return
    }
    enabledUris.delete(key)
    decorator.clear(editor)
    if (vscode.window.activeTextEditor?.document.uri.toString() === key) {
      await vscode.commands.executeCommand('setContext', CTX, false)
      status.hide()
    }
    const msg = error instanceof Error ? error.message : String(error)
    vscode.window.showErrorMessage(`Git Blame 失败: ${msg}`)
  }
}
