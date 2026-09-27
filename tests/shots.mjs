// 화면 확인용 스크린샷: 빌드 결과(dist)를 vite preview로 띄우고 7개 화면을 3개 폭(1440/1024/390)으로 저장한다.
// 실행: npm run build && node tests/shots.mjs   → tests/shots/*.png, 콘솔 오류는 stderr로 출력
import { preview } from 'vite'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PAGES = ['', 'sum', 'freq', 'gap', 'pattern', 'mine', 'draw']
const WIDTHS = [1440, 1024, 390]
const out = new URL('./shots/', import.meta.url)
mkdirSync(out, { recursive: true })

const server = await preview({ preview: { port: 4173, strictPort: true }, logLevel: 'silent' })
const base = 'http://localhost:4173/k-lotto/'
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' })
let problems = 0
try {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, locale: 'ko-KR' })
    const page = await ctx.newPage()
    page.on('console', (m) => {
      if (m.type() === 'error') {
        problems++
        console.error(`[console.error ${w}]`, m.text().slice(0, 300))
      }
    })
    page.on('pageerror', (e) => {
      problems++
      console.error(`[pageerror ${w}]`, e.message)
    })
    for (const p of PAGES) {
      await page.goto(`${base}#/${p}`, { waitUntil: 'networkidle' })
      await page.waitForSelector('main h1', { timeout: 60000 })
      if (p === 'mine') {
        await page.getByRole('button', { name: '무작위 선택' }).click()
        await page.getByRole('button', { name: '결과 보기' }).click()
        await page.waitForSelector('text=당첨 회차')
      }
      await page.waitForTimeout(400)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow > 0) {
        problems++
        console.error(`[overflow ${w}] /${p}: 가로 스크롤 ${overflow}px`)
      }
      const name = `${p || 'home'}-${w}.png`
      await page.screenshot({ path: fileURLToPath(new URL(name, out)), fullPage: true })
      console.log(`saved ${name}`)
    }
    await ctx.close()
  }
} finally {
  await browser.close()
  await server.close()
}
console.log(problems ? `문제 ${problems}건` : '문제 없음')
process.exit(problems ? 1 : 0)
