// 키보드 접근성 점검: Tab으로 이동한 요소의 순서와 포커스 표시(outline) 여부를 출력한다.
import { preview } from 'vite'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'silent' })
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4175/k-lotto/#/', { waitUntil: 'networkidle' })
await page.waitForSelector('main h1')
const seen = []
for (let i = 0; i < 14; i++) {
  await page.keyboard.press('Tab')
  seen.push(await page.evaluate(() => {
    const e = document.activeElement
    const cs = getComputedStyle(e)
    return `${e.tagName}${e.className ? '.' + String(e.className).split(' ')[0] : ''} "${(e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || '').trim().slice(0, 18)}" outline=${cs.outlineStyle}/${cs.outlineWidth}`
  }))
}
console.log(seen.join('\n'))
// 세그먼트 버튼을 키보드로 조작
await page.focus('.seg button:nth-child(4)')
await page.keyboard.press('Enter')
console.log('seg 전체 pressed:', await page.getAttribute('.seg button:nth-child(4)', 'aria-pressed'))
await page.screenshot({ path: fileURLToPath(new URL('./shots/focus-1440.png', import.meta.url)), clip: { x: 0, y: 0, width: 1440, height: 130 } })
await browser.close(); await server.close()
