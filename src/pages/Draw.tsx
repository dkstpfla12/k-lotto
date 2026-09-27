import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { consecutivePairs, fmtDate, fmtEok, fmtInt } from '../data/calc'
import { Balls, Card, Pager, ZoneBadge, usePageTitle } from '../components/ui'

const PAGE = 10

export default function Draw() {
  usePageTitle('회차 조회')
  const { draws, stats } = useData()
  const N = draws.length
  const latest = draws[N - 1].draw_no
  const [params, setParams] = useSearchParams()
  const qNo = Number(params.get('no'))
  const no = Number.isInteger(qNo) && qNo >= 1 && qNo <= latest ? qNo : latest
  const invalid = params.get('no') !== null && no !== qNo
  const draw = draws[no - 1]
  const st = stats[no - 1]
  const [input, setInput] = useState(String(no))
  const [err, setErr] = useState('')
  useEffect(() => {
    setInput(String(no))
    setErr('')
  }, [no])

  const go = (n: number) => setParams({ no: String(n) })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(input.trim())
    if (!Number.isInteger(n) || n < 1 || n > latest) {
      setErr(`1부터 ${latest} 사이의 회차를 입력하세요.`)
      return
    }
    go(n)
  }

  // 전체 목록: 최신순, 10개씩. 선택한 회차가 있는 페이지를 기본으로 보여준다.
  const totalPages = Math.ceil(N / PAGE)
  const pageOf = (d: number) => Math.floor((latest - d) / PAGE) + 1
  const [page, setPage] = useState(pageOf(no))
  useEffect(() => {
    setPage(pageOf(no))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [no])
  const rows = [...draws].reverse().slice((page - 1) * PAGE, page * PAGE)
  const pairs = consecutivePairs(draw.nums)
  const cols = '110px 140px minmax(0, 1fr) 90px 110px 160px'

  return (
    <>
      <div className="title-row">
        <div className="stack">
          <h1 className="title">회차 조회</h1>
          <p className="lead-text">
            1회({fmtDate(draws[0].draw_date)})부터 최신 회차까지 당첨번호와 당첨금을 확인합니다.
          </p>
        </div>
        <form className="stack tight" onSubmit={submit} role="search" aria-label="회차 검색">
          <div className="form-row">
            <label className="field">
              <span className="lbl">회차</span>
              <input type="text" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value)} aria-label="조회할 회차 번호" aria-invalid={!!err} />
            </label>
            <button type="submit" className="btn primary">
              조회
            </button>
          </div>
          {(err || invalid) && (
            <p className="form-error" role="alert">
              {err || `없는 회차라서 최신 ${latest}회를 보여줍니다.`}
            </p>
          )}
        </form>
      </div>

      <Card className="gap24" aria-labelledby="h-draw">
        <div className="card-head" style={{ flexWrap: 'nowrap' }}>
          <button type="button" className="btn sm" disabled={no <= 1} aria-label={no > 1 ? `이전 회차 ${no - 1}회` : '이전 회차 없음'} onClick={() => go(no - 1)}>
            ‹ {no > 1 ? `${no - 1}회` : '이전'}
          </button>
          <div className="stack tight" style={{ alignItems: 'center', textAlign: 'center' }}>
            <h2 id="h-draw" className="h2" style={{ fontSize: 28 }}>
              {draw.draw_no}회 당첨결과
            </h2>
            <span className="sub">{fmtDate(draw.draw_date, 'withDay')} 추첨</span>
          </div>
          <button type="button" className="btn sm" disabled={no >= latest} aria-label={no < latest ? `다음 회차 ${no + 1}회` : '다음 회차 없음'} onClick={() => go(no + 1)}>
            {no < latest ? `${no + 1}회` : '다음'} ›
          </button>
        </div>
        <Balls nums={draw.nums} bonus={draw.bonus} size="xl" className="center latest" />
        <div className="tiles">
          <div className="tile">
            <span className="lbl">번호 합계</span>
            <span className="base">
              <span className="val md">{draw.sum}</span>
              <ZoneBadge zone={st.sum_zone} />
            </span>
          </div>
          <div className="tile">
            <span className="lbl">홀 : 짝</span>
            <span className="val md">
              {st.odd_cnt} : {st.even_cnt}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">저 : 고</span>
            <span className="val md">
              {st.low_cnt} : {st.high_cnt}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">연속번호</span>
            <span className="base">
              <span className="val md">{pairs.length}쌍</span>
              {pairs.length > 0 && <span className="sub">{pairs.map((p) => p.join('·')).join(', ')}</span>}
            </span>
          </div>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <div className="card-head base">
            <h3 className="h3">등수별 당첨금</h3>
            <span className="sub">총판매액 {fmtInt(draw.total_sales)}원</span>
          </div>
          <div className="scroll-x">
            <table className="tbl pad16" style={{ minWidth: 560 }}>
              <caption className="sr-only">{draw.draw_no}회 등수별 당첨자 수와 당첨금 (현재 1·2등만 제공)</caption>
              <thead>
                <tr>
                  <th scope="col">등수</th>
                  <th scope="col">조건</th>
                  <th scope="col" className="r">
                    당첨자 수
                  </th>
                  <th scope="col" className="r">
                    1인당 당첨금
                  </th>
                  <th scope="col" className="r">
                    등수별 총 당첨금
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" className="up">
                    1등
                  </th>
                  <td className="muted">6개 일치</td>
                  <td className="r">{fmtInt(draw.first_winners)}명</td>
                  <td className="r b">{draw.first_winners > 0 ? `${fmtInt(draw.first_prize_each)}원` : '—'}</td>
                  <td className="r">{draw.first_winners > 0 ? `${fmtInt(draw.first_winners * draw.first_prize_each)}원` : '—'}</td>
                </tr>
                <tr>
                  <th scope="row">2등</th>
                  <td className="muted">5개 + 보너스</td>
                  <td className="r">{fmtInt(draw.second_winners)}명</td>
                  <td className="r b">{draw.second_winners > 0 ? `${fmtInt(draw.second_prize_each)}원` : '—'}</td>
                  <td className="r">{draw.second_winners > 0 ? `${fmtInt(draw.second_winners * draw.second_prize_each)}원` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small">3~5등 당첨 정보는 수집 항목에 추가되는 대로 표시합니다.</p>
        </div>
      </Card>

      <Card className="gap16" aria-labelledby="h-all">
        <div className="card-head base">
          <h2 id="h-all" className="h2">
            전체 회차
          </h2>
          <span className="sub">총 {fmtInt(N)}건 · 최신순</span>
        </div>
        <div className="scroll-x">
          <div role="table" aria-label="전체 회차" className="gtable wide">
            <div role="row" className="head" style={{ gridTemplateColumns: cols }}>
              <span role="columnheader">회차</span>
              <span role="columnheader">추첨일</span>
              <span role="columnheader">당첨번호 + 보너스</span>
              <span role="columnheader" className="r">
                합계
              </span>
              <span role="columnheader" className="r">
                1등
              </span>
              <span role="columnheader" className="r">
                1인당 1등 당첨금
              </span>
            </div>
            {rows.map((r) => (
              <div role="row" key={r.draw_no} className={r.draw_no === no ? 'selected' : ''} style={{ gridTemplateColumns: cols }}>
                <Link role="cell" to={`/draw?no=${r.draw_no}`} aria-current={r.draw_no === no ? 'true' : undefined}>
                  {r.draw_no}회
                </Link>
                <span role="cell" className="muted">
                  {fmtDate(r.draw_date)}
                </span>
                <span role="cell" className="balls-cell">
                  <Balls nums={r.nums} bonus={r.bonus} size="xs" className="g6 tight" />
                </span>
                <span role="cell" className="r b">
                  {r.sum}
                </span>
                <span role="cell" className="r">
                  {fmtInt(r.first_winners)}명
                </span>
                <span role="cell" className="r">
                  {r.first_winners > 0 ? fmtEok(r.first_prize_each) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Pager page={page} total={totalPages} onChange={setPage} />
      </Card>
    </>
  )
}
