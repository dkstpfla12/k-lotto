import Papa from 'papaparse'
import type { Draw, DrawStats, NumberStatus, SumZone } from './types'

type Row = Record<string, string>

function rows(csv: string): Row[] {
  const text = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv
  const out = Papa.parse<Row>(text, { header: true, skipEmptyLines: true })
  if (out.errors.length && out.data.length === 0) {
    throw new Error('CSV 해석 실패: ' + out.errors[0].message)
  }
  return out.data
}

const num = (v: string | undefined): number => {
  const n = Number(v)
  if (v === undefined || v === '' || Number.isNaN(n)) throw new Error(`숫자가 아닌 값: ${v}`)
  return n
}
const numOrNull = (v: string | undefined): number | null => (v === undefined || v === '' ? null : num(v))

export function parseDraws(csv: string): Draw[] {
  return rows(csv)
    .map((r) => ({
      draw_no: num(r.draw_no),
      draw_date: r.draw_date,
      nums: [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].map(num).sort((a, b) => a - b),
      bonus: num(r.bonus),
      sum: num(r.sum),
      total_sales: num(r.total_sales),
      prize_pool: num(r.prize_pool),
      first_winners: num(r.first_winners),
      first_prize_each: num(r.first_prize_each),
      second_winners: num(r.second_winners),
      second_prize_each: num(r.second_prize_each),
      collected_at: r.collected_at ?? '',
    }))
    .sort((a, b) => a.draw_no - b.draw_no)
}

export function parseStats(csv: string): DrawStats[] {
  return rows(csv)
    .map((r) => ({
      draw_no: num(r.draw_no),
      draw_date: r.draw_date,
      sum: num(r.sum),
      sum_z: num(r.sum_z),
      sum_zone: r.sum_zone as SumZone,
      odd_cnt: num(r.odd_cnt),
      even_cnt: num(r.even_cnt),
      low_cnt: num(r.low_cnt),
      high_cnt: num(r.high_cnt),
      consecutive_pairs: num(r.consecutive_pairs),
      ac_value: num(r.ac_value),
      last_digit_sum: num(r.last_digit_sum),
      range_span: num(r.range_span),
      carryover_cnt: numOrNull(r.carryover_cnt),
      band_01_10: num(r.band_01_10),
      band_11_20: num(r.band_11_20),
      band_21_30: num(r.band_21_30),
      band_31_40: num(r.band_31_40),
      band_41_45: num(r.band_41_45),
    }))
    .sort((a, b) => a.draw_no - b.draw_no)
}

export function parseStatus(csv: string): NumberStatus[] {
  return rows(csv)
    .map((r) => ({
      number: num(r.number),
      total_count: num(r.total_count),
      expected_count: num(r.expected_count),
      bonus_count: num(r.bonus_count),
      last_seen_draw: num(r.last_seen_draw),
      gap_now: num(r.gap_now),
      avg_gap: num(r.avg_gap),
      max_gap: num(r.max_gap),
      recent5_count: num(r.recent5_count),
      recent10_count: num(r.recent10_count),
      recent20_count: num(r.recent20_count),
      as_of_draw: num(r.as_of_draw),
    }))
    .sort((a, b) => a.number - b.number)
}
