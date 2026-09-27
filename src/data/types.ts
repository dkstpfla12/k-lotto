/** 게시 CSV `draw` 한 행 (원천, 회차 1행) */
export interface Draw {
  draw_no: number
  draw_date: string // YYYY-MM-DD
  nums: number[] // 오름차순 6개
  bonus: number
  sum: number
  total_sales: number
  prize_pool: number
  first_winners: number
  first_prize_each: number
  second_winners: number
  second_prize_each: number
  third_winners: number | null // 3~5등·총 당첨자: 2026-09-27 수집기에 추가. 없으면 null
  third_prize_each: number | null
  fourth_winners: number | null
  fourth_prize_each: number | null
  fifth_winners: number | null
  fifth_prize_each: number | null
  total_winners: number | null // 1~5등 총 당첨자 수
  collected_at: string // 수집 시각 (ISO)
}

export type SumZone = '1σ 이내' | '1~2σ' | '2σ 초과'

/** 게시 CSV `draw_stats` 한 행 (회차별 패턴 지표, build_derived.py 산출) */
export interface DrawStats {
  draw_no: number
  draw_date: string
  sum: number
  sum_z: number
  sum_zone: SumZone
  odd_cnt: number
  even_cnt: number
  low_cnt: number
  high_cnt: number
  consecutive_pairs: number
  ac_value: number
  last_digit_sum: number
  range_span: number
  carryover_cnt: number | null // 1회차는 null
  band_01_10: number
  band_11_20: number
  band_21_30: number
  band_31_40: number
  band_41_45: number
}

/** 게시 CSV `number_status` 한 행 (번호 1~45 현재 상태) */
export interface NumberStatus {
  number: number
  total_count: number
  expected_count: number
  bonus_count: number
  last_seen_draw: number
  gap_now: number
  avg_gap: number
  max_gap: number
  recent5_count: number
  recent10_count: number
  recent20_count: number
  as_of_draw: number
}

export interface LottoData {
  draws: Draw[] // draw_no 오름차순
  stats: DrawStats[] // draw_no 오름차순
  status: NumberStatus[] // number 오름차순
  loadedAt: Date
}
