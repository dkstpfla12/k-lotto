/**
 * 파생 지표 계산 (순수 함수).
 * 원본 로직: collector/build_derived.py, app/streamlit_app.py — 결과가 같아야 한다 (tests/calc.test.ts로 검증).
 */
import type { Draw, DrawStats, NumberStatus, SumZone } from './types'

// ── 상수 ────────────────────────────────────────────────
export const SUM_MEAN = 138
/** 1~45에서 6개 비복원추출 시 합계의 이론 표준편차 ≈ 29.95 */
export const SUM_SD = Math.sqrt(((6 * (45 * 45 - 1)) / 12) * (39 / 44))
/** 표시용 정상 범위 (Streamlit·시안과 동일한 고정 라벨) */
export const BAND1 = { lo: 108, hi: 168 } as const
export const BAND2 = { lo: 78, hi: 198 } as const
export const ZONES: SumZone[] = ['1σ 이내', '1~2σ', '2σ 초과']

// ── 조합·분포 ───────────────────────────────────────────
export function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}
/** 초기하분포: N개 중 K개가 '해당'일 때, n개 추출에서 k개가 해당될 확률 */
export function hyper(k: number, K: number, n = 6, N = 45): number {
  return (comb(K, k) * comb(N - K, n - k)) / comb(N, n)
}
/** 연속번호가 1쌍 이상 나올 이론 확률 = 1 − C(40,6)/C(45,6) */
export const CONSEC_GE1_THEORY = 1 - comb(40, 6) / comb(45, 6)

export function sumZone(sum: number): SumZone {
  const z = Math.abs((sum - SUM_MEAN) / SUM_SD)
  return z <= 1 ? '1σ 이내' : z <= 2 ? '1~2σ' : '2σ 초과'
}
export function normalPdf(x: number, mean = SUM_MEAN, sd = SUM_SD): number {
  return Math.exp(-((x - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI))
}

// ── 회차 하나의 구성 ────────────────────────────────────
export function consecutivePairs(nums: number[]): [number, number][] {
  const s = [...nums].sort((a, b) => a - b)
  const out: [number, number][] = []
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] === 1) out.push([s[i - 1], s[i]])
  return out
}
export const oddCount = (nums: number[]) => nums.filter((n) => n % 2 === 1).length
export const lowCount = (nums: number[]) => nums.filter((n) => n <= 22).length

