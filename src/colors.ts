/** 按文件内相对新旧映射到热力档位：0 = 最新（最深），levels-1 = 最旧（最浅） */
export function computeHeatLevel(
  authorTime: number,
  minTime: number,
  maxTime: number,
  levels: number,
): number {
  if (levels <= 1 || maxTime <= minTime) {
    return 0
  }
  const ratio = (maxTime - authorTime) / (maxTime - minTime)
  const level = Math.round(ratio * (levels - 1))
  return Math.min(levels - 1, Math.max(0, level))
}

export interface HeatColors {
  background: string
  foreground: string
}

/** 蓝系热力：越新 alpha 越高 */
export function heatColors(level: number, levels: number, darkTheme: boolean): HeatColors {
  const t = levels <= 1 ? 0 : level / (levels - 1)
  // t=0 最新，t=1 最旧
  const alpha = darkTheme
    ? 0.55 - t * 0.42
    : 0.48 - t * 0.38

  const bg = darkTheme
    ? `rgba(96, 165, 250, ${alpha.toFixed(3)})`
    : `rgba(37, 99, 235, ${alpha.toFixed(3)})`

  const foreground = darkTheme
    ? t < 0.5
      ? 'rgba(219, 234, 254, 0.95)'
      : 'rgba(191, 219, 254, 0.75)'
    : t < 0.5
      ? 'rgba(30, 58, 138, 0.95)'
      : 'rgba(30, 64, 175, 0.7)'

  return { background: bg, foreground }
}
