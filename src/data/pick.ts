/**
 * 내 번호 추천 (docs/WEB_SPEC.md 7.3)
 * 조건에 맞는 조합을 무작위로 골라 준다. 어떤 조건이든 모든 조합의 1등 당첨 확률은 1/8,145,060으로 같다.
 * 순수 함수 + 주입 가능한 난수원(테스트용). 화면에서는 crypto.getRandomValues를 쓴다.
 */
import { checkMine, consecutivePairs, countFor, lowCount, oddCount, sortByGap, type Period, type Rank } from './calc'
import type { Draw, LottoData, NumberStatus } from './types'

export type PickMode = 'random' | 'sum' | 'freq' | 'gap'
export type OddEven = 'any' | '33' | '24'
export type Basis = 'hot' | 'cold'

export interface PickConfig {
  mode: PickMode
  sumMin: number
  sumMax: number
  freqPeriod: Period
  freqBasis: Basis
  freqPool: number // 후보 번호 수 10~30
  gapMin: number // 최소 공백 N회 이상
  gapCount: 1 | 2 | 3 // 포함 개수
  include: number[] // 꼭 넣을 번호 (최대 5개)
  exclude: number[] // 뺄 번호
  oddEven: OddEven
  sets: 1 | 3 | 5
}

export const SUM_MIN = 21
export const SUM_MAX = 255
export const MAX_ATTEMPTS = 10000
export const TOTAL_COMBOS = 8145060

export const DEFAULT_CONFIG: PickConfig = {
  mode: 'sum',
  sumMin: 108,
  sumMax: 168,
  freqPeriod: 'all',
  freqBasis: 'hot',
  freqPool: 15,
  gapMin: 10,
  gapCount: 1,
  include: [],
  exclude: [],
  oddEven: 'any',
  sets: 3,
}

export const MODE_LABEL: Record<PickMode, string> = {
  random: '무작위 선택',
  sum: '합계 기반 추천',
  freq: '빈도 기반 추천',
  gap: '미출현 기반 추천',
}
export const PERIOD_LABEL: Record<string, string> = { all: '전체', 20: '최근 20회', 10: '최근 10회', 5: '최근 5회' }

