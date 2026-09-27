import { useData } from '../data/DataContext'
import { gapSummary, sortByGap } from '../data/calc'
import { Ball, Card, Stat, usePageTitle } from '../components/ui'
import GapBars from '../components/charts/GapBars'

export default function Gap() {
  usePageTitle('미출현')
  const { draws, status } = useData()
  const latest = draws[draws.length - 1].draw_no
  const sorted = sortByGap(status)
  const G = gapSummary(status)
  const top = sorted.slice(0, 10)
  const cols = '64px 96px repeat(5, minmax(0, 1fr))'

  return (
    <>
      <div className="stack">
        <h1 className="title">미출현</h1>
        <p className="lead-text">각 번호가 마지막으로 나온 뒤 몇 회째 나오지 않고 있는지 보여줍니다. 오래 쉬었다고 곧 나온다는 뜻은 아닙니다.</p>
      </div>

      <div className="stat-cards c4">
        <Stat label="최장 미출현" value={`${G.longest.number}번 · ${G.longest.gap_now}회째`} note={`마지막 출현 ${G.longest.last_seen_draw}회`} />
        <Stat label="10회 이상 쉬는 번호" value={`${G.ge10}개`} note="45개 번호 중" />
        <Stat label="번호별 평균 출현 간격" value={`약 ${G.avgGapMean.toFixed(1)}회`} note="45 ÷ 6 = 7.5 (이론값)" />
        <Stat label="역대 최장 공백" value={`${G.maxGap.max_gap}회`} note={`${G.maxGap.number}번`} />
      </div>

      <Card className="gap16" aria-labelledby="h-bars">
        <div className="card-head end">
          <div className="stack">
            <h2 id="h-bars" className="h2">
              번호별 현재 공백
            </h2>
            <p className="sub">공백이 긴 순서 · {latest}회 기준</p>
          </div>
          <div className="legend">
            <span>
              <i className="sw" style={{ background: '#1d5fd1' }} />
              공백이 평균의 2배 초과
            </span>
            <span>
              <i className="sw" style={{ background: '#9db6e6' }} />
              그 외 현재 공백
            </span>
            <span>
              <i className="sw dot" />
              평균 출현 간격
            </span>
          </div>
        </div>
        <GapBars rows={sorted} label="번호별 현재 공백 막대와 평균 출현 간격 점" />
      </Card>

      <Card className="gap16" aria-labelledby="h-top">
        <div className="card-head base">
          <h2 id="h-top" className="h2">
            공백이 긴 번호 TOP 10
          </h2>
          <span className="small">평균 대비 = 현재 공백 ÷ 평균 출현 간격</span>
        </div>
        <div className="scroll-x">
          <div role="table" aria-label="공백이 긴 번호" className="gtable wide">
            <div role="row" className="head" style={{ gridTemplateColumns: cols }}>
              <span role="columnheader">순위</span>
              <span role="columnheader">번호</span>
              <span role="columnheader" className="r">
                현재 공백
              </span>
              <span role="columnheader" className="r">
                평균 간격
              </span>
              <span role="columnheader" className="r">
                역대 최장
              </span>
              <span role="columnheader" className="r">
                마지막 출현
              </span>
              <span role="columnheader" className="r">
                평균 대비
              </span>
            </div>
            {top.map((r, i) => (
              <div role="row" key={r.number} style={{ gridTemplateColumns: cols }}>
                <span role="cell" className="muted b">
                  {i + 1}
                </span>
                <span role="cell" style={{ padding: 8 }}>
                  <Ball n={r.number} size="xs" />
                </span>
                <span role="cell" className="r b">
                  {r.gap_now}회
                </span>
                <span role="cell" className="r">
                  {r.avg_gap.toFixed(1)}회
                </span>
                <span role="cell" className="r">
                  {r.max_gap}회
                </span>
                <span role="cell" className="r">
                  {r.last_seen_draw}회
                </span>
                <span role="cell" className="r">
                  <span className="badge blue">{(r.gap_now / r.avg_gap).toFixed(1)}배</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  )
}
