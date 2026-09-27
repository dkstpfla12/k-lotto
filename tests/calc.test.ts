import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseDraws, parseStats, parseStatus } from '../src/data/parse'
import * as c from '../src/data/calc'

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const draws = parseDraws(fx('draw.csv'))
const stats = parseStats(fx('draw_stats.csv'))
const status = parseStatus(fx('number_status.csv'))
const E = JSON.parse(fx('expected.json'))
const pct = (r: number) => Number((r * 100).toFixed(1))

describe('파싱', () => {
  it('행 수와 정렬', () => {
    expect(draws.length).toBe(E.N)
    expect(stats.length).toBe(E.N)
    expect(status.length).toBe(45)
    expect(draws[draws.length - 1].draw_no).toBe(E.latest_no)
    expect(stats[0].carryover_cnt).toBeNull()
  })
})

describe('최신 회차 (명세 2단계 검증값)', () => {
  const L = c.latestSummary(draws, stats, status)
  it('최신 회차 합계 176, 직전 104, 구간 1~2σ', () => {
    expect(L.latest.sum).toBe(E.latest_sum)
    expect(L.prev!.sum).toBe(E.prev_sum)
    expect(L.stats.sum_zone).toBe(E.latest_zone)
    expect(c.sumZone(L.latest.sum)).toBe(E.latest_zone)
    expect(L.sumDiff).toBe(E.latest_sum - E.prev_sum)
  })
  it('34번 186회, 5번 공백 30회', () => {
    expect(status.find((s) => s.number === 34)!.total_count).toBe(E.n34_total)
    expect(status.find((s) => s.number === 5)!.gap_now).toBe(E.n5_gap)
    expect(L.gap.number).toBe(5)
    expect(L.gap.gap_now).toBe(30)
  })
  it('시세 띠: 판매액 증감, 1등, 최근 20회 최다, 다음 추첨', () => {
    expect(Number(L.salesChangePct!.toFixed(1))).toBe(E.sales_change_pct)
    expect(c.fmtEok(L.latest.total_sales, 0)).toBe('1,289억')
    expect(c.fmtEok(L.latest.first_prize_each)).toBe('25.9억')
    expect(c.fmtEok(L.firstTotal)).toBe('311.1억')
    expect([L.hot.number, L.hot.recent20_count]).toEqual(E.hot20_top5[0])
    expect(L.nextDrawNo).toBe(E.latest_no + 1)
    expect(c.fmtDate(L.nextDrawDate, 'mmddDay')).toBe('10.03(토)')
    expect(c.fmtDate(L.latest.draw_date, 'withDay')).toBe('2026.09.26(토)')
    expect(L.consecutive).toEqual([[43, 44]])
  })
})

describe('합계', () => {
  const S = c.sumSummary(stats)
  it('평균·중앙값·표준편차·최빈·최고·최저', () => {
    expect(Number(S.mean.toFixed(2))).toBe(E.sum_mean)
    expect(S.median).toBe(E.sum_median)
    expect(Number(S.sd.toFixed(2))).toBe(E.sum_sd_pop)
    expect([S.mode.sum, S.mode.count]).toEqual(E.sum_mode)
    expect([S.max.sum, S.max.draw_no]).toEqual(E.sum_max)
    expect([S.min.sum, S.min.draw_no]).toEqual(E.sum_min)
  })
  it('구간별 회차 수 (전체·최근 52회)', () => {
    expect(c.zoneCounts(stats)).toEqual(E.zone_all)
    expect(c.zoneCounts(stats.slice(-52))).toEqual(E.zone_last52)
    expect(pct(c.inBandRatio(stats))).toBe(E.in1_pct)
  })
  it('10단위 히스토그램과 이론값', () => {
    const h = c.sumHistogram(stats)
    expect(h.map((b) => b.count)).toEqual(E.hist10_from40)
    expect(Number(h[0].theory.toFixed(1))).toBe(1.3)
    expect(Number(h[9].theory.toFixed(1))).toBe(164.7)
  })
  it('이론 표준편차 ≈ 29.95', () => expect(Number(c.SUM_SD.toFixed(2))).toBe(29.95))
})

