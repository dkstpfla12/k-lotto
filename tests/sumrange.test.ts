// WEB_SPEC 8.7 검증: 1~1,244회 고정 데이터(tests/fixtures/sums_1244.json)로 기대값을 확인한다.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseDraws, parseStats, parseStatus } from '../src/data/parse'
import type { LottoData } from '../src/data/types'
import { cryptoRng, DEFAULT_CONFIG, generateOne } from '../src/data/pick'
import * as S from '../src/data/sumrange'

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const F = JSON.parse(fx('sums_1244.json')) as { first: number; last: number; sums: number[] }
const sums = F.sums
const data: LottoData = { draws: parseDraws(fx('draw.csv')), stats: parseStats(fx('draw_stats.csv')), status: parseStatus(fx('number_status.csv')), loadedAt: new Date() }
const p1 = (r: S.Ratio) => Number((r.ratio * 100).toFixed(1))

describe('고정 데이터', () => {
  it('1~1,244회 합계 1,244개', () => {
    expect([F.first, F.last, sums.length]).toEqual([1, 1244, 1244])
    expect(sums[sums.length - 1]).toBe(130)
  })
})

describe('8.2 (1) 최근 30회 기준', () => {
  it('최근 30회(1,215~1,244회) 평균 139.60 · 표본 표준편차 24.96', () => {
    const r = S.recentRange(sums, 'normal')!
    expect([r.from, r.to]).toEqual([1215, 1244])
    expect(r.mean.toFixed(2)).toBe('139.60')
    expect(r.sd.toFixed(2)).toBe('24.96')
    expect(r.mean.toFixed(1)).toBe('139.6')
    expect(r.sd.toFixed(1)).toBe('25.0')
  })
  it('범위: 좁게 122~157 / 보통 114~165 / 넓게 107~172', () => {
    const rg = S.WIDTHS.map((w) => S.recentRange(sums, w)!).map((r) => [r.lo, r.hi])
    expect(rg).toEqual([[122, 157], [114, 165], [107, 172]])
  })
  it('전체 조합 비율: 44.2% (3,603,828) / 60.5% (4,924,527) / 72.1% (5,873,679)', () => {
    const rs = S.WIDTHS.map((w) => S.recentRange(sums, w)!).map((r) => S.comboRatio(r.lo, r.hi))
    expect(rs.map((r) => r.hits)).toEqual([3603828, 4924527, 5873679])
    expect(rs.map(p1)).toEqual([44.2, 60.5, 72.1])
    expect(rs[0].total).toBe(8145060)
  })
  it('과거 1,214회 적용 비율: 49.4% (600회) / 67.5% (819회) / 79.9% (970회)', () => {
    const rs = S.WIDTHS.map((w) => S.backtestRecent(sums, w))
    expect(rs.map((r) => r.total)).toEqual([1214, 1214, 1214])
    expect(rs.map((r) => r.hits)).toEqual([600, 819, 970])
    expect(rs.map(p1)).toEqual([49.4, 67.5, 79.9])
  })
  it('30회 미만이면 최근 30회 기준을 쓸 수 없다 (방어)', () => {
    expect(S.recentRange(sums.slice(0, 29), 'normal')).toBeNull()
    expect(S.recentRange(sums.slice(0, 30), 'normal')).not.toBeNull()
    expect(S.backtestRecent(sums.slice(0, 30), 'normal')).toEqual({ hits: 0, total: 0, ratio: 0 })
  })
})

describe('8.2 (2) 전체 평균 기준', () => {
  it('범위: 좁게 118~158 / 보통 108~168 / 넓게 100~176', () => {
    expect(S.WIDTHS.map((w) => S.fixedRange(w)).map((r) => [r.lo, r.hi])).toEqual([[118, 158], [108, 168], [100, 176]])
  })
  it('전체 조합 비율: 49.7% (4,045,584) / 68.3% (5,562,590) / 79.6% (6,481,786)', () => {
    const rs = S.WIDTHS.map((w) => S.fixedRange(w)).map((r) => S.comboRatio(r.lo, r.hi))
    expect(rs.map((r) => r.hits)).toEqual([4045584, 5562590, 6481786])
    expect(rs.map(p1)).toEqual([49.7, 68.3, 79.6])
  })
  it('과거 당첨번호 1,244회 중: 47.6% (592회) / 67.2% (836회) / 78.5% (976회)', () => {
    const rs = S.WIDTHS.map((w) => S.fixedRange(w)).map((r) => S.pastRatio(sums, r.lo, r.hi))
    expect(rs.map((r) => r.total)).toEqual([1244, 1244, 1244])
    expect(rs.map((r) => r.hits)).toEqual([592, 836, 976])
    expect(rs.map(p1)).toEqual([47.6, 67.2, 78.5])
  })
})

describe('합계별 조합 수 표', () => {
  it('전체 합이 8,145,060이고 좌우 대칭이며 양끝은 1개씩', () => {
    const t = S.sumComboCounts()
    expect(t.reduce((a, b) => a + b, 0)).toBe(8145060)
    expect([t[21], t[255], t[20], t[22]]).toEqual([1, 1, 0, 1])
    for (let s = 21; s <= 255; s++) expect(t[s]).toBe(t[276 - s])
    expect(S.comboRatio(21, 255).ratio).toBe(1)
    expect(S.sumComboCounts()).toBe(t) // 한 번 계산해 재사용
  })
})

describe('8.4 직전 회차 표식', () => {
  it('1244회, 합계 130, 위치 46.58%', () => {
    expect(sums.length).toBe(1244)
    expect(S.markerPct(sums[sums.length - 1]).toFixed(2)).toBe('46.58')
    expect(S.markerPct(21)).toBe(0)
    expect(S.markerPct(255)).toBe(100)
    expect(S.markerPct(139.6).toFixed(2)).toBe('50.68')
    expect(S.markerPct(114).toFixed(2)).toBe('39.74')
    expect(S.markerPct(165).toFixed(2)).toBe('61.54')
  })
})

describe('조합 생성 (규칙은 7.3 그대로)', () => {
  it('최근 30회 · 보통(114~165) 조건 5,000세트가 모두 범위 안이고 번호가 겹치지 않는다', () => {
    const r = S.recentRange(sums, 'normal')!
    const cfg = { ...DEFAULT_CONFIG, mode: 'sum' as const, sumMin: r.lo, sumMax: r.hi }
    expect([cfg.sumMin, cfg.sumMax]).toEqual([114, 165])
    for (let i = 0; i < 5000; i++) {
      const s = generateOne(cfg, data, cryptoRng)!
      expect(s.length === 6 && new Set(s).size === 6 && s.every((n) => n >= 1 && n <= 45)).toBe(true)
      const sum = s.reduce((a, b) => a + b, 0)
      expect(sum >= 114 && sum <= 165).toBe(true)
    }
  })
})

describe('8.6 문구 규칙', () => {
  it('/pick 화면과 계산 모듈에 "적중", "예측", "확률 상승"이 없다', () => {
    for (const f of ['../src/pages/Pick.tsx', '../src/data/sumrange.ts', '../src/data/pick.ts']) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(src).not.toMatch(/적중|예측|확률 상승/)
    }
    expect(readFileSync(new URL('../src/pages/Pick.tsx', import.meta.url), 'utf8')).toContain('당첨 확률과는 다릅니다.')
  })
})
