/**
 * 합계 기반 추천의 범위 계산과 근거 수치 (docs/WEB_SPEC.md 8.2 · 8.5)
 * 모든 숫자는 데이터에서 실시간으로 계산한다. 여기서 나오는 비율은 "합계가 범위에 들어온 비율"이며 당첨 확률과는 다르다.
 */
export type SumBasis = 'recent30' | 'fixed' | 'custom'
export type SumWidth = 'narrow' | 'normal' | 'wide'

export const WIDTHS: SumWidth[] = ['narrow', 'normal', 'wide']
export const WIDTH_Z: Record<SumWidth, number> = { narrow: 0.674, normal: 1.0, wide: 1.282 }
export const WIDTH_LABEL: Record<SumWidth, string> = { narrow: '좁게', normal: '보통', wide: '넓게' }
export const BASIS_LABEL: Record<SumBasis, string> = { recent30: '최근 30회', fixed: '전체 평균', custom: '직접 입력' }

export const RECENT_N = 30
export const SUM_LO = 21
export const SUM_HI = 255
/** 전체 평균 기준(고정 범위)의 이론값: 1~45에서 6개를 뽑을 때 */
export const FIXED_MEAN = 138
export const FIXED_SD = 29.95
export const TOTAL_COMBOS = 8145060

export interface SumRange {
  lo: number
  hi: number
}
const clamp = (v: number) => Math.max(SUM_LO, Math.min(SUM_HI, v))

/** 평균과 표본 표준편차(분모 n−1) */
export function meanSd(values: number[]): { mean: number; sd: number } {
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0
  return { mean, sd }
}

/** (1) 최근 30회 기준: half = z × s × √(1 + 1/30), 반올림 후 21~255로 자른다 */
export function windowRange(window: number[], z: number): SumRange {
  const { mean, sd } = meanSd(window)
  const half = z * sd * Math.sqrt(1 + 1 / window.length)
  return { lo: clamp(Math.round(mean - half)), hi: clamp(Math.round(mean + half)) }
}

export interface RecentInfo extends SumRange {
  mean: number
  sd: number
  from: number // 창의 첫 회차 (1부터 센 순번)
  to: number // 창의 마지막 회차
}
/** sums: 회차 오름차순 합계 목록. 30회 미만이면 null (방어) */
export function recentRange(sums: number[], width: SumWidth): RecentInfo | null {
  if (sums.length < RECENT_N) return null
  const w = sums.slice(-RECENT_N)
  const { mean, sd } = meanSd(w)
  return { ...windowRange(w, WIDTH_Z[width]), mean, sd, from: sums.length - RECENT_N + 1, to: sums.length }
}

/** (2) 전체 평균 기준: m = 138, s = 29.95, half = z × s (고정 범위) */
export function fixedRange(width: SumWidth): SumRange {
  const half = WIDTH_Z[width] * FIXED_SD
  return { lo: clamp(Math.round(FIXED_MEAN - half)), hi: clamp(Math.round(FIXED_MEAN + half)) }
}

/** 합계별 조합 수: "1~45에서 6개를 골라 합이 s인 경우의 수" 표. 한 번 계산해 재사용한다 */
let comboTable: number[] | null = null
export function sumComboCounts(): number[] {
  if (comboTable) return comboTable
  // ways[k][s] = 지금까지 본 번호 중 k개를 골라 합이 s인 경우의 수
  const ways: number[][] = Array.from({ length: 7 }, () => new Array<number>(SUM_HI + 1).fill(0))
  ways[0][0] = 1
  for (let n = 1; n <= 45; n++) {
    for (let k = 5; k >= 0; k--) {
      for (let s = 0; s + n <= SUM_HI; s++) {
        if (ways[k][s]) ways[k + 1][s + n] += ways[k][s]
      }
    }
  }
  comboTable = ways[6]
  return comboTable
}

export interface Ratio {
  hits: number
  total: number
  ratio: number
}
const ratio = (hits: number, total: number): Ratio => ({ hits, total, ratio: total ? hits / total : 0 })

/** 전체 조합 중 합계가 lo~hi(양끝 포함)인 비율 */
export function comboRatio(lo: number, hi: number): Ratio {
  const t = sumComboCounts()
  let hits = 0
  for (let s = Math.max(lo, 0); s <= Math.min(hi, SUM_HI); s++) hits += t[s]
  return ratio(hits, TOTAL_COMBOS)
}

/** 과거 적용: 31번째 회차부터, 각 회차의 직전 30회로 같은 방식의 범위를 구해 실제 합계가 범위 안(양끝 포함)이었던 비율 */
export function backtestRecent(sums: number[], width: SumWidth): Ratio {
  const z = WIDTH_Z[width]
  let hits = 0
  for (let i = RECENT_N; i < sums.length; i++) {
    const r = windowRange(sums.slice(i - RECENT_N, i), z)
    if (sums[i] >= r.lo && sums[i] <= r.hi) hits++
  }
  return ratio(hits, Math.max(0, sums.length - RECENT_N))
}

/** 과거 당첨번호 중 합계가 lo~hi(양끝 포함)인 비율 */
export function pastRatio(sums: number[], lo: number, hi: number): Ratio {
  return ratio(sums.filter((s) => s >= lo && s <= hi).length, sums.length)
}

/** 슬라이더 위 위치(%): (값 − 21) / 234 × 100 */
export function markerPct(value: number): number {
  return ((value - SUM_LO) / (SUM_HI - SUM_LO)) * 100
}

export const pct1 = (r: Ratio) => (r.ratio * 100).toFixed(1) + '%'
