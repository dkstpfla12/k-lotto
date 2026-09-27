import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDataState } from '../data/DataContext'
import { fmtDate, fmtEok, fmtInt, latestSummary } from '../data/calc'
import type { LottoData } from '../data/types'

export const MENU = [
  { to: '/sum', label: '회차별 합계' },
  { to: '/freq', label: '번호별 빈도' },
  { to: '/gap', label: '미출현 분석' },
  { to: '/pattern', label: '패턴 분석' },
  { to: '/mine', label: '내 번호 분석' },
  { to: '/pick', label: '내 번호 추천' },
  { to: '/draw', label: '회차별 조회' },
]

function SearchIcon({ color = '#4a5361', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function SearchForm({ id, latestNo, onDone }: { id: string; latestNo: number | null; onDone?: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(q.trim())
    if (!Number.isInteger(n) || n < 1 || (latestNo !== null && n > latestNo)) return
    setQ('')
    onDone?.()
    navigate(`/draw?no=${n}`)
  }
  return (
    <form className="search" role="search" onSubmit={submit}>
      <SearchIcon />
      <label htmlFor={id} className="sr-only">
        회차 검색
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="회차 번호로 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-describedby={`${id}-hint`}
      />
      <span id={`${id}-hint`} className="sr-only">
        1부터 {latestNo ?? ''} 사이의 회차 번호를 입력하고 Enter를 누르세요
      </span>
    </form>
  )
}

function Ticker({ data }: { data: LottoData | null }) {
  if (!data) return <div className="ticker" aria-hidden="true" />
  const L = latestSummary(data.draws, data.stats, data.status)
  const diffCls = L.sumDiff >= 0 ? 'up' : 'down'
  const arrow = (v: number) => (v >= 0 ? '▲' : '▼')
  const sales = L.salesChangePct
  return (
    <div className="ticker" aria-label="최신 회차 요약">
      <span className="item">
        <span className="k">
          <span className="d">{L.latest.draw_no}회 </span>합계
        </span>
        <span className="v">{L.latest.sum}</span>
        {L.prev && (
          <span className={diffCls}>
            {arrow(L.sumDiff)}
            <span className="d"> </span>
            {Math.abs(L.sumDiff)}
          </span>
        )}
      </span>
      <span className="item">
        <span className="k">
          <span className="d">총</span>판매액
        </span>
        <span className="v">{fmtEok(L.latest.total_sales, 0)}</span>
        {sales !== null && (
          <span className={sales >= 0 ? 'up' : 'down'}>
            {arrow(sales)}
            <span className="d"> </span>
            {Math.abs(sales).toFixed(1)}%
          </span>
        )}
      </span>
      <span className="item">
        <span className="k">1등</span>
        <span className="v">
          {L.latest.first_winners}명<span className="d"> · 각 {fmtEok(L.latest.first_prize_each)}</span>
        </span>
      </span>
      <span className="item">
        <span className="k">최장 미출현</span>
        <span className="v">
          {L.gap.number}번 {L.gap.gap_now}회<span className="d">째</span>
        </span>
      </span>
      <span className="item">
        <span className="k">최근 20회 최다</span>
        <span className="v">
          {L.hot.number}번 {L.hot.recent20_count}회
        </span>
      </span>
      <span className="spacer" />
      <span className="item d">
        <span className="k">
          다음 추첨 {L.nextDrawNo}회 · {fmtDate(L.nextDrawDate, 'mmddDay')}
        </span>
      </span>
    </div>
  )
}

export default function Layout() {
  const { state, retry } = useDataState()
  const data = state.status === 'ready' ? state.data : null
  const latestNo = data ? data.draws[data.draws.length - 1].draw_no : null
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [loc.pathname, loc.search])

  return (
    <div className="site">
      <a href="#main" className="skip-link">
        본문으로 바로가기
      </a>
      <header className="header">
        <Link to="/" className="logo" title="홈으로">
          <span className="logo-mark" aria-hidden="true">
            K
          </span>
          <span className="logo-text">K 로또 통계</span>
        </Link>
        <nav aria-label="주 메뉴" className="nav">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <SearchForm id="q-desktop" latestNo={latestNo} />
        <button
          type="button"
          className="icon-btn search-btn"
          aria-label="회차 검색"
          aria-expanded={searchOpen}
          aria-controls="mobile-search"
          onClick={() => {
            setSearchOpen((v) => !v)
            setMenuOpen(false)
          }}
        >
          <SearchIcon color="#13203b" size={22} />
        </button>
        <button
          type="button"
          className="icon-btn menu-btn"
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => {
            setMenuOpen((v) => !v)
            setSearchOpen(false)
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#13203b" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>
      {searchOpen && (
        <div id="mobile-search" className="mobile-search">
          <SearchForm id="q-mobile" latestNo={latestNo} onDone={() => setSearchOpen(false)} />
        </div>
      )}
      {menuOpen && (
        <nav id="mobile-menu" className="drawer" aria-label="전체 메뉴">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to}>
              {m.label}
            </NavLink>
          ))}
        </nav>
      )}
      <nav aria-label="주 메뉴 (모바일)" className="nav-row">
        {MENU.map((m) => (
          <NavLink key={m.to} to={m.to}>
            {m.label}
          </NavLink>
        ))}
      </nav>
      <Ticker data={data} />

      <main id="main" className="page" tabIndex={-1}>
        {state.status === 'loading' && (
          <div className="state" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p className="sub">데이터를 불러오는 중입니다…</p>
          </div>
        )}
        {state.status === 'error' && (
          <div className="state" role="alert">
            <h1 className="h2">데이터를 불러오지 못했습니다</h1>
            <p className="sub">{state.message}</p>
            <p className="small">네트워크 상태를 확인한 뒤 다시 시도해 주세요. 데이터는 Google 시트 게시 CSV에서 읽습니다.</p>
            <button type="button" className="btn primary" onClick={retry}>
              다시 시도
            </button>
          </div>
        )}
        {state.status === 'ready' && <Outlet />}
      </main>

      <footer className="footer">
        <span className="lead">과거 통계일 뿐, 다음 회차 당첨 확률과는 무관합니다. 매 회차 추첨은 서로 독립입니다.</span>
        <span>
          데이터: 동행복권 추첨결과 · 오락·통계 목적이며 구매를 권유하지 않습니다.
          {data && <> · 총 {fmtInt(data.draws.length)}회차</>}
        </span>
        <span>UI: KRDS(대한민국 디지털 정부 디자인 시스템) 디자인 토큰 · Pretendard GOV 서체 활용</span>
      </footer>
    </div>
  )
}
