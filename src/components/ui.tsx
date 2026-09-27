import { useEffect, type ReactNode } from 'react'
import type { SumZone } from '../data/types'

// ── 번호 공 (동행복권 공식 색) ──────────────────────────
const BALL: [number, string][] = [
  [10, '#fbc400'],
  [20, '#69c8f2'],
  [30, '#ff7272'],
  [40, '#aaaaaa'],
  [45, '#b0d840'],
]
export function ballColor(n: number): string {
  return BALL.find(([hi]) => n <= hi)?.[1] ?? '#aaaaaa'
}
export type BallSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs' | 'xxs' | 'set' | 'mini'

export function Ball({ n, size = 'md', hit }: { n: number; size?: BallSize; hit?: boolean | undefined }) {
  // hit === false → 맞히지 못한 번호(흰 공), hit === true → 맞힌 번호(테두리 강조), undefined → 일반
  const cls = ['ball', size, hit === false ? 'miss' : '', hit === true ? 'hit' : ''].filter(Boolean).join(' ')
  const style = hit === false ? undefined : { background: ballColor(n), ...(hit ? { color: '#fff', borderColor: ballColor(n) } : {}) }
  return (
    <span className={cls} style={style}>
      {n}
    </span>
  )
}

export function Balls({
  nums,
  bonus,
  size = 'md',
  className = '',
  matched,
}: {
  nums: number[]
  bonus?: number
  size?: BallSize
  className?: string
  matched?: Set<number>
}) {
  return (
    <span className={`balls ${size === 'xl' ? 'xl' : ''} ${className}`}>
      {nums.map((n) => (
        <Ball key={n} n={n} size={size} hit={matched ? matched.has(n) : undefined} />
      ))}
      {bonus !== undefined && (
        <>
          <span className="plus" aria-hidden="true">
            +
          </span>
          <span className="sr-only">보너스</span>
          <Ball n={bonus} size={size} />
        </>
      )}
    </span>
  )
}

// ── 구간 배지 ───────────────────────────────────────────
export function ZoneBadge({ zone }: { zone: SumZone }) {
  const cls = zone === '1σ 이내' ? 'zone-1' : zone === '1~2σ' ? 'zone-2' : 'zone-3'
  return <span className={`badge ${cls}`}>{zone}</span>
}

// ── 세그먼트 버튼 (KRDS radio-chip 구조: role=group + aria-pressed) ──
export function Segment<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div role="group" aria-label={label} className={`seg ${className}`}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── 페이지네이션 (KRDS pagination 구조) ─────────────────
export function Pager({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  const items: (number | '…')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) items.push(i)
  } else {
    const start = Math.max(1, Math.min(page - 2, total - 4))
    const end = Math.min(total, start + 4)
    if (start > 1) {
      items.push(1)
      if (start > 2) items.push('…')
    }
    for (let i = start; i <= end; i++) items.push(i)
    if (end < total) {
      if (end < total - 1) items.push('…')
      items.push(total)
    }
  }
  return (
    <nav aria-label="페이지 이동" className="pager">
      <button type="button" className="arrow" aria-label="이전 페이지" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`d${i}`} className="dots" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-current={it === page ? 'page' : undefined}
            aria-label={`${it}페이지`}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        ),
      )}
      <button type="button" className="arrow" aria-label="다음 페이지" disabled={page >= total} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </nav>
  )
}

// ── 기타 ────────────────────────────────────────────────
export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string; 'aria-labelledby'?: string }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {children}
    </section>
  )
}

export function Stat({ label, value, note, className = '' }: { label: string; value: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className="stat">
      <span className="lbl">{label}</span>
      <span className={`val ${className}`}>{value}</span>
      {note !== undefined && <span className="note">{note}</span>}
    </div>
  )
}

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · K 로또 통계` : 'K 로또 통계'
  }, [title])
}

export function Disclaimer() {
  return <p className="sub">과거 통계일 뿐, 다음 회차 당첨 확률과는 무관합니다. 매 회차 추첨은 서로 독립입니다.</p>
}

/** 안내 박스 (WEB_SPEC 7.2): 첫 문장은 굵게(lead), 나머지는 보통 굵기 */
export function Callout({ lead, children }: { lead: string; children?: ReactNode }) {
  return (
    <div role="note" aria-label="안내" className="callout">
      <span aria-hidden="true" className="callout-icon">
        !
      </span>
      <p>
        <b>{lead}</b>
        {children !== undefined && <> {children}</>}
      </p>
    </div>
  )
}
