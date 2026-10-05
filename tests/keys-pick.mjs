// 내 번호 추천 화면 키보드 조작 점검 (WEB_SPEC 7.3 · 8.7)
// Tab/화살표/Enter/Space만으로: 범위 기준·범위 폭·슬라이더 → 조건 설정 → 생성 → 복사 → 내 번호 분석 이동
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
const range = async () => (await page.$eval('input[aria-label="합계 최소"]', (e) => e.value)) + '~' + (await page.$eval('input[aria-label="합계 최대"]', (e) => e.value))
const pressed = (group) => page.$$eval(`[aria-label="${group}"] button`, (bs) => bs.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent.trim().replace(/\s+/g, ' ')).join('|'))
const widthsShown = () => page.locator('[aria-label="범위 폭"]').count()
const log = []

log.push(`initial: 기준=${await pressed('범위 기준')} 폭=${await pressed('범위 폭')} 범위=${await range()}`)
// 추천 방식 select에서 시작해 Tab 순서 기록
await page.focus('#pick-mode')
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('Tab')
  log.push(`tab${i + 1}: ` + (await active()))
}
// 범위 기준: Tab으로 도달한 버튼을 Enter/Space로 선택
await page.focus('#pick-mode')
await page.keyboard.press('Tab') // 최근 30회
await page.keyboard.press('Tab') // 전체 평균
await page.keyboard.press('Enter')
log.push(`기준 "전체 평균" Enter → 기준=${await pressed('범위 기준')} 폭=${await pressed('범위 폭')} 범위=${await range()}`)
await page.keyboard.press('Tab') // 직접 입력
await page.keyboard.press('Tab') // 좁게
await page.keyboard.press('Space')
log.push(`폭 "좁게" Space → 폭=${await pressed('범위 폭')} 범위=${await range()}`)
await page.keyboard.press('Tab') // 보통
await page.keyboard.press('Tab') // 넓게
await page.keyboard.press('Enter')
log.push(`폭 "넓게" Enter → 폭=${await pressed('범위 폭')} 범위=${await range()}`)
// 최근 30회로 되돌리기 (Shift+Tab으로 거슬러 올라감)
for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+Tab')
log.push('Shift+Tab x5 → ' + (await active()))
await page.keyboard.press('Space')
log.push(`기준 "최근 30회" Space → 기준=${await pressed('범위 기준')} 폭=${await pressed('범위 폭')} 범위=${await range()}`)
// 슬라이더 화살표 → 범위 기준이 "직접 입력"으로, 범위 폭 묶음은 숨김
await page.focus('input[aria-label="합계 최소 슬라이더"]')
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowRight')
log.push(`슬라이더 ArrowRight x2 → 기준=${await pressed('범위 기준')} 범위=${await range()} 범위 폭 묶음=${(await widthsShown()) ? '보임' : '숨김'}`)
await page.focus('input[aria-label="합계 최대 슬라이더"]')
await page.keyboard.press('ArrowLeft')
log.push(`최대 슬라이더 ArrowLeft → 범위=${await range()}`)
log.push('슬라이더 설명: ' + (await page.$eval('.dual-wrap', (e) => document.getElementById(e.getAttribute('aria-describedby')).textContent.trim().replace(/\s+/g, ' '))))
// 직접 입력 상태에서 기준 버튼으로 복귀
await page.focus('[aria-label="범위 기준"] button:nth-child(1)')
await page.keyboard.press('Enter')
log.push(`기준 "최근 30회" Enter → 범위=${await range()} 범위 폭 묶음=${(await widthsShown()) ? '보임' : '숨김'}`)
// 입력란을 고치면 직접 입력으로
await page.fill('input[aria-label="합계 최소"]', '120')
log.push(`최소 입력 120 → 기준=${await pressed('범위 기준')} 범위=${await range()}`)
// 초기화 → 최근 30회 · 보통
await page.focus('button:has-text("초기화")')
await page.keyboard.press('Enter')
log.push(`초기화 Enter → 기준=${await pressed('범위 기준')} 폭=${await pressed('범위 폭')} 범위=${await range()}`)
// 모순 입력 → 안내
await page.fill('input[placeholder="예: 7, 23"]', '7, 23')
await page.fill('input[placeholder="예: 1, 45"]', '7')
log.push('conflict alert: ' + (await page.locator('.problems').first().innerText()).slice(0, 40) + ' | 버튼 disabled=' + (await page.getByRole('button', { name: '번호 만들기' }).isDisabled()))
await page.fill('input[placeholder="예: 1, 45"]', '1, 45')
// 번호 만들기 Enter
await page.focus('button:has-text("번호 만들기")')
await page.keyboard.press('Enter')
await page.waitForSelector('.result')
const sumsOut = (await page.locator('.result .tag').allInnerTexts()).filter((t) => t.startsWith('합계'))
log.push(`generate Enter → 결과 ${await page.locator('.result').count()}개 (${sumsOut.join(', ')}) | 요약: ${await page.locator('h2:has-text("추천 결과") + span').innerText()} | 포커스: ${await active()}`)
// 복사 Enter → 클립보드
await page.focus('.result >> nth=0 >> button:has-text("복사")')
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
log.push('copy Enter → clipboard "' + (await page.evaluate(() => navigator.clipboard.readText())) + '"')
// 내 번호 분석 › Enter → /mine?nums=
await page.focus('.result >> nth=0 >> a:has-text("내 번호 분석")')
await page.keyboard.press('Enter')
await page.waitForURL(/#\/mine\?nums=/)
await page.waitForSelector('text=당첨 회차')
log.push('mine link Enter → ' + page.url().split('#')[1])
console.log(log.join('\n'))
await browser.close()
await server.close()