describe('패턴', () => {
  it('홀수·저번호·이월수·연속번호 분포', () => {
    expect(c.oddDist(stats).map((r) => pct(r.actual))).toEqual(E.odd_pct)
    expect(c.oddDist(stats).map((r) => pct(r.theory!))).toEqual(E.odd_theory)
    expect(c.lowDist(stats).map((r) => pct(r.actual))).toEqual(E.low_pct)
    expect(c.lowDist(stats).map((r) => pct(r.theory!))).toEqual(E.low_theory)
    expect(c.carryDist(stats).map((r) => pct(r.actual))).toEqual(E.carry_pct)
    expect(c.carryDist(stats).map((r) => pct(r.theory!))).toEqual(E.carry_theory)
    expect(pct(c.carryGe1Ratio(stats))).toBe(E.carry_ge1_pct)
    expect(c.consecDist(stats).map((r) => pct(r.actual))).toEqual(E.cons_pct)
    expect(pct(c.consecGe1Ratio(stats))).toBe(E.cons_ge1_pct)
    expect(pct(c.CONSEC_GE1_THEORY)).toBe(E.cons_theory_ge1)
  })
})

describe('번호 빈도 · 미출현', () => {
  it('TOP 10 / BOTTOM 10, HOT 5, 공백 5', () => {
    const rows = c.freqRows(status, 'all', draws.length)
    expect(c.sortDesc(rows).slice(0, 10).map((r) => [r.number, r.count])).toEqual(E.top10_total)
    expect(c.sortAsc(rows).slice(0, 10).map((r) => [r.number, r.count])).toEqual(E.bottom10_total)
    expect(c.sortByRecent20(status).slice(0, 5).map((s) => [s.number, s.recent20_count])).toEqual(E.hot20_top5)
    expect(c.sortByGap(status).slice(0, 5).map((s) => [s.number, s.gap_now])).toEqual(E.gap_top5)
  })
  it('기대값과 편차, 히트맵 단계', () => {
    expect(Number(c.expectedCount(draws.length).toFixed(1))).toBe(165.7)
    const r34 = c.freqRows(status, 'all', draws.length).find((r) => r.number === 34)!
    expect(c.fmtSigned(r34.deviation)).toBe('+20.3')
    expect(c.heatLevel((r34.deviation / c.expectedCount(draws.length)) * 100)).toBe(5)
    expect(c.heatLevel(-9)).toBe(0)
    expect(c.heatLevel(-0.1)).toBe(2)
    expect(c.heatLevel(0)).toBe(3)
  })
  it('미출현 요약', () => {
    const g = c.gapSummary(status)
    expect(g.ge10).toBe(E.gap_ge10_count)
    expect(Number(g.avgGapMean.toFixed(2))).toBe(E.avg_gap_mean)
    expect([g.maxGap.max_gap, g.maxGap.number]).toEqual(E.max_gap_overall)
    expect(g.longest.avg_gap).toBe(E.n5_avg)
    expect(g.longest.max_gap).toBe(E.n5_max)
  })
})

describe('내 번호', () => {
  it('예시 번호 3·11·19·27·34·42: 4등 1회, 5등 29회', () => {
    const r = c.checkMine(draws, E.mine_example)
    expect(r.counts).toEqual({ 1: 0, 2: 0, 3: 0, 4: E.mine_ranks['4등'], 5: E.mine_ranks['5등'] })
    expect(r.hits.filter((h) => h.rank <= 4).map((h) => [h.draw.draw_no, h.rank + '등'])).toEqual(E.mine_hits_4up)
    expect(Number((c.WIN_ANY_THEORY * 100).toFixed(1))).toBe(2.4)
  })
})
