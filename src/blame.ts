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
  const cwd = path.dirname(filePath)
  const { stdout } = await execFileAsync(
    'git',
    ['blame', '--line-porcelain', '--', filePath],
    {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    },
  )
  return parsePorcelain(stdout)
}

function parsePorcelain(stdout: string): BlameLine[] {
  const rows = stdout.split(/\r?\n/)
  const result: BlameLine[] = []
  const commitMeta = new Map<string, { author: string; authorTime: number; summary: string }>()

  let i = 0
  while (i < rows.length) {
    const header = rows[i]
    if (!header) {
      i += 1
      continue
    }

    const match = /^([0-9a-f]{40})\s+(\d+)\s+(\d+)(?:\s+(\d+))?$/.exec(header)
    if (!match) {
      i += 1
      continue
    }

    const commit = match[1]
    const resultLine = Number(match[3])
    i += 1

    let author = commitMeta.get(commit)?.author ?? 'unknown'
    let authorTime = commitMeta.get(commit)?.authorTime ?? 0
    let summary = commitMeta.get(commit)?.summary ?? ''

    // 完整块会带 author / author-time / summary；同 commit 后续行通常只有 header + 内容
    while (i < rows.length) {
      const row = rows[i]
      if (row.startsWith('\t')) {
        break
      }
      if (row.startsWith('author ')) {
        author = row.slice('author '.length)
      } else if (row.startsWith('author-time ')) {
        authorTime = Number(row.slice('author-time '.length)) * 1000
      } else if (row.startsWith('summary ')) {
        summary = row.slice('summary '.length)
      }
      i += 1
    }

    commitMeta.set(commit, { author, authorTime, summary })

    if (i < rows.length && rows[i]?.startsWith('\t')) {
      i += 1
    }

    result.push({
      line: resultLine,
      commit,
      author,
      authorTime,
      summary,
    })
  }

  return result
}
