/** 热力档位数 */
export const HEAT_LEVELS = 6

/** 0 = 最新（最深），levels-1 = 最旧（最浅） */
export function heatLevel(time: number, min: number, max: number): number {
  if (max <= min) {
    return 0
  }
  const level = Math.round(((max - time) / (max - min)) * (HEAT_LEVELS - 1))
  return Math.min(HEAT_LEVELS - 1, Math.max(0, level))
}

/** 行首色条颜色 */
export function heatBorder(level: number, dark: boolean): string {
  const t = level / (HEAT_LEVELS - 1)
  const a = (0.95 - t * 0.55).toFixed(3)
  return dark ? `rgba(96, 165, 250, ${a})` : `rgba(37, 99, 235, ${a})`
}
