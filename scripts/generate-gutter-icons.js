const fs = require('fs')
const path = require('path')

function paint(level, levels, dark) {
  const t = levels <= 1 ? 0 : level / (levels - 1)
  const opacity = Math.max(0.25, Math.min(1, dark ? 0.95 - t * 0.55 : 0.95 - t * 0.6))
  return { hex: dark ? '#60a5fa' : '#2563eb', opacity }
}

for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light'
  const dir = path.join(__dirname, '..', 'media', 'gutter', theme)
  fs.mkdirSync(dir, { recursive: true })
  for (let level = 0; level < 16; level += 1) {
    const p = paint(level, 16, dark)
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22">` +
      `<rect x="2" y="1" width="12" height="20" rx="2" fill="${p.hex}" fill-opacity="${p.opacity.toFixed(3)}"/>` +
      `</svg>\n`
    fs.writeFileSync(path.join(dir, `heat-${level}.svg`), svg)
  }
}

console.log('generated', fs.readdirSync(path.join(__dirname, '..', 'media', 'gutter', 'dark')).length)
