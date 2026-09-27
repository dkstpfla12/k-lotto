import { useState } from 'react'
import { useData } from '../data/DataContext'
import { BAND1, BAND2, fmtInt, fmtPct, SUM_MEAN, SUM_SD, sumHistogram, sumSummary, ZONES, zoneCounts } from '../data/calc'
import { Callout, Card, Segment, Stat, usePageTitle } from '../components/ui'
import SumTrend, { TrendLegend } from '../components/charts/SumTrend'
import SumHist from '../components/charts/SumHist'

type Win = 13 | 52 | 104 | 'all'
const ZONE_RANGE: Record<string, string> = {
  '1σ 이내': `${BAND1.lo} ~ ${BAND1.hi}`,
  '1~2σ': `${BAND2.lo}~${BAND1.lo - 1} · ${BAND1.hi + 1}~${BAND2.hi}`,
  '2σ 초과': `${BAND2.lo - 1} 이하 · ${BAND2.hi + 1} 이상`,
}
const ZONE_THEORY: Record<string, string> = { '1σ 이내': '약 68%', '1~2σ': '약 27%', '2σ 초과': '약 5%' }

export default function Sum() {
  usePageTitle('회차별 합계')
  const { stats } = useData()
  const [win, setWin] = useState<Win>(104)
  const N = stats.length
  const S = sumSummary(stats)
  const slice = win === 'all' ? stats : stats.slice(-win)
  const zAll = zoneCounts(stats)
  const recent52 = stats.slice(-52)
  const z52 = zoneCounts(recent52)
  const hist = sumHistogram(stats)

  return (
    <>
      <div className="stack gap16">
        <h1 className="title">회차별 합계</h1>
        <Callout lead="당첨번호 6개의 합계는 종 모양(정규분포)에 가깝게 모입니다.">다만 매 회차는 독립이라 지난 합계로 다음 합계를 예측할 수는 없습니다.</Callout>
      </div>

      <div className="stat-cards">
        <Stat label="평균" value={S.mean.toFixed(1)} note={`이론값 ${SUM_MEAN}`} />
        <Stat label="중앙값" value={S.median} note={`최빈 합계 ${S.mode.sum} (${S.mode.count}회)`} />
        <Stat label="표준편차" value={S.sd.toFixed(1)} note={`이론값 약 ${SUM_SD.toFixed(2)}`} />
        <Stat label="역대 최고" value={S.max.sum} note={`${S.max.draw_no}회`} className="up" />
        <Stat label="역대 최저" value={S.min.sum} note={`${S.min.draw_no}회`} className="down" />
      </div>

      <Card aria-labelledby="h-trend">
        <div className="card-head">
          <div className="stack">
            <h2 id="h-trend" className="h2">
              회차별 합계 추이
            </h2>
            <p className="sub">
              {slice[0].draw_no}회 ~ {slice[slice.length - 1].draw_no}회
              {win === 'all' ? ` (전체 ${fmtInt(N)}회)` : ` (최근 ${win}회${win === 104 ? ', 약 2년' : win === 52 ? ', 약 1년' : ''})`}
            </p>
          </div>
          <Segment<Win>
            label="기간 선택"
            value={win}
            onChange={setWin}
            options={[
              { value: 13, label: '13회' },
              { value: 52, label: '52회' },
              { value: 104, label: '104회' },
              { value: 'all', label: '전체' },
            ]}
          />
        </div>
        <SumTrend stats={slice} height={310} label={`${win === 'all' ? '전체' : `최근 ${win}회`} 번호 합계 추이와 정상 범위`} />
        <div className="chart-note">
          <TrendLegend />
        </div>
      </Card>

      <div className="two sum-split">
        <Card aria-labelledby="h-hist">
          <div className="card-head end">
            <div className="stack">
              <h2 id="h-hist" className="h2">
                합계 분포
              </h2>
              <p className="sub">전체 {fmtInt(N)}회 · 10 단위 구간</p>
            </div>
            <div className="legend">
              <span>
                <i className="sw" style={{ background: '#13203b' }} />
                실제 회차 수
              </span>
              <span>
                <i className="sw line" style={{ background: '#d42f2c' }} />
                이론 정규분포
              </span>
            </div>
          </div>
          <SumHist bins={hist} label="번호 합계 10 단위 분포와 이론 정규분포" />
        </Card>

        <Card aria-labelledby="h-zone">
          <div className="stack">
            <h2 id="h-zone" className="h2">
              구간별 비율
            </h2>
            <p className="sub">정상 범위는 평균 ± 표준편차 기준</p>
          </div>
          <table className="tbl">
            <caption className="sr-only">합계 구간별 회차 수와 비율 (전체, 최근 52회, 이론)</caption>
            <thead>
              <tr>
                <th scope="col">구간</th>
                <th scope="col" className="r">
                  전체
                </th>
                <th scope="col" className="r">
                  최근 52회
                </th>
                <th scope="col" className="r">
                  이론
                </th>
              </tr>
            </thead>
            <tbody>
              {ZONES.map((z) => (
                <tr key={z}>
                  <td>
                    <span className="stack" style={{ gap: 0 }}>
                      <b>{z}</b>
                      <span className="small">{ZONE_RANGE[z]}</span>
                    </span>
                  </td>
                  <td className="r">
                    {fmtInt(zAll[z])}회
                    <br />
                    <b>{fmtPct(zAll[z] / N)}</b>
                  </td>
                  <td className="r">
                    {z52[z]}회
                    <br />
                    <b>{fmtPct(z52[z] / recent52.length)}</b>
                  </td>
                  <td className="r muted">{ZONE_THEORY[z]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">최근 52회 비율이 전체와 다른 것은 표본이 작아서 생기는 흔들림일 가능성이 큽니다.</p>
        </Card>
      </div>
    </>
  )
}
