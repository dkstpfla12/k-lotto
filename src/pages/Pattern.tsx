import { useData } from '../data/DataContext'
import { carryDist, carryGe1Ratio, CONSEC_GE1_THEORY, consecDist, consecGe1Ratio, fmtInt, fmtPct, lowDist, oddDist, type DistRow } from '../data/calc'
import { Card, usePageTitle } from '../components/ui'

const MAX = 0.5 // 막대 높이 기준 50%

function Chart({ id, title, desc, badge, note, rows, unit }: { id: string; title: string; desc: string; badge: string; note: string; rows: DistRow[]; unit: string }) {
  const hasT = rows.some((r) => r.theory !== null)
  const h = (v: number) => `${((v / MAX) * 88).toFixed(1)}%`
  return (
    <Card className="gap16" aria-labelledby={id}>
      <div className="card-head start">
        <div className="stack" style={{ gap: 6 }}>
          <h2 id={id} className="h2 mid-h">
            {title}
          </h2>
          <p className="sub">{desc}</p>
        </div>
        <span className="badge navy">{badge}</span>
      </div>
      <div className="hbars" role="img" aria-label={`${title}: ${rows.map((r) => `${r.k}${unit} 실제 ${fmtPct(r.actual)}${r.theory !== null ? ` 이론 ${fmtPct(r.theory)}` : ''}`).join(', ')}`}>
        {rows.map((r) => (
          <div className="cat" key={r.k}>
            <div className={`stk ${hasT ? '' : 'solo'}`}>
              <span className="v">{(r.actual * 100).toFixed(1)}</span>
              <div className="bar" style={{ height: h(r.actual) }} />
            </div>
            {r.theory !== null && (
              <div className="stk">
                <span className="v t">{(r.theory * 100).toFixed(1)}</span>
                <div className="bar t" style={{ height: h(r.theory) }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="hlabels" aria-hidden="true">
        {rows.map((r) => (
          <span key={r.k}>{r.k}</span>
        ))}
      </div>
      <p className="small">{note}</p>
    </Card>
  )
}

export default function Pattern() {
  usePageTitle('패턴')
  const { stats } = useData()
  const N = stats.length
  const odd = oddDist(stats)
  const low = lowDist(stats)
  const carry = carryDist(stats)
  const cons = consecDist(stats)
  const mode = (rows: DistRow[]) => rows.reduce((a, b) => (b.actual > a.actual ? b : a))
  const oddMode = mode(odd)
  const lowMode = mode(low)
  const odd24 = odd.filter((r) => r.k >= 2 && r.k <= 4).reduce((a, r) => a + r.actual, 0)

  return (
    <>
      <div className="title-row">
        <div className="stack">
          <h1 className="title">패턴</h1>
          <p className="lead-text">당첨번호의 구성 패턴을 실제 비율과 이론 확률(1~45에서 6개를 무작위로 뽑을 때)로 비교합니다.</p>
        </div>
        <div className="legend md">
          <span>
            <i className="sw lg" style={{ background: '#13203b' }} />
            실제 ({fmtInt(N)}회)
          </span>
          <span>
            <i className="sw lg" style={{ background: '#b9c3d3' }} />
            이론 확률
          </span>
        </div>
      </div>

      <div className="grid2">
        <Chart
          id="h-odd"
          title="홀수 개수"
          desc="1~45 중 홀수는 23개"
          badge={`최빈 ${oddMode.k}개 · ${fmtPct(oddMode.actual)}`}
          note={`홀수 2~4개인 회차가 ${fmtPct(odd24)}입니다. 이론값과 거의 같습니다.`}
          rows={odd}
          unit="개"
        />
        <Chart
          id="h-low"
          title="저번호(1~22) 개수"
          desc="1~22는 22개, 23~45는 23개"
          badge={`최빈 ${lowMode.k}개 · ${fmtPct(lowMode.actual)}`}
          note="저번호와 고번호가 3 : 3으로 나뉘는 경우가 가장 흔합니다."
          rows={low}
          unit="개"
        />
        <Chart
          id="h-carry"
          title="이월수"
          desc="직전 회차 당첨번호가 다시 나온 개수"
          badge={`1개 이상 · ${fmtPct(carryGe1Ratio(stats))}`}
          note={`직전 회차 번호가 1개 이상 다시 나오는 회차가 ${carryGe1Ratio(stats) > 0.5 ? '과반' : '절반 미만'}입니다. 이론값은 약 ${fmtPct(1 - carry[0].theory!)}입니다.`}
          rows={carry}
          unit="개"
        />
        <Chart
          id="h-cons"
          title="연속번호 쌍 수"
          desc="예: 12 · 13 이면 1쌍, 12 · 13 · 14 이면 2쌍"
          badge={`1쌍 이상 · ${fmtPct(consecGe1Ratio(stats))}`}
          note={`연속번호가 하나라도 있는 회차가 ${consecGe1Ratio(stats) > 0.5 ? '절반이 넘습니다' : '절반에 못 미칩니다'}. 이론값은 약 ${fmtPct(CONSEC_GE1_THEORY)}입니다.`}
          rows={cons}
          unit="쌍"
        />
      </div>
    </>
  )
}
