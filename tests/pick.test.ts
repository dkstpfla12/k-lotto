import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseDraws, parseStats, parseStatus } from '../src/data/parse'
import { freqRows, gapSummary, sortAsc, sortByGap, sortDesc } from '../src/data/calc'
import type { LottoData } from '../src/data/types'
import * as P from '../src/data/pick'

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const data: LottoData = { draws: parseDraws(fx('draw.csv')), stats: parseStats(fx('draw_stats.csv')), status: parseStatus(fx('number_status.csv')), loadedAt: new Date() }
const E = JSON.parse(fx('expected.json'))
const uniq6 = (s: number[]) => s.length === 6 && new Set(s).size === 6 && s.every((n) => Number.isInteger(n) && n >= 1 && n <= 45)

describe('합계 기반 추천 (명세 검증: 5,000세트)', () => {
  it('108~168 조건으로 만든 5,000세트가 모두 범위 안이고 번호가 겹치지 않는다', () => {
    const cfg = { ...P.DEFAULT_CONFIG, mode: 'sum' as const, sumMin: 108, sumMax: 168 }
    let inRange = 0
    for (let i = 0; i < 5000; i++) {
      const s = P.generateOne(cfg, data, P.cryptoRng)
      expect(s).not.toBeNull()
      expect(uniq6(s!)).toBe(true)
      const sum = s!.reduce((a, b) => a + b, 0)
      if (sum >= 108 && sum <= 168) inRange++
      expect(s).toEqual([...s!].sort((a, b) => a - b))
    }
    expect(inRange).toBe(5000)
  })
  it('무작위 조합이 108~168에 들 비율은 약 68%', () => {
    const cfg = { ...P.DEFAULT_CONFIG, mode: 'random' as const }
    let n = 0
    for (let i = 0; i < 5000; i++) {
      const sum = P.generateOne(cfg, data, P.cryptoRng)!.reduce((a, b) => a + b, 0)
      if (sum >= 108 && sum <= 168) n++
    }
    expect(n / 5000).toBeGreaterThan(0.62)
    expect(n / 5000).toBeLessThan(0.74)
  })
})

describe('빈도·미출현 후보가 분석 화면의 값과 일치', () => {
  it('빈도 후보 = 번호별 빈도 TOP N (동률은 번호 오름차순)', () => {
    const rows = freqRows(data.status, 'all', data.draws.length)
    expect(P.freqPool(data.status, 'all', 'hot', 15)).toEqual(sortDesc(rows).slice(0, 15).map((r) => r.number))
    expect(P.freqPool(data.status, 'all', 'cold', 10)).toEqual(sortAsc(rows).slice(0, 10).map((r) => r.number))
    expect(P.freqPool(data.status, 'all', 'hot', 10)).toEqual(E.top10_total.map((t: number[]) => t[0]))
    expect(P.freqPool(data.status, 'all', 'cold', 10)).toEqual(E.bottom10_total.map((t: number[]) => t[0]))
    const r20 = freqRows(data.status, 20, data.draws.length)
    expect(P.freqPool(data.status, 20, 'hot', 15)).toEqual(sortDesc(r20).slice(0, 15).map((r) => r.number))
    expect(P.freqPool(data.status, 20, 'hot', 5)).toEqual(E.hot20_top5.map((t: number[]) => t[0]))
  })
  it('미출현 후보 = 미출현 분석의 공백 N회 이상 번호 (공백 긴 순)', () => {
    const pool = P.gapPool(data.status, 10)
    expect(pool.length).toBe(E.gap_ge10_count)
    expect(pool.length).toBe(gapSummary(data.status).ge10)
    expect(pool).toEqual(sortByGap(data.status).filter((s) => s.gap_now >= 10).map((s) => s.number))
    expect(pool.slice(0, 5)).toEqual(E.gap_top5.map((t: number[]) => t[0]))
  })
  it('빈도 방식 결과는 후보 안에서만, 미출현 방식은 지정 개수만큼 공백 번호를 포함', () => {
    const pool = new Set(P.freqPool(data.status, 'all', 'hot', 15))
    for (let i = 0; i < 300; i++) {
      const s = P.generateOne({ ...P.DEFAULT_CONFIG, mode: 'freq', freqPool: 15 }, data)!
      expect(uniq6(s) && s.every((n) => pool.has(n))).toBe(true)
    }
    const gp = new Set(P.gapPool(data.status, 10))
    for (const k of [1, 2, 3] as const) {
      for (let i = 0; i < 200; i++) {
        const s = P.generateOne({ ...P.DEFAULT_CONFIG, mode: 'gap', gapMin: 10, gapCount: k }, data)!
        expect(uniq6(s)).toBe(true)
        expect(s.filter((n) => gp.has(n)).length).toBe(k)
      }
    }
  })
})

