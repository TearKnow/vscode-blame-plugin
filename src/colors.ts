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

/** 实心色（不用 rgba，避免 before 背景画不出来 / 叠色） */
const DARK = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
const LIGHT = ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']

export function heatBorder(level: number, dark: boolean): string {
  const palette = dark ? DARK : LIGHT
  return palette[Math.min(level, palette.length - 1)]
}
