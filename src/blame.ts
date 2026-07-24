import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as path from 'node:path'

const execFileAsync = promisify(execFile)

export interface BlameLine {
  line: number
  commit: string
  author: string
  authorTime: number
  summary: string
}

export async function blameFile(filePath: string): Promise<BlameLine[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['blame', '--line-porcelain', '--', filePath],
    {
      cwd: path.dirname(filePath),
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  )
  return parsePorcelain(stdout)
}

function parsePorcelain(stdout: string): BlameLine[] {
  const rows = stdout.split(/\r?\n/)
  const result: BlameLine[] = []
  const meta = new Map<string, { author: string; authorTime: number; summary: string }>()

  let i = 0
  while (i < rows.length) {
    const match = /^([0-9a-f]{40})\s+\d+\s+(\d+)/.exec(rows[i] ?? '')
    if (!match) {
      i += 1
      continue
    }

    const commit = match[1]
    const line = Number(match[2])
    i += 1

    let author = meta.get(commit)?.author ?? 'unknown'
    let authorTime = meta.get(commit)?.authorTime ?? 0
    let summary = meta.get(commit)?.summary ?? ''

    while (i < rows.length && !rows[i].startsWith('\t')) {
      const row = rows[i]
      if (row.startsWith('author ')) {
        author = row.slice(7)
      } else if (row.startsWith('author-time ')) {
        authorTime = Number(row.slice(12)) * 1000
      } else if (row.startsWith('summary ')) {
        summary = row.slice(8)
      }
      i += 1
    }
    if (rows[i]?.startsWith('\t')) {
      i += 1
    }

    meta.set(commit, { author, authorTime, summary })
    result.push({ line, commit, author, authorTime, summary })
  }

  return result
}
