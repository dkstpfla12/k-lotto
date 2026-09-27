import { expectedCount, fmtSigned, heatLevel } from '../data/calc'
import type { NumberStatus } from '../data/types'

export const HEAT = ['#3f78de', '#a9c3f3', '#dde8fb', '#fbe0df', '#f4a3a0', '#e5534f']
const FG = ['#ffffff', '#0c2150', '#0c2150', '#3a0d0c', '#3a0d0c', '#ffffff']

export function HeatScale() {
  return (
    <div className="heat-scale" aria-hidden="true">
      <span style={{ marginRight: 6 }}>적게</span>
      {HEAT.map((c) => (
        <i key={c} style={{ background: c }} />
      ))}
      <span style={{ marginLeft: 6 }}>많이</span>
    </div>
  )
}

/** 번호 히트맵: 전체 출현 횟수와 기대값 대비 편차(%) 6단계 */
export default function Heatmap({ status, totalDraws }: { status: NumberStatus[]; totalDraws: number }) {
  const exp = expectedCount(totalDraws)
  return (
    <ul className="heat" aria-label="번호별 출현 횟수 히트맵" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {status.map((s) => {
        const dev = ((s.total_count - exp) / exp) * 100
        const lv = heatLevel(dev)
        return (
          <li key={s.number} className="heat-cell" style={{ background: HEAT[lv], color: FG[lv] }}>
            <span className="n">{s.number}</span>
            <span className="m">
              <span>
                {s.total_count}
                <span className="dev">회</span>
              </span>
              <span className="dev">{fmtSigned(dev)}%</span>
            </span>
            <span className="sr-only">
              {s.number}번 {s.total_count}회, 기대값 대비 {fmtSigned(dev)}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
