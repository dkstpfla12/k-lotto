import { useState } from 'react'
import { useData } from '../data/DataContext'
import { expectedCount, fmtInt, fmtSigned, freqRows, sortAsc, sortDesc, windowSize, type FreqRow, type Period } from '../data/calc'
import { Ball, Card, Segment, usePageTitle } from '../components/ui'
import DeviationBars from '../components/charts/DeviationBars'

function TopTable({ title, rows, color, id }: { title: string; rows: FreqRow[]; color: 'up' | 'down'; id: string }) {
  const cols = '56px minmax(0, 1fr) 90px 100px 100px'
  return (
    <Card className="gap16" aria-labelledby={id}>
      <h2 id={id} className="h2">
        {title}
      </h2>
      <div className="scroll-x">
        <div role="table" aria-label={title} className="gtable">
          <div role="row" className="head" style={{ gridTemplateColumns: cols }}>
            <span role="columnheader">순위</span>
            <span role="columnheader">번호</span>
            <span role="columnheader" className="r">
              출현
            </span>
            <span role="columnheader" className="r">
              기대 대비
            </span>
            <span role="columnheader" className="r">
              최근 20회
            </span>
          </div>
          {rows.map((r, i) => (
            <div role="row" key={r.number} style={{ gridTemplateColumns: cols }}>
              <span role="cell" className="muted b">
                {i + 1}
              </span>
              <span role="cell" style={{ padding: 8 }}>
                <Ball n={r.number} size="xs" />
              </span>
              <span role="cell" className="r b">
                {r.count}회
              </span>
              <span role="cell" className={`r b ${color}`}>
                {fmtSigned(r.deviation)}
              </span>
              <span role="cell" className="r">
                {r.recent20}회
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default function Freq() {
  usePageTitle('번호 빈도')
  const { draws, status } = useData()
  const N = draws.length
  const [period, setPeriod] = useState<Period>('all')
  const rows = freqRows(status, period, N)
  const w = windowSize(period, N)
  const exp = expectedCount(w)
  const boldAt = period === 'all' ? 12 : 2

  return (
    <>
      <div className="title-row">
        <div className="stack">
          <h1 className="title">번호 빈도</h1>
          <p className="lead-text">번호별 출현 횟수를 기대값과 비교합니다. 기대값보다 많으면 빨강, 적으면 파랑입니다.</p>
        </div>
        <Segment<Period>
          label="기간 선택"
          className="dark wide"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'all', label: `전체 ${fmtInt(N)}회` },
            { value: 20, label: '최근 20회' },
            { value: 10, label: '최근 10회' },
            { value: 5, label: '최근 5회' },
          ]}
        />
      </div>

      <Card className="gap16" aria-labelledby="h-dev">
        <div className="card-head end">
          <div className="stack">
            <h2 id="h-dev" className="h2">
              기대값 대비 편차
            </h2>
            <p className="sub">
              기대값 {exp.toFixed(1)}회 = {fmtInt(w)}회 × 6개 ÷ 45개 · 막대 = 실제 − 기대
            </p>
          </div>
          <div className="legend">
            <span>
              <i className="sw" style={{ background: '#d42f2c' }} />
              기대보다 많이
            </span>
            <span>
              <i className="sw" style={{ background: '#1d5fd1' }} />
              기대보다 적게
            </span>
          </div>
        </div>
        <DeviationBars rows={rows} boldAt={boldAt} label={`${period === 'all' ? '전체' : `최근 ${period}회`} 번호별 출현 횟수의 기대값 대비 편차`} />
        {period !== 'all' && <p className="small">최근 {period}회는 번호 {period * 6}개뿐이라, 이 정도 차이는 대부분 우연으로 생깁니다.</p>}
      </Card>

      <div className="grid2">
        <TopTable id="h-top" title="많이 나온 번호 TOP 10" rows={sortDesc(rows).slice(0, 10)} color="up" />
        <TopTable id="h-bottom" title="적게 나온 번호 TOP 10" rows={sortAsc(rows).slice(0, 10)} color="down" />
      </div>
      <p className="sub">
        {fmtInt(N)}회 규모에서 번호별 ±25회 정도의 차이는 우연으로도 충분히 생깁니다. 많이 나온 번호가 앞으로도 잘 나온다는 뜻은 아닙니다.
      </p>
    </>
  )
}
