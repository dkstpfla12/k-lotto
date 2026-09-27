import { useState } from 'react'
import { useData } from '../data/DataContext'
import { checkMine, fmtDate, fmtInt, WIN_ANY_THEORY, type MineHit, type Rank } from '../data/calc'
import { Ball, Balls, Card, usePageTitle } from '../components/ui'

const RULES: Record<Rank, string> = { 1: '6개 일치', 2: '5개 + 보너스', 3: '5개 일치', 4: '4개 일치', 5: '3개 일치' }

function randomSix(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 6).sort((a, b) => a - b)
}

export default function Mine() {
  usePageTitle('내 번호')
  const { draws } = useData()
  const N = draws.length
  const latest = draws[N - 1].draw_no
  const [picked, setPicked] = useState<number[]>([])
  const [submitted, setSubmitted] = useState<number[] | null>(null)
  const [showAll5, setShowAll5] = useState(false)
  const [msg, setMsg] = useState('')

  const toggle = (n: number) => {
    setMsg('')
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length >= 6 ? p : [...p, n].sort((a, b) => a - b)))
  }
  const reset = () => {
    setPicked([])
    setSubmitted(null)
    setShowAll5(false)
    setMsg('')
  }
  const submit = () => {
    if (picked.length !== 6) {
      setMsg(`번호를 ${6 - picked.length}개 더 골라 주세요.`)
      return
    }
    setMsg('')
    setShowAll5(false)
    setSubmitted(picked)
  }

  const result = submitted ? checkMine(draws, submitted) : null
  const set = new Set(submitted ?? [])
  const total = result ? Object.values(result.counts).reduce((a, b) => a + b, 0) : 0
  const upper = result ? result.hits.filter((h) => h.rank <= 4) : []
  const fifth = result ? result.hits.filter((h) => h.rank === 5).reverse() : []
  const shown: MineHit[] = [...upper.slice().reverse(), ...(showAll5 ? fifth : fifth.slice(0, 3))]
  const cols = '110px 130px minmax(0, 1fr) 80px'

  return (
    <>
      <div className="stack">
        <h1 className="title">내 번호로 과거 확인</h1>
        <p className="lead-text">번호 6개를 고르면, 1회부터 매주 같은 번호를 샀을 때 몇 등을 몇 번 했을지 보여줍니다.</p>
      </div>

      <div className="two mine-split">
        <Card aria-labelledby="h-pick">
          <div className="card-head base">
            <h2 id="h-pick" className="h2">
              번호 선택
            </h2>
            <span className="strong" style={{ color: 'var(--brand)' }} aria-live="polite">
              {picked.length} / 6개 선택
            </span>
          </div>
          <div role="group" aria-label="번호 1~45" className="picks">
            {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
              const on = picked.includes(n)
              return (
                <button key={n} type="button" className="pick" aria-pressed={on} disabled={!on && picked.length >= 6} onClick={() => toggle(n)}>
                  {n}
                </button>
              )
            })}
          </div>
          <div className="chosen">
            <span className="lbl">선택한 번호</span>
            {picked.length === 0 ? <span className="small">아직 고른 번호가 없습니다</span> : picked.map((n) => <Ball key={n} n={n} size="md" />)}
          </div>
          {msg && (
            <p className="form-error" role="alert">
              {msg}
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="btn grow" onClick={reset}>
              초기화
            </button>
            <button
              type="button"
              className="btn grow"
              onClick={() => {
                setMsg('')
                setPicked(randomSix())
              }}
            >
              무작위 선택
            </button>
            <button type="button" className="btn primary grow2" onClick={submit}>
              결과 보기
            </button>
          </div>
        </Card>

        <div className="col">
          <Card aria-labelledby="h-result">
            <div className="stack">
              <h2 id="h-result" className="h2">
                1회 ~ {latest}회 결과
              </h2>
              <p className="sub">
                {fmtInt(N)}회 × 1,000원 = {fmtInt(N * 1000)}원을 썼을 때
                {submitted && <> · 선택 번호 {submitted.join(' · ')}</>}
              </p>
            </div>
            {result ? (
              <>
                <div className="tiles c5">
                  {([1, 2, 3, 4, 5] as Rank[]).map((r) => {
                    const c = result.counts[r]
                    return (
                      <div key={r} className={`tile ${c > 0 ? 'hit' : ''}`}>
                        <span className="lbl md">{r}등</span>
                        <span className={`val ${c > 0 ? 'up' : ''}`}>{c}회</span>
                        <span className="lbl">{RULES[r]}</span>
                      </div>
                    )
                  })}
                </div>
                <p>
                  총 <b>{total}회</b> 당첨, 그중 4등 이상은 <b>{upper.length}회</b>입니다. 한 회에 3개 이상 맞힐 확률은 이론상 약 {(WIN_ANY_THEORY * 100).toFixed(1)}%로,{' '}
                  {fmtInt(N)}회면 평균 약 {Math.round(N * WIN_ANY_THEORY)}회입니다.
                </p>
              </>
            ) : (
              <p className="sub">번호 6개를 고르고 결과 보기를 누르세요.</p>
            )}
          </Card>

          {result && (
            <Card className="gap16" aria-labelledby="h-hits">
              <h2 id="h-hits" className="h2 mid-h">
                당첨 회차
              </h2>
              {shown.length === 0 ? (
                <p className="sub">3개 이상 맞힌 회차가 없습니다.</p>
              ) : (
                <div className="scroll-x">
                  <div role="table" aria-label="당첨 회차" className="gtable">
                    <div role="row" className="head" style={{ gridTemplateColumns: cols }}>
                      <span role="columnheader">회차</span>
                      <span role="columnheader">추첨일</span>
                      <span role="columnheader">당첨번호 (맞힌 번호 강조)</span>
                      <span role="columnheader" className="r">
                        등수
                      </span>
                    </div>
                    {shown.map((h) => (
                      <div role="row" key={h.draw.draw_no} style={{ gridTemplateColumns: cols }}>
                        <span role="cell" className="b">
                          {h.draw.draw_no}회
                        </span>
                        <span role="cell" className="muted">
                          {fmtDate(h.draw.draw_date)}
                        </span>
                        <span role="cell" className="balls-cell">
                          <Balls nums={h.draw.nums} size="xs" className="g6" matched={set} />
                          <span className="plus" aria-hidden="true" style={{ color: 'var(--muted2)' }}>
                            +
                          </span>
                          <span className="sub">
                            <span className="sr-only">보너스 </span>
                            {h.draw.bonus}
                          </span>
                        </span>
                        <span role="cell" className="r">
                          <span className={`badge ${h.rank <= 4 ? 'red' : 'gray'}`}>{h.rank}등</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fifth.length > 3 && (
                <button type="button" className="link-btn" style={{ alignSelf: 'flex-end' }} onClick={() => setShowAll5((v) => !v)}>
                  {showAll5 ? '5등 접기 ‹' : `5등 ${fifth.length}회 모두 보기 ›`}
                </button>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