// ── 난수 ────────────────────────────────────────────────
export type Rng = () => number // [0, 1)
export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 4294967296
}
const randInt = (rng: Rng, n: number) => Math.floor(rng() * n)
/** pool에서 k개 비복원 추출 (부분 Fisher–Yates) */
export function sample(pool: number[], k: number, rng: Rng): number[] {
  const a = [...pool]
  for (let i = 0; i < k && i < a.length; i++) {
    const j = i + randInt(rng, a.length - i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, k)
}

// ── 입력 해석 ───────────────────────────────────────────
/** "7, 23 · 45" → { nums: [7, 23, 45], bad: [] }. 범위 밖·숫자 아님은 bad에 담는다 */
export function parseNumberList(text: string): { nums: number[]; bad: string[] } {
  const nums: number[] = []
  const bad: string[] = []
  for (const tok of text.split(/[\s,·;]+/).filter(Boolean)) {
    const n = Number(tok)
    if (!/^\d+$/.test(tok) || n < 1 || n > 45) bad.push(tok)
    else if (!nums.includes(n)) nums.push(n)
  }
  return { nums: nums.sort((a, b) => a - b), bad }
}

// ── 후보 번호 ───────────────────────────────────────────
const ALL = Array.from({ length: 45 }, (_, i) => i + 1)

/** 빈도 기반 후보: 해당 기간 출현 횟수 상위(또는 하위) N개, 동률은 번호 오름차순 — 번호별 빈도 화면의 정렬과 같다 */
export function freqPool(status: NumberStatus[], period: Period, basis: Basis, n: number): number[] {
  const sorted = [...status].sort((a, b) => {
    const d = countFor(a, period) - countFor(b, period)
    return (basis === 'hot' ? -d : d) || a.number - b.number
  })
  return sorted.slice(0, n).map((s) => s.number)
}
/** 미출현 기반 후보: 현재 공백이 gapMin회 이상인 번호 (공백 긴 순) — 미출현 분석 화면의 정렬과 같다 */
export function gapPool(status: NumberStatus[], gapMin: number): number[] {
  return sortByGap(status)
    .filter((s) => s.gap_now >= gapMin)
    .map((s) => s.number)
}

// ── 검증 (버튼 누르기 전 안내) ──────────────────────────
function oddEvenOk(nums: number[], oe: OddEven): boolean {
  const o = oddCount(nums)
  return oe === 'any' ? true : oe === '33' ? o === 3 : o >= 2 && o <= 4
}
function includeOddEvenPossible(include: number[], oe: OddEven): boolean {
  const o = oddCount(include)
  const e = include.length - o
  if (oe === '33') return o <= 3 && e <= 3
  if (oe === '24') return o <= 4 && e <= 4
  return true
}

export function validateConfig(cfg: PickConfig, data: LottoData): string[] {
  const msgs: string[] = []
  const inc = cfg.include
  const exc = new Set(cfg.exclude)
  if (inc.length > 5) msgs.push('꼭 넣을 번호는 최대 5개입니다.')
  const overlap = inc.filter((n) => exc.has(n))
  if (overlap.length) msgs.push(`넣을 번호와 뺄 번호가 겹칩니다: ${overlap.join(', ')}`)
  if (cfg.exclude.length > 39) msgs.push('뺄 번호가 너무 많습니다 (최대 39개).')
  if (!includeOddEvenPossible(inc, cfg.oddEven)) {
    msgs.push(`넣을 번호의 홀짝 구성(홀 ${oddCount(inc)} : 짝 ${inc.length - oddCount(inc)})이 홀짝 비율 조건과 맞지 않습니다.`)
  }
  const rest = ALL.filter((n) => !exc.has(n) && !inc.includes(n))
  const need = 6 - inc.length
  if (inc.length <= 6 && rest.length < need) msgs.push('뺄 번호를 제외하면 남는 번호가 6개보다 적습니다.')

  if (cfg.mode === 'sum') {
    if (!Number.isInteger(cfg.sumMin) || !Number.isInteger(cfg.sumMax) || cfg.sumMin < SUM_MIN || cfg.sumMax > SUM_MAX) {
      msgs.push(`합계 범위는 ${SUM_MIN}~${SUM_MAX} 사이의 정수로 입력하세요.`)
    } else if (cfg.sumMin > cfg.sumMax) {
      msgs.push('합계 최소가 최대보다 큽니다.')
    } else if (inc.length <= 6 && rest.length >= need) {
      const base = inc.reduce((a, b) => a + b, 0)
      const lo = base + rest.slice(0, need).reduce((a, b) => a + b, 0)
      const hi = base + rest.slice(rest.length - need).reduce((a, b) => a + b, 0)
      if (lo > cfg.sumMax) msgs.push(`넣을 번호를 포함하면 합계가 최소 ${lo}이라 최대 ${cfg.sumMax}를 넘습니다.`)
      else if (hi < cfg.sumMin) msgs.push(`넣을 번호를 포함해도 합계가 최대 ${hi}이라 최소 ${cfg.sumMin}에 못 미칩니다.`)
    }
  }
  if (cfg.mode === 'freq') {
    if (cfg.freqPool < 10 || cfg.freqPool > 30) msgs.push('후보 번호 수는 10~30개 사이여야 합니다.')
    const pool = freqPool(data.status, cfg.freqPeriod, cfg.freqBasis, cfg.freqPool).filter((n) => !exc.has(n) && !inc.includes(n))
    if (pool.length < need) msgs.push(`후보 번호가 ${pool.length}개뿐입니다. 후보 수를 늘리거나 뺄 번호를 줄여 주세요.`)
  }
  if (cfg.mode === 'gap') {
    if (!Number.isInteger(cfg.gapMin) || cfg.gapMin < 1) msgs.push('최소 공백은 1 이상의 정수로 입력하세요.')
    const gp = gapPool(data.status, cfg.gapMin).filter((n) => !exc.has(n))
    const incInGap = inc.filter((n) => gp.includes(n)).length
    if (gp.length < cfg.gapCount) msgs.push(`공백 ${cfg.gapMin}회 이상인 번호가 ${gp.length}개뿐입니다. 최소 공백을 줄여 주세요.`)
    if (incInGap > cfg.gapCount) msgs.push(`넣을 번호 중 공백 ${cfg.gapMin}회 이상인 번호가 ${incInGap}개라 포함 개수(${cfg.gapCount}개)를 넘습니다.`)
    const others = ALL.filter((n) => !exc.has(n) && !gp.includes(n) && !inc.includes(n))
    const incOther = inc.length - incInGap
    if (others.length < 6 - cfg.gapCount - incOther) msgs.push('공백 조건 밖에서 채울 번호가 부족합니다. 뺄 번호를 줄여 주세요.')
  }
  return msgs
}

// ── 생성 ────────────────────────────────────────────────
/** 조건에 맞는 조합 하나. 만들지 못하면 null (최대 attempts회 시도) */
export function generateOne(cfg: PickConfig, data: LottoData, rng: Rng = cryptoRng, taken: Set<string> = new Set(), attempts = MAX_ATTEMPTS): number[] | null {
  const inc = cfg.include
  const exc = new Set(cfg.exclude)
  const need = 6 - inc.length
  let pool: number[]
  let gapPart: { pool: number[]; k: number; others: number[] } | null = null
  if (cfg.mode === 'freq') {
    pool = freqPool(data.status, cfg.freqPeriod, cfg.freqBasis, cfg.freqPool).filter((n) => !exc.has(n) && !inc.includes(n))
  } else if (cfg.mode === 'gap') {
    const gp = gapPool(data.status, cfg.gapMin).filter((n) => !exc.has(n))
    const incInGap = inc.filter((n) => gp.includes(n)).length
    gapPart = {
      pool: gp.filter((n) => !inc.includes(n)),
      k: cfg.gapCount - incInGap,
      others: ALL.filter((n) => !exc.has(n) && !gp.includes(n) && !inc.includes(n)),
    }
    pool = []
  } else {
    pool = ALL.filter((n) => !exc.has(n) && !inc.includes(n))
  }
  for (let t = 0; t < attempts; t++) {
    let picked: number[]
    if (gapPart) {
      if (gapPart.k < 0) return null
      picked = [...inc, ...sample(gapPart.pool, gapPart.k, rng), ...sample(gapPart.others, need - gapPart.k, rng)]
    } else {
      if (pool.length < need) return null
      picked = [...inc, ...sample(pool, need, rng)]
    }
    if (picked.length !== 6) return null
    picked.sort((a, b) => a - b)
    const s = picked.reduce((a, b) => a + b, 0)
    if (cfg.mode === 'sum' && (s < cfg.sumMin || s > cfg.sumMax)) continue
    if (!oddEvenOk(picked, cfg.oddEven)) continue
    const key = picked.join(',')
    if (taken.has(key)) continue
    return picked
  }
  return null
}

export const GENERATE_FAIL = '조건을 만족하는 조합을 찾지 못했습니다. 범위를 넓혀 주세요.'

export function generateSets(cfg: PickConfig, data: LottoData, rng: Rng = cryptoRng): { sets: number[][]; error?: string } {
  const taken = new Set<string>()
  const sets: number[][] = []
  for (let i = 0; i < cfg.sets; i++) {
    const one = generateOne(cfg, data, rng, taken)
    if (!one) return { sets, error: GENERATE_FAIL }
    taken.add(one.join(','))
    sets.push(one)
  }
  return { sets }
}

// ── 결과 설명 ───────────────────────────────────────────
export interface SetInfo {
  nums: number[]
  sum: number
  odd: number
  even: number
  low: number
  high: number
  consecutive: [number, number][]
  counts: Record<Rank, number>
  firstMatch: number | null // 과거 1등 조합과 같으면 그 회차
}
export function describeSet(nums: number[], draws: Draw[]): SetInfo {
  const sorted = [...nums].sort((a, b) => a - b)
  const key = sorted.join(',')
  const hit = draws.find((d) => d.nums.join(',') === key)
  return {
    nums: sorted,
    sum: sorted.reduce((a, b) => a + b, 0),
    odd: oddCount(sorted),
    even: 6 - oddCount(sorted),
    low: lowCount(sorted),
    high: 6 - lowCount(sorted),
    consecutive: consecutivePairs(sorted),
    counts: checkMine(draws, sorted).counts,
    firstMatch: hit ? hit.draw_no : null,
  }
}
export function recordText(counts: Record<Rank, number>): string {
  const parts = ([1, 2, 3, 4, 5] as Rank[]).filter((r) => counts[r] > 0).map((r) => `${r}등 ${counts[r]}회`)
  return parts.length ? parts.join(' · ') : '당첨 없음'
}
