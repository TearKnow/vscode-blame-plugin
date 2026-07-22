import * as vscode from 'vscode'
import type { BlameLine } from './blame'
import { computeHeatLevel, heatColors } from './colors'

const WEEKDAYS_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export class BlameDecorator {
  private readonly decorationTypes = new Map<number, vscode.TextEditorDecorationType>()
  private active = false
  private disposing = false

  isActive(): boolean {
    return this.active
  }

  clear(): void {
    for (const type of this.decorationTypes.values()) {
      type.dispose()
    }
    this.decorationTypes.clear()
    this.active = false
  }

  dispose(): void {
    this.disposing = true
    this.clear()
  }

  async apply(editor: vscode.TextEditor, blameLines: BlameLine[]): Promise<void> {
    if (this.disposing) {
      return
    }

    this.clear()

    const config = vscode.workspace.getConfiguration('gitBlameAnnotate')
    const locale = config.get<string>('dateLocale', 'zh-CN')
    const maxAuthorLength = config.get<number>('maxAuthorLength', 16)
    const heatLevels = Math.max(3, Math.min(16, config.get<number>('heatLevels', 8)))
    const darkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
      || vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast

    const times = blameLines.map((b) => b.authorTime).filter((t) => t > 0)
    const minTime = times.length ? Math.min(...times) : 0
    const maxTime = times.length ? Math.max(...times) : 0

    // 按热力档位分组 ranges
    const groups = new Map<number, vscode.DecorationOptions[]>()
    const labelWidth = estimateLabelWidth(blameLines, locale, maxAuthorLength)

    for (const blame of blameLines) {
      const lineIndex = blame.line - 1
      if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
        continue
      }

      const level = computeHeatLevel(blame.authorTime, minTime, maxTime, heatLevels)
      const colors = heatColors(level, heatLevels, darkTheme)
      const label = formatLabel(blame, locale, maxAuthorLength).padEnd(labelWidth, ' ')
      const range = new vscode.Range(lineIndex, 0, lineIndex, 0)

      const hoverLines = [
        `**${blame.author}**`,
        formatHoverDate(blame.authorTime, locale),
        `\`${blame.commit.slice(0, 8)}\``,
      ]
      if (blame.summary.trim()) {
        hoverLines.push(blame.summary.trim())
      }

      const options: vscode.DecorationOptions = {
        range,
        renderOptions: {
          before: {
            contentText: ` ${label} `,
            color: colors.foreground,
            backgroundColor: colors.background,
            margin: '0 8px 0 0',
            width: `${labelWidth + 2}ch`,
          },
        },
        hoverMessage: new vscode.MarkdownString(hoverLines.join('  \n')),
      }

      const list = groups.get(level) ?? []
      list.push(options)
      groups.set(level, list)
    }

    for (const [level, options] of groups) {
      const colors = heatColors(level, heatLevels, darkTheme)
      const type = vscode.window.createTextEditorDecorationType({
        before: {
          color: colors.foreground,
          backgroundColor: colors.background,
        },
      })
      this.decorationTypes.set(level, type)
      editor.setDecorations(type, options)
    }

    this.active = true
  }
}

function formatLabel(blame: BlameLine, locale: string, maxAuthorLength: number): string {
  const datePart = formatDatePart(blame.authorTime, locale)
  const author = truncate(blame.author || 'unknown', maxAuthorLength)
  return `${datePart}  ${author}`
}

function formatDatePart(authorTime: number, locale: string): string {
  if (!authorTime) {
    return '????/??/??'
  }
  const d = new Date(authorTime)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const weekday = locale.startsWith('zh')
    ? WEEKDAYS_ZH[d.getDay()]
    : d.toLocaleDateString(locale, { weekday: 'short' })
  return `${y}/${m}/${day} ${weekday}`
}

function formatHoverDate(authorTime: number, locale: string): string {
  if (!authorTime) {
    return ''
  }
  return new Date(authorTime).toLocaleString(locale)
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  return `${text.slice(0, Math.max(1, max - 1))}…`
}

function estimateLabelWidth(
  blameLines: BlameLine[],
  locale: string,
  maxAuthorLength: number,
): number {
  let max = 0
  for (const blame of blameLines) {
    max = Math.max(max, formatLabel(blame, locale, maxAuthorLength).length)
  }
  return Math.max(max, 20)
}
