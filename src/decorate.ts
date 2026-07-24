import * as vscode from 'vscode'
import type { BlameLine } from './blame'
import { HEAT_LEVELS, heatBorder, heatLevel } from './colors'

/** 左边框色条：编辑时不跟光标，也不会一改就闪躲 */
const BAR_PX = 9

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

const HOVER_CHARS = 3

export function registerBlameHover(isEnabledUri: (uri: string) => boolean): vscode.Disposable {
  return vscode.languages.registerHoverProvider({ scheme: 'file' }, {
    provideHover(doc, position) {
      if (!isEnabledUri(doc.uri.toString())) {
        return undefined
      }
      const lineLen = doc.lineAt(position.line).text.length
      const end = Math.min(HOVER_CHARS, Math.max(lineLen, 1))
      if (position.character >= end) {
        return undefined
      }
      const blame = blameCache.get(doc.uri.toString())?.get(position.line)
      if (!blame) {
        return undefined
      }
      return new vscode.Hover(
        hoverMarkdown(blame),
        new vscode.Range(position.line, 0, position.line, end),
      )
    },
  })
}

function hoverMarkdown(blame: BlameLine): vscode.MarkdownString {
  const time = blame.authorTime ? formatDateTime(blame.authorTime) : ''
  const head = [`**${blame.author}**`, time, `\`${blame.commit.slice(0, 8)}\``]
    .filter(Boolean)
    .join(' · ')
  const summary = blame.summary.trim()
  return new vscode.MarkdownString(summary ? `${head}  \n${summary}` : head)
}

/** Y-m-d H:i:s，如 2026-07-24 14:24:28 */
function formatDateTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