// ── 합계 ────────────────────────────────────────────────
export interface SumSummary {
  mean: number
  median: number
  sd: number // 모표준편차
  mode: { sum: number; count: number }
  max: { sum: number; draw_no: number }
  min: { sum: number; draw_no: number }
}
export function sumSummary(stats: DrawStats[]): SumSummary {
  const sums = stats.map((s) => s.sum)
  const n = sums.length
  const mean = sums.reduce((a, b) => a + b, 0) / n
  const sorted = [...sums].sort((a, b) => a - b)
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  const sd = Math.sqrt(sums.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  const counts = new Map<number, number>()
  for (const s of sums) counts.set(s, (counts.get(s) ?? 0) + 1)
  let mode = { sum: 0, count: 0 }
  for (const [sum, count] of counts) {
    if (count > mode.count || (count === mode.count && sum < mode.sum)) mode = { sum, count }
  }
  let max = stats[0]
  let min = stats[0]
  for (const s of stats) {
    if (s.sum > max.sum) max = s
    if (s.sum < min.sum) min = s
  }
  return {
    mean,
    median,
    sd,
    mode,
    max: { sum: max.sum, draw_no: max.draw_no },
    min: { sum: min.sum, draw_no: min.draw_no },
  }
}

export function zoneCounts(stats: DrawStats[]): Record<SumZone, number> {
  const out: Record<SumZone, number> = { '1σ 이내': 0, '1~2σ': 0, '2σ 초과': 0 }
  for (const s of stats) out[s.sum_zone]++
  return out
}
/** 정상 범위(1σ 이내) 비율 (0~1) */
export function inBandRatio(stats: DrawStats[]): number {
  return stats.length ? zoneCounts(stats)['1σ 이내'] / stats.length : 0
}

export interface HistBin {
  lo: number
  hi: number
  count: number
  theory: number
}
/** 합계 히스토그램 (start부터 width 간격, bins개) + 이론 정규분포 기대 회차 수 */
export function sumHistogram(stats: DrawStats[], start = 40, width = 10, bins = 20): HistBin[] {
  const n = stats.length
  const out: HistBin[] = Array.from({ length: bins }, (_, i) => ({
    lo: start + i * width,
    hi: start + (i + 1) * width - 1,
    count: 0,
    theory: 0,
  }))
  for (const s of stats) {
    const i = Math.floor((s.sum - start) / width)
    if (i >= 0 && i < bins) out[i].count++
  }
  for (const b of out) b.theory = n * width * normalPdf(b.lo + width / 2)
  return out
}

// ── 패턴 ────────────────────────────────────────────────
export interface DistRow {
  k: number
  actual: number // 비율 0~1
  theory: number | null
}
function dist(values: number[], ks: number[], theory: ((k: number) => number) | null): DistRow[] {
  const n = values.length
  return ks.map((k) => ({
    k,
    actual: n ? values.filter((v) => v === k).length / n : 0,
    theory: theory ? theory(k) : null,
  }))
}
export const oddDist = (stats: DrawStats[]) =>
  dist(stats.map((s) => s.odd_cnt), [0, 1, 2, 3, 4, 5, 6], (k) => hyper(k, 23))
export const lowDist = (stats: DrawStats[]) =>
  dist(stats.map((s) => s.low_cnt), [0, 1, 2, 3, 4, 5, 6], (k) => hyper(k, 22))
export const carryDist = (stats: DrawStats[]) =>
  dist(stats.map((s) => s.carryover_cnt).filter((v): v is number => v !== null), [0, 1, 2, 3], (k) => hyper(k, 6))
export const consecDist = (stats: DrawStats[]) => dist(stats.map((s) => s.consecutive_pairs), [0, 1, 2, 3, 4], null)
export const carryGe1Ratio = (stats: DrawStats[]) => {
  const v = stats.map((s) => s.carryover_cnt).filter((x): x is number => x !== null)
  return v.length ? v.filter((x) => x > 0).length / v.length : 0
}
export const consecGe1Ratio = (stats: DrawStats[]) =>
  stats.length ? stats.filter((s) => s.consecutive_pairs > 0).length / stats.length : 0

// ── 번호 빈도 · 히트맵 ──────────────────────────────────
export type Period = 'all' | 20 | 10 | 5
export function countFor(s: NumberStatus, p: Period): number {
  return p === 'all' ? s.total_count : p === 20 ? s.recent20_count : p === 10 ? s.recent10_count : s.recent5_count
}
export function windowSize(p: Period, total: number): number {
  return p === 'all' ? total : p
}
export const expectedCount = (draws: number) => (draws * 6) / 45

export interface FreqRow {
  number: number
  count: number
  deviation: number
  recent20: number
}
export function freqRows(status: NumberStatus[], p: Period, totalDraws: number): FreqRow[] {
  const exp = expectedCount(windowSize(p, totalDraws))
  return status.map((s) => ({
    number: s.number,
    count: countFor(s, p),
    deviation: countFor(s, p) - exp,
    recent20: s.recent20_count,
  }))
}
export const sortDesc = (rows: FreqRow[]) => [...rows].sort((a, b) => b.count - a.count || a.number - b.number)
export const sortAsc = (rows: FreqRow[]) => [...rows].sort((a, b) => a.count - b.count || a.number - b.number)

/** 히트맵 단계: 편차% ≤−8, −8~−4, −4~0, 0~4, 4~8, ≥8 → 0..5 */
export function heatLevel(devPct: number): number {
  if (devPct >= 8) return 5
  if (devPct >= 4) return 4
  if (devPct >= 0) return 3
  if (devPct > -4) return 2
  if (devPct > -8) return 1
  return 0
}

// ── 미출현 ──────────────────────────────────────────────
export const sortByGap = (status: NumberStatus[]) =>
  [...status].sort((a, b) => b.gap_now - a.gap_now || a.number - b.number)
export const sortByRecent20 = (status: NumberStatus[]) =>
  [...status].sort((a, b) => b.recent20_count - a.recent20_count || a.number - b.number)
export function gapSummary(status: NumberStatus[]) {
  const longest = sortByGap(status)[0]
  const ge10 = status.filter((s) => s.gap_now >= 10).length
  const avgGapMean = status.reduce((a, s) => a + s.avg_gap, 0) / status.length
  const maxGap = [...status].sort((a, b) => b.max_gap - a.max_gap || a.number - b.number)[0]
  return { longest, ge10, avgGapMean, maxGap }
}

// ── 내 번호 ─────────────────────────────────────────────
export type Rank = 1 | 2 | 3 | 4 | 5
export interface MineHit {
  draw: Draw
  rank: Rank
  matched: number[]
}
export function rankOf(draw: Draw, mine: Set<number>): Rank | null {
  const m = draw.nums.filter((n) => mine.has(n)).length
  if (m === 6) return 1
  if (m === 5) return mine.has(draw.bonus) ? 2 : 3
  if (m === 4) return 4
  if (m === 3) return 5
  return null
}
export function checkMine(draws: Draw[], mine: number[]): { counts: Record<Rank, number>; hits: MineHit[] } {
  const set = new Set(mine)
  const counts: Record<Rank, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const hits: MineHit[] = []
  for (const d of draws) {
    const r = rankOf(d, set)
    if (r) {
      counts[r]++
      hits.push({ draw: d, rank: r, matched: d.nums.filter((n) => set.has(n)) })
    }
  }
  return { counts, hits }
}
/** 한 회에 3개 이상 맞힐 이론 확률 (5등 이상) */
export const WIN_ANY_THEORY = [3, 4, 5, 6].reduce((a, k) => a + hyper(k, 6), 0)

// ── 최신 회차 요약 (홈·시세 띠) ─────────────────────────
export function latestSummary(draws: Draw[], stats: DrawStats[], status: NumberStatus[]) {
  const latest = draws[draws.length - 1]
  const prev = draws.length > 1 ? draws[draws.length - 2] : null
  const ls = stats[stats.length - 1]
  const hot = sortByRecent20(status)[0]
  const gap = sortByGap(status)[0]
  return {
    latest,
    prev,
    stats: ls,
    sumDiff: prev ? latest.sum - prev.sum : 0,
    salesChangePct: prev && prev.total_sales > 0 ? (latest.total_sales / prev.total_sales - 1) * 100 : null,
    firstTotal: latest.first_winners * latest.first_prize_each,
    consecutive: consecutivePairs(latest.nums),
    hot,
    gap,
    nextDrawNo: latest.draw_no + 1,
    nextDrawDate: addDays(latest.draw_date, 7),
  }
}

// ── 날짜·표시 도우미 ────────────────────────────────────
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${mm}-${dd}`
}
export function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}
/** 2026-09-26 → full 2026.09.26 · mmdd 09.26 · withDay 2026.09.26(토) · mmddDay 09.26(토) */
export function fmtDate(iso: string, style: 'full' | 'mmdd' | 'withDay' | 'mmddDay' = 'full'): string {
  const [y, m, d] = iso.split('-')
  if (style === 'mmdd') return `${m}.${d}`
  if (style === 'mmddDay') return `${m}.${d}(${weekday(iso)})`
  if (style === 'withDay') return `${y}.${m}.${d}(${weekday(iso)})`
  return `${y}.${m}.${d}`
}
export const fmtInt = (n: number) => Math.round(n).toLocaleString('ko-KR')
/** 원 → 억 (1,000억 이상은 정수, 그 외 소수 digits자리) */
export function fmtEok(won: number, digits = 1): string {
  const eok = won / 1e8
  return eok >= 1000 ? fmtInt(eok) + '억' : eok.toFixed(digits) + '억'
}
export const fmtPct = (ratio: number, digits = 1) => (ratio * 100).toFixed(digits) + '%'
export const fmtSigned = (n: number, digits = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(digits)

// ── 등수별 당첨금 (회차 조회 표) ────────────────────────
export interface PrizeRow {
  rank: Rank
  rule: string
  winners: number | null
  each: number | null
  total: number | null // 당첨자 수 × 1인당 당첨금
}
export function prizeRows(d: Draw): PrizeRow[] {
  const mk = (rank: Rank, rule: string, winners: number | null, each: number | null): PrizeRow => ({
    rank,
    rule,
    winners,
    each,
    total: winners !== null && each !== null ? winners * each : null,
  })
  return [
    mk(1, '6개 일치', d.first_winners, d.first_prize_each),
    mk(2, '5개 + 보너스', d.second_winners, d.second_prize_each),
    mk(3, '5개 일치', d.third_winners, d.third_prize_each),
    mk(4, '4개 일치', d.fourth_winners, d.fourth_prize_each),
    mk(5, '3개 일치', d.fifth_winners, d.fifth_prize_each),
  ]
}
