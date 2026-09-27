// 내 번호 추천 화면 키보드 조작 점검: Tab/화살표/Enter/Space만으로 조건 설정 → 생성 → 복사 → 내 번호 분석 이동
import { preview } from 'vite'
import { chromium } from 'playwright'

const server = await preview({ preview: { port: 4183, strictPort: true }, logLevel: 'silent' })
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
const page = await ctx.newPage()
await page.goto('http://localhost:4183/k-lotto/#/pick', { waitUntil: 'networkidle' })
await page.waitForSelector('main h1')

const active = () =>
  page.evaluate(() => {
    const e = document.activeElement
    const label = e.getAttribute('aria-label') || e.textContent?.trim() || e.getAttribute('placeholder') || ''
    return `${e.tagName}${e.id ? '#' + e.id : ''}${e.className ? '.' + String(e.className).split(' ')[0] : ''} "${label.slice(0, 22)}" outline=${getComputedStyle(e).outlineStyle}`
  })
const log = []
// 1) 본문 첫 요소부터 Tab으로 이동하며 도달하는 요소 기록
await page.focus('#pick-mode')
log.push('start: ' + (await active()))
// 추천 방식: 키보드로 "미출현 기반" → 다시 "합계 기반" 선택
await page.keyboard.press('ArrowDown')
await page.keyboard.press('ArrowDown')
await page.keyboard.press('ArrowDown')
log.push('select ArrowDown x3 → ' + (await page.$eval('#pick-mode', (e) => e.value)))
await page.keyboard.press('ArrowUp')
await page.keyboard.press('ArrowUp')
log.push('select ArrowUp x2 → ' + (await page.$eval('#pick-mode', (e) => e.value)))
// 이후 Tab 순서
for (let i = 0; i < 16; i++) {
  await page.keyboard.press('Tab')
  log.push(`tab${i + 1}: ` + (await active()))
}
// 슬라이더: 최소 슬라이더에 포커스 후 화살표
await page.focus('input[aria-label="합계 최소 슬라이더"]')
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowRight')
log.push('slider ArrowRight x2 → sumMin=' + (await page.$eval('input[aria-label="합계 최소"]', (e) => e.value)))
// 빠른 선택 ±2σ를 Enter로
await page.focus('.pill:nth-child(2)')
await page.keyboard.press('Enter')
log.push('pill ±2σ Enter → ' + (await page.$eval('input[aria-label="합계 최소"]', (e) => e.value)) + '~' + (await page.$eval('input[aria-label="합계 최대"]', (e) => e.value)))
// 모순 입력 → 안내
await page.fill('input[placeholder="예: 7, 23"]', '7, 23')
await page.fill('input[placeholder="예: 1, 45"]', '7')
log.push('conflict alert: ' + (await page.locator('.problems').first().innerText()).slice(0, 40) + ' | 버튼 disabled=' + (await page.getByRole('button', { name: '번호 만들기' }).isDisabled()))
await page.fill('input[placeholder="예: 1, 45"]', '1, 45')
// 세트 수 5세트를 Space로
await page.focus('[aria-label="만들 세트 수"] button:nth-child(3)')
await page.keyboard.press('Space')
log.push('sets Space → 5세트 pressed=' + (await page.$eval('[aria-label="만들 세트 수"] button:nth-child(3)', (e) => e.getAttribute('aria-pressed'))))
// 번호 만들기 Enter
await page.focus('button:has-text("번호 만들기")')
await page.keyboard.press('Enter')
await page.waitForSelector('.result')
log.push('generate Enter → 결과 카드 ' + (await page.locator('.result').count()) + '개, 포커스: ' + (await active()))
// 복사 Enter → 클립보드
await page.focus('.result >> nth=0 >> button:has-text("복사")')
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
const clip = await page.evaluate(() => navigator.clipboard.readText())
log.push('copy Enter → clipboard "' + clip + '" | 버튼 텍스트: ' + (await page.locator('.result >> nth=0 >> button').first().innerText()))
// 내 번호 분석 › Enter → /mine?nums=
await page.focus('.result >> nth=0 >> a:has-text("내 번호 분석")')
await page.keyboard.press('Enter')
await page.waitForURL(/#\/mine\?nums=/)
await page.waitForSelector('text=당첨 회차')
log.push('mine link Enter → ' + page.url().split('#')[1] + ' | 선택 번호: ' + (await page.locator('.chosen .ball').allInnerTexts()).join(','))
// 잘못된 nums
await page.goto('http://localhost:4183/k-lotto/#/mine?nums=1,2,3', { waitUntil: 'networkidle' })
await page.waitForSelector('main h1')
log.push('mine bad nums → ' + (await page.locator('.form-error').innerText()).slice(0, 30))
// 너무 좁은 조건 → 실패 안내
await page.goto('http://localhost:4183/k-lotto/#/pick', { waitUntil: 'networkidle' })
await page.waitForSelector('main h1')
await page.focus('.pill:nth-child(3)')
await page.keyboard.press('Enter')
await page.fill('input[aria-label="합계 최소"]', '21')
await page.fill('input[aria-label="합계 최대"]', '21')
await page.getByRole('button', { name: '번호 만들기' }).click()
await page.waitForSelector('p.problems')
log.push('narrow range → ' + (await page.locator('p.problems').innerText()))
console.log(log.join('\n'))
await browser.close()
await server.close()
