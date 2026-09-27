import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import {
  carryGe1Ratio,
  CONSEC_GE1_THEORY,
  consecGe1Ratio,
  expectedCount,
  fmtDate,
  fmtEok,
  fmtInt,
  fmtPct,
  fmtSigned,
  inBandRatio,
  latestSummary,
  oddDist,
  BAND1,
  sortByGap,
  sortByRecent20,
} from '../data/calc'
import { Ball, Balls, Card, Segment, ZoneBadge, usePageTitle } from '../components/ui'
import SumTrend from '../components/charts/SumTrend'
import Heatmap, { HeatScale } from '../components/Heatmap'

type Win = 13 | 26 | 52 | 'all'

export default function Home() {
  usePageTitle()
  const { draws, stats, status } = useData()
  const L = latestSummary(draws, stats, status)
  const [win, setWin] = useState<Win>(52)
  const N = draws.length
  const slice = win === 'all' ? stats : stats.slice(-win)
  const recent52 = stats.slice(-52)
  const odd3 = oddDist(stats).find((r) => r.k === 3)!.actual
  const hot = sortByRecent20(status).slice(0, 5)
  const hotMax = hot[0]?.recent20_count || 1
  const gaps = sortByGap(status).slice(0, 5)
  const recent = [...draws].slice(-5).reverse()
  const first = draws[0]
  const collected = L.latest.collected_at ? L.latest.collected_at.replace('T', ' ').slice(0, 16).replace(/-/g, '.') : null

  return (
    <>
      <div className="title-row">
        <div className="stack">
          <h1 className="title">오늘의 로또 시황</h1>
          <p className="sub">
            {first.draw_no}회({fmtDate(first.draw_date)}) ~ {L.latest.draw_no}회({fmtDate(L.latest.draw_date)}) · 총 {fmtInt(N)}회차 · 매주 일요일 오전 자동 갱신
          </p>
        </div>
        {collected && <p className="sub">수집 기준 {collected}</p>}
      </div>

      <div className="two">
        <div className="col">
          <Card className="gap24" aria-labelledby="h-latest">
            <div className="card-head">
              <div className="card-head base" style={{ gap: 12, justifyContent: 'flex-start' }}>
                <h2 id="h-latest" className="h2">
                  {L.latest.draw_no}회 당첨번호
                </h2>
                <span className="sub">{fmtDate(L.latest.draw_date, 'withDay')} 추첨</span>
              </div>
              <Link to={`/draw?no=${L.latest.draw_no}`} className="link-btn">
                회차별 결과 보기 ›
              </Link>
            </div>
            <Balls nums={L.latest.nums} bonus={L.latest.bonus} size="lg" className="latest" />
            <div className="tiles">
              <div className="tile">
                <span className="row">
                  <span className="lbl">번호 합계</span>
                  <ZoneBadge zone={L.stats.sum_zone} />
                </span>
                <span className="base">
                  <span className="val">{L.latest.sum}</span>
                  {L.prev && (
                    <span className={`strong ${L.sumDiff >= 0 ? 'up' : 'down'}`} style={{ fontSize: 'var(--fs-15)' }}>
                      {L.sumDiff >= 0 ? '▲' : '▼'} {Math.abs(L.sumDiff)}
                    </span>
                  )}
                </span>
                <span className="lbl">
                  정상 범위 {BAND1.lo}~{BAND1.hi}
                  {L.prev && <> · 직전 {L.prev.sum}</>}
                </span>
              </div>
              <div className="tile">
                <span className="lbl">1등 당첨금 (1인당)</span>
                <span className="val">{L.latest.first_winners > 0 ? fmtEok(L.latest.first_prize_each) : '—'}</span>
                <span className="lbl">
                  {L.latest.first_winners}명 당첨{L.latest.first_winners > 0 && <> · 총 {fmtEok(L.firstTotal)}</>}
                </span>
              </div>
              <div className="tile">
                <span className="lbl">홀 : 짝</span>
                <span className="val">
                  {L.stats.odd_cnt} : {L.stats.even_cnt}
                </span>
                <span className="lbl">가장 흔한 3 : 3은 {fmtPct(odd3)}</span>
              </div>
              <div className="tile">
                <span className="lbl">연속번호</span>
                <span className="base">
                  <span className="val">{L.consecutive.length}쌍</span>
                  {L.consecutive.length > 0 && (
                    <span className="sub" style={{ fontWeight: 500 }}>
                      {L.consecutive.map((p) => p.join('·')).join(', ')}
                    </span>
                  )}
                </span>
                <span className="lbl">
                  저 : 고 = {L.stats.low_cnt} : {L.stats.high_cnt}
                </span>
              </div>
            </div>
          </Card>

          <Card aria-labelledby="h-trend">
            <div className="card-head">
              <div className="stack">
                <h2 id="h-trend" className="h2">
                  번호 합계 추이
                </h2>
                <p className="sub">
                  최근 52회 중 <b className="strong">{fmtPct(inBandRatio(recent52))}</b>가 정상 범위({BAND1.lo}~{BAND1.hi}) 안 · 전체 평균 {fmtPct(inBandRatio(stats))}
                </p>
              </div>
              <Segment<Win>
                label="기간 선택"
                value={win}
                onChange={setWin}
                options={[
                  { value: 13, label: '13회' },
                  { value: 26, label: '26회' },
                  { value: 52, label: '52회' },
                  { value: 'all', label: '전체' },
                ]}
              />
            </div>
            <SumTrend stats={slice} label={`${win === 'all' ? '전체' : `최근 ${win}회`} 번호 합계 추이와 정상 범위`} />
            <div className="chart-note">
              <span className="legend">
                <span>
                  <i className="sw line" style={{ background: '#13203b' }} />
                  회차별 합계
                </span>
                <span>
                  <i className="sw" style={{ background: '#e2e9f4' }} />
                  ±1σ 정상 범위
                </span>
                <span>
                  <i className="sw" style={{ background: '#f1f4f9', border: '1px solid #d5dbe4' }} />
                  ±2σ
                </span>
              </span>
              <span className="grow" />
              <span>각 회차는 독립 시행이라 추이로 다음 합계를 예측할 수는 없습니다.</span>
            </div>
          </Card>

          <Card aria-labelledby="h-heat">
            <div className="card-head end">
              <div className="stack">
                <h2 id="h-heat" className="h2">
                  번호 히트맵
                </h2>
                <p className="sub">
                  전체 {fmtInt(N)}회 출현 횟수 · 기대값 {expectedCount(N).toFixed(1)}회 대비 편차
                </p>
              </div>
              <HeatScale />
            </div>
            <Heatmap status={status} totalDraws={N} />
          </Card>
        </div>

        <aside className="col" aria-label="요약">
          <Card className="compact" aria-labelledby="h-hot">
            <div className="card-head base">
              <h2 id="h-hot" className="h2 small-h">
                HOT 번호
              </h2>
              <span className="small">최근 20회 · 기대 {expectedCount(20).toFixed(1)}회</span>
            </div>
            <div className="list">
              {hot.map((h, i) => (
                <div className="list-row" key={h.number}>
                  <span className="rank">{i + 1}</span>
                  <Ball n={h.number} size="sm" />
                  <span className="bar-track" aria-hidden="true">
                    <span className="bar-fill" style={{ width: `${Math.round((h.recent20_count / hotMax) * 100)}%` }} />
                  </span>
                  <span style={{ width: 48, textAlign: 'right', fontSize: 'var(--fs-17)', fontWeight: 700 }}>{h.recent20_count}회</span>
                  <span className="up" style={{ width: 52, textAlign: 'right', fontWeight: 700 }}>
                    {fmtSigned(h.recent20_count - expectedCount(20))}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="compact" aria-labelledby="h-gap">
            <div className="card-head base">
              <h2 id="h-gap" className="h2 small-h">
                장기 미출현
              </h2>
              <span className="small">현재 공백 / 평균 간격</span>
            </div>
            <div className="list">
              {gaps.map((g, i) => (
                <div className="list-row" key={g.number}>
                  <span className="rank">{i + 1}</span>
                  <Ball n={g.number} size="sm" />
                  <span className="stack" style={{ gap: 2, flexGrow: 1 }}>
                    <span style={{ fontSize: 'var(--fs-17)', fontWeight: 700 }}>{g.gap_now}회째</span>
                    <span className="small">
                      평균 {g.avg_gap.toFixed(1)}회 · 역대 최장 {g.max_gap}회
                    </span>
                  </span>
                  <span className="badge blue">평균의 {(g.gap_now / g.avg_gap).toFixed(1)}배</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="compact gap12" aria-labelledby="h-recent">
            <div className="card-head base">
              <h2 id="h-recent" className="h2 small-h">
                최근 회차
              </h2>
              <Link to="/draw" className="link-btn">
                전체 ›
              </Link>
            </div>
            <div className="list">
              {recent.map((r) => (
                <div className="list-row" key={r.draw_no}>
                  <span className="stack" style={{ gap: 0, width: 60, flexShrink: 0 }}>
                    <Link to={`/draw?no=${r.draw_no}`} style={{ fontWeight: 700 }}>
                      {r.draw_no}회
                    </Link>
                    <span className="small">{fmtDate(r.draw_date, 'mmdd')}</span>
                  </span>
                  <Balls nums={r.nums} size="xxs" className="tight" />
                  <span style={{ width: 36, textAlign: 'right', fontWeight: 700, marginLeft: 'auto' }}>{r.sum}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="compact" aria-labelledby="h-pat">
            <h2 id="h-pat" className="h2 small-h">
              패턴 한눈에
            </h2>
            <div className="stack" style={{ gap: 12 }}>
              <div className="card-head" style={{ flexWrap: 'nowrap' }}>
                <span className="sub">홀짝 3:3 (가장 흔함)</span>
                <span className="strong">{fmtPct(odd3)}</span>
              </div>
              <div className="card-head" style={{ flexWrap: 'nowrap' }}>
                <span className="sub">연속번호 1쌍 이상</span>
                <span className="strong">
                  {fmtPct(consecGe1Ratio(stats))} <span className="sub">/ {fmtPct(CONSEC_GE1_THEORY)}</span>
                </span>
              </div>
              <div className="card-head" style={{ flexWrap: 'nowrap' }}>
                <span className="sub">직전 회차 번호 재등장</span>
                <span className="strong">
                  {fmtPct(carryGe1Ratio(stats))} <span className="sub">/ 59.9%</span>
                </span>
              </div>
              <div className="card-head" style={{ flexWrap: 'nowrap' }}>
                <span className="sub">합계 ±1σ 안</span>
                <span className="strong">
                  {fmtPct(inBandRatio(stats))} <span className="sub">/ 약 68%</span>
                </span>
              </div>
            </div>
            <div className="card-head">
              <span className="small">실제 / 이론값</span>
              <Link to="/pattern" className="link-btn">
                패턴 자세히 ›
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </>
  )
}
