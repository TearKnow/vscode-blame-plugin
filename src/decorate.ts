import * as vscode from 'vscode'
import type { BlameLine } from './blame'
import { HEAT_LEVELS, heatBorder, heatLevel } from './colors'

/** 色条宽度（左边框，不占可编辑字符，光标进不去） */
const BAR_PX = 18

/** uri -> (0-based line -> blame) */
const blameCache = new Map<string, Map<number, BlameLine>>()

export class BlameDecorator {
  private readonly types: vscode.TextEditorDecorationType[] = []
  private dark = false
  private ready = false

  clear(editor?: vscode.TextEditor): void {
    if (!editor) {
      return
    }
    blameCache.delete(editor.document.uri.toString())
    for (const type of this.types) {
      editor.setDecorations(type, [])
    }
  }

  dispose(): void {
    blameCache.clear()
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
    const byLine = new Map<number, BlameLine>()

    for (const blame of blameLines) {
      const lineIndex = blame.line - 1
      if (lineIndex < 0 || lineIndex >= lineCount) {
        continue
      }

      byLine.set(lineIndex, blame)
      const level = heatLevel(blame.authorTime, min, max)
      groups[level].push({
        range: new vscode.Range(lineIndex, 0, lineIndex, 0),
      })
    }

    blameCache.set(editor.document.uri.toString(), byLine)

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

    for (let level = 0; level < HEAT_LEVELS; level += 1) {
      this.types.push(
        vscode.window.createTextEditorDecorationType({
          isWholeLine: true,
          borderWidth: `0 0 0 ${BAR_PX}px`,
          borderStyle: 'solid',
          borderColor: heatBorder(level, dark),
        }),
      )
    }
  }
}

/** 悬停行首时显示 Git（可与语言提示叠在一起） */
export function registerBlameHover(isEnabledUri: (uri: string) => boolean): vscode.Disposable {
  return vscode.languages.registerHoverProvider({ scheme: 'file' }, {
    provideHover(doc, position) {
      if (!isEnabledUri(doc.uri.toString())) {
        return undefined
      }
      if (position.character !== 0) {
        return undefined
      }
      const blame = blameCache.get(doc.uri.toString())?.get(position.line)
      if (!blame) {
        return undefined
      }
      return new vscode.Hover(
        hoverMarkdown(blame),
        new vscode.Range(position.line, 0, position.line, 0),
      )
    },
  })
}

function hoverMarkdown(blame: BlameLine): vscode.MarkdownString {
  const time = blame.authorTime ? new Date(blame.authorTime).toLocaleString() : ''
  const head = [`**${blame.author}**`, time, `\`${blame.commit.slice(0, 8)}\``]
    .filter(Boolean)
    .join(' · ')
  const summary = blame.summary.trim()
  return new vscode.MarkdownString(summary ? `${head}  \n${summary}` : head)
}