describe('공통 옵션', () => {
  it('넣을·뺄 번호, 홀짝 비율, 세트 수', () => {
    const cfg = { ...P.DEFAULT_CONFIG, mode: 'random' as const, include: [7, 23], exclude: [1, 45], oddEven: '33' as const, sets: 5 as const }
    const r = P.generateSets(cfg, data)
    expect(r.error).toBeUndefined()
    expect(r.sets.length).toBe(5)
    expect(new Set(r.sets.map((s) => s.join(','))).size).toBe(5)
    for (const s of r.sets) {
      expect(uniq6(s)).toBe(true)
      expect(s).toContain(7)
      expect(s).toContain(23)
      expect(s).not.toContain(1)
      expect(s).not.toContain(45)
      expect(s.filter((n) => n % 2 === 1).length).toBe(3)
    }
    const r24 = P.generateSets({ ...cfg, oddEven: '24', include: [] }, data)
    for (const s of r24.sets) expect([2, 3, 4]).toContain(s.filter((n) => n % 2 === 1).length)
  })
  it('입력 문자열 해석', () => {
    expect(P.parseNumberList('7, 23 · 45')).toEqual({ nums: [7, 23, 45], bad: [] })
    expect(P.parseNumberList('3 3 46 a')).toEqual({ nums: [3], bad: ['46', 'a'] })
    expect(P.parseNumberList('')).toEqual({ nums: [], bad: [] })
  })
})

describe('모순되거나 너무 좁은 조건 안내', () => {
  const base = P.DEFAULT_CONFIG
  it('버튼 누르기 전 검증 메시지', () => {
    expect(P.validateConfig({ ...base, include: [7], exclude: [7] }, data).join(' ')).toContain('겹칩니다')
    expect(P.validateConfig({ ...base, include: [1, 2, 3, 4, 5, 6] }, data).join(' ')).toContain('최대 5개')
    expect(P.validateConfig({ ...base, sumMin: 170, sumMax: 120 }, data).join(' ')).toContain('최소가 최대보다')
    expect(P.validateConfig({ ...base, sumMin: 10, sumMax: 300 }, data).join(' ')).toContain('21~255')
    expect(P.validateConfig({ ...base, include: [1, 3, 5, 7], oddEven: '33' }, data).join(' ')).toContain('홀짝')
    expect(P.validateConfig({ ...base, mode: 'gap', gapMin: 40 }, data).join(' ')).toContain('회 이상인 번호가 0개')
    expect(P.validateConfig({ ...base, mode: 'gap', gapMin: 10, gapCount: 1, include: [5, 27] }, data).join(' ')).toContain('포함 개수')
    expect(P.validateConfig({ ...base, mode: 'freq', freqPool: 10, exclude: E.top10_total.slice(0, 6).map((t: number[]) => t[0]) }, data).join(' ')).toContain('후보 번호가')
    expect(P.validateConfig({ ...base, include: [41, 42, 43, 44, 45], sumMin: 108, sumMax: 168 }, data).join(' ')).toContain('넘습니다')
    expect(P.validateConfig(base, data)).toEqual([])
    expect(P.validateConfig({ ...base, mode: 'random' }, data)).toEqual([])
  })
  it('만족하는 조합이 사실상 없으면 실패 안내', () => {
    const r = P.generateSets({ ...base, mode: 'sum', sumMin: 21, sumMax: 21, sets: 1 }, data)
    expect(r.error).toBe(P.GENERATE_FAIL)
  })
})

describe('결과 설명', () => {
  it('예시 번호의 과거 성적과 1등 조합 겹침', () => {
    const info = P.describeSet(E.mine_example, data.draws)
    expect(info.sum).toBe(136)
    expect([info.odd, info.even, info.low, info.high]).toEqual([4, 2, 3, 3])
    expect(info.counts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 29 })
    expect(P.recordText(info.counts)).toBe('4등 1회 · 5등 29회')
    expect(info.firstMatch).toBeNull()
    const latest = data.draws[data.draws.length - 1]
    expect(P.describeSet(latest.nums, data.draws).firstMatch).toBe(latest.draw_no)
    expect(P.recordText({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toBe('당첨 없음')
  })
})
