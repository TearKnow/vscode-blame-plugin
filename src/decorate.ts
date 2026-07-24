import * as vscode from 'vscode'
import type { BlameLine } from './blame'
import { HEAT_LEVELS, heatBorder, heatLevel, iconSlot } from './colors'

export class BlameDecorator {
  private readonly types: vscode.TextEditorDecorationType[] = []
  private readonly extensionUri: vscode.Uri
  private dark = false
  private ready = false

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri
  }

  clear(editor?: vscode.TextEditor): void {
    if (!editor) {
      return
    }
    for (const type of this.types) {
      editor.setDecorations(type, [])
    }
  }

  dispose(): void {
    for (const type of this.types) {
      type.dispose()
    }
    this.types.length = 0
    this.ready = false
  }

  apply(editor: vscode.TextEditor, blameLines: BlameLine[]): void {
    const dark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
      || vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast
    this.ensureTypes(dark)

    const times = blameLines.map((b) => b.authorTime).filter((t) => t > 0)
    const min = times.length ? Math.min(...times) : 0
    const max = times.length ? Math.max(...times) : 0

    const groups: vscode.DecorationOptions[][] = Array.from({ length: HEAT_LEVELS }, () => [])
    const lineCount = editor.document.lineCount

    for (const blame of blameLines) {
      const lineIndex = blame.line - 1
      if (lineIndex < 0 || lineIndex >= lineCount) {
        continue
      }

      const level = heatLevel(blame.authorTime, min, max)
      const end = Math.min(1, editor.document.lineAt(lineIndex).text.length)
      groups[level].push({
        range: new vscode.Range(lineIndex, 0, lineIndex, end),
        hoverMessage: hoverText(blame),
      })
    }

    for (let level = 0; level < HEAT_LEVELS; level += 1) {
      editor.setDecorations(this.types[level], groups[level])
    }
  }

  private ensureTypes(dark: boolean): void {
    if (this.ready && this.dark === dark) {
      return
    }
    for (const type of this.types) {
      type.dispose()
    }
    this.types.length = 0
    this.dark = dark
    this.ready = true

    const theme = dark ? 'dark' : 'light'
    for (let level = 0; level < HEAT_LEVELS; level += 1) {
      const icon = vscode.Uri.joinPath(
        this.extensionUri,
        'media',
        'gutter',
        theme,
        `heat-${iconSlot(level)}.svg`,
      )
      this.types.push(
        vscode.window.createTextEditorDecorationType({
          gutterIconPath: icon,
          gutterIconSize: '100%',
          isWholeLine: true,
          borderWidth: '0 0 0 3px',
          borderStyle: 'solid',
          borderColor: heatBorder(level, dark),
        }),
      )
    }
  }
}

function hoverText(blame: BlameLine): vscode.MarkdownString {
  const time = blame.authorTime
    ? new Date(blame.authorTime).toLocaleString()
    : ''
  return new vscode.MarkdownString(
    [`**${blame.author}**`, time, `\`${blame.commit.slice(0, 8)}\``].filter(Boolean).join('  \n'),
  )
}
