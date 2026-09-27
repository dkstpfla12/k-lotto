import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { BAND1, BAND2, fmtInt, fmtPct, inBandRatio, SUM_MEAN, type Period } from '../data/calc'
import {
  DEFAULT_CONFIG,
  describeSet,
  freqPool,
  gapPool,
  generateSets,
  MODE_LABEL,
  parseNumberList,
  PERIOD_LABEL,
  recordText,
  SUM_MAX,
  SUM_MIN,
  TOTAL_COMBOS,
  validateConfig,
  type Basis,
  type OddEven,
  type PickConfig,
  type PickMode,
} from '../data/pick'
import { Ball, Callout, Card, Segment, usePageTitle } from '../components/ui'

type Quick = '1' | '2' | 'custom'
const LABELS = ['A', 'B', 'C', 'D', 'E']

export default function Pick() {
  usePageTitle('내 번호 추천')
  const data = useData()
  const { draws, stats, status } = data
  const N = draws.length
  const [cfg, setCfg] = useState<PickConfig>(DEFAULT_CONFIG)
  const [quick, setQuick] = useState<Quick>('1')
  const [includeText, setIncludeText] = useState('')
  const [excludeText, setExcludeText] = useState('')
  const [result, setResult] = useState<{ sets: number[][]; summary: string } | null>(null)
  const [genError, setGenError] = useState('')
  const [copied, setCopied] = useState<number | null>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)

  const inc = parseNumberList(includeText)
  const exc = parseNumberList(excludeText)
  const full: PickConfig = { ...cfg, include: inc.nums, exclude: exc.nums }
  const problems = useMemo(() => {
    const m: string[] = []
    if (inc.bad.length) m.push(`꼭 넣을 번호는 1~45 사이 숫자만 입력하세요: ${inc.bad.join(', ')}`)
    if (exc.bad.length) m.push(`뺄 번호는 1~45 사이 숫자만 입력하세요: ${exc.bad.join(', ')}`)
    return [...m, ...validateConfig(full, data)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeText, excludeText, cfg, data])

  const set = <K extends keyof PickConfig>(k: K, v: PickConfig[K]) => setCfg((c) => ({ ...c, [k]: v }))
  const setSumRange = (lo: number, hi: number, q: Quick) => {
    setCfg((c) => ({ ...c, sumMin: lo, sumMax: hi }))
    setQuick(q)
  }
  const onSumInput = (k: 'sumMin' | 'sumMax') => (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (e.target.value === '' || Number.isNaN(v)) return
    set(k, v)
    setQuick('custom')
  }
  const onRange = (k: 'sumMin' | 'sumMax') => (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setCfg((c) => (k === 'sumMin' ? { ...c, sumMin: Math.min(v, c.sumMax) } : { ...c, sumMax: Math.max(v, c.sumMin) }))
    setQuick('custom')
  }

  const detail = (c: PickConfig) =>
    c.mode === 'sum'
      ? `${c.sumMin}~${c.sumMax}`
      : c.mode === 'freq'
        ? `${PERIOD_LABEL[String(c.freqPeriod)]} ${c.freqBasis === 'hot' ? '많이' : '적게'} 나온 ${c.freqPool}개 후보`
        : c.mode === 'gap'
          ? `공백 ${c.gapMin}회 이상 ${c.gapCount}개 포함`
          : ''
  const generate = () => {
    if (problems.length) return
    const r = generateSets(full, data)
    if (r.error) {
      setGenError(r.error)
      setResult(null)
      return
    }
    setGenError('')
    setResult({ sets: r.sets, summary: [MODE_LABEL[full.mode].replace(' 추천', ''), detail(full), `${full.sets}세트`].filter(Boolean).join(' · ') })
    setCopied(null)
    setTimeout(() => resultRef.current?.focus(), 0)
  }
  const reset = () => {
    setCfg(DEFAULT_CONFIG)
    setQuick('1')
    setIncludeText('')
    setExcludeText('')
    setResult(null)
    setGenError('')
  }
  const copy = async (i: number, nums: number[]) => {
    try {
      await navigator.clipboard.writeText(nums.join(', '))
      setCopied(i)
    } catch {
      setCopied(null)
    }
  }
  useEffect(() => {
    if (copied === null) return
    const t = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const pct = (v: number) => `${((v - SUM_MIN) / (SUM_MAX - SUM_MIN)) * 100}%`
  const freqExample = freqPool(status, 'all', 'hot', 8)
  const gapExample = gapPool(status, 10)
  const curFreqPool = cfg.mode === 'freq' ? freqPool(status, cfg.freqPeriod, cfg.freqBasis, cfg.freqPool) : []
  const curGapPool = cfg.mode === 'gap' ? gapPool(status, cfg.gapMin) : []

  return (
    <>
      <div className="stack gap16">
        <h1 className="title">내 번호 추천</h1>
        <Callout lead="원하는 조건에 맞는 번호 조합을 만들어 드립니다.">어떤 조건으로 만들어도 모든 조합의 당첨 확률은 1/{fmtInt(TOTAL_COMBOS)}으로 같습니다.</Callout>
      </div>

      <div className="two pick-split">
        <Card className="gap28" aria-labelledby="cond-title">
          <h2 id="cond-title" className="h2">
            조건 설정
          </h2>

          <div className="stack">
            <label htmlFor="pick-mode" className="lbl-strong">
              추천 방식
            </label>
            <div className="select-wrap">
              <select id="pick-mode" className="select primary" value={cfg.mode} onChange={(e) => set('mode', e.target.value as PickMode)}>
                {(Object.keys(MODE_LABEL) as PickMode[]).map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cfg.mode === 'sum' && (
            <fieldset className="fs">
              <legend>합계 기반 조건</legend>
              <div className="stack">
                <span className="lbl-mid">합계 범위</span>
                <div className="form-row">
                  <label className="field grow">
                    <span className="lbl small">최소</span>
                    <input type="text" inputMode="numeric" value={cfg.sumMin} onChange={onSumInput('sumMin')} aria-label="합계 최소" />
                  </label>
                  <span className="sub" style={{ fontSize: 'var(--fs-17)' }}>
                    ~
                  </span>
                  <label className="field grow">
                    <span className="lbl small">최대</span>
                    <input type="text" inputMode="numeric" value={cfg.sumMax} onChange={onSumInput('sumMax')} aria-label="합계 최대" />
                  </label>
                </div>
                <div className="dual" style={{ ['--lo' as string]: pct(cfg.sumMin), ['--hi' as string]: pct(cfg.sumMax) }}>
                  <div className="dual-track" aria-hidden="true" />
                  <div className="dual-fill" aria-hidden="true" />
                  <input type="range" min={SUM_MIN} max={SUM_MAX} value={cfg.sumMin} onChange={onRange('sumMin')} aria-label="합계 최소 슬라이더" />
                  <input type="range" min={SUM_MIN} max={SUM_MAX} value={cfg.sumMax} onChange={onRange('sumMax')} aria-label="합계 최대 슬라이더" />
                </div>
                <div className="card-head small" style={{ flexWrap: 'nowrap' }}>
                  <span>{SUM_MIN}</span>
                  <span>평균 {SUM_MEAN}</span>
                  <span>{SUM_MAX}</span>
                </div>
              </div>
              <div role="group" aria-label="범위 빠른 선택" className="pills">
                <button type="button" className="pill" aria-pressed={quick === '1'} onClick={() => setSumRange(BAND1.lo, BAND1.hi, '1')}>
                  ±1σ {BAND1.lo}~{BAND1.hi}
                </button>
                <button type="button" className="pill" aria-pressed={quick === '2'} onClick={() => setSumRange(BAND2.lo, BAND2.hi, '2')}>
                  ±2σ {BAND2.lo}~{BAND2.hi}
                </button>
                <button type="button" className="pill" aria-pressed={quick === 'custom'} onClick={() => setQuick('custom')}>
                  직접 입력
                </button>
              </div>
              <p className="small">
                {quick === '1' && <>전체 조합의 약 68%가 이 범위에 들어갑니다. 과거 당첨번호는 {fmtPct(inBandRatio(stats))}였습니다.</>}
                {quick === '2' && <>전체 조합의 약 95%가 이 범위에 들어갑니다.</>}
                {quick === 'custom' && <>최소·최대를 직접 입력하거나 슬라이더를 움직이세요 ({SUM_MIN}~{SUM_MAX}).</>}
              </p>
            </fieldset>
          )}

          {cfg.mode === 'freq' && (
            <fieldset className="fs">
              <legend>빈도 기반 조건</legend>
              <label className="stack tight">
                <span className="lbl-mid">기간</span>
                <div className="select-wrap">
                  <select className="select" value={String(cfg.freqPeriod)} onChange={(e) => set('freqPeriod', (e.target.value === 'all' ? 'all' : Number(e.target.value)) as Period)}>
                    <option value="all">전체 {fmtInt(N)}회</option>
                    <option value="20">최근 20회</option>
                    <option value="10">최근 10회</option>
                    <option value="5">최근 5회</option>
                  </select>
                </div>
              </label>
              <div className="stack tight">
                <span className="lbl-mid" id="basis-lbl">
                  기준
                </span>
                <Segment<Basis>
                  label="기준"
                  value={cfg.freqBasis}
                  onChange={(v) => set('freqBasis', v)}
                  className="c2"
                  options={[
                    { value: 'hot', label: '많이 나온 번호' },
                    { value: 'cold', label: '적게 나온 번호' },
                  ]}
                />
              </div>
              <label className="stack tight">
                <span className="lbl-mid">
                  후보 번호 수 <b>{cfg.freqPool}개</b> <span className="small">(10~30)</span>
                </span>
                <input type="range" className="single" min={10} max={30} value={cfg.freqPool} onChange={(e) => set('freqPool', Number(e.target.value))} />
              </label>
              <div className="pool">
                <span className="small">현재 후보</span>
                {curFreqPool.map((n) => (
                  <Ball key={n} n={n} size="xxs" />
                ))}
              </div>
            </fieldset>
          )}

          {cfg.mode === 'gap' && (
            <fieldset className="fs">
              <legend>미출현 기반 조건</legend>
              <label className="stack tight">
                <span className="lbl-mid">최소 공백 (N회 이상)</span>
                <span className="field" style={{ width: 160 }}>
                  <input
                    type="number"
                    min={1}
                    max={74}
                    value={cfg.gapMin}
                    onChange={(e) => set('gapMin', e.target.value === '' ? 0 : Number(e.target.value))}
                    aria-label="최소 공백 회차"
                    style={{ width: 80 }}
                  />
                  <span className="lbl">회 이상</span>
                </span>
              </label>
              <div className="stack tight">
                <span className="lbl-mid">포함 개수</span>
                <Segment<1 | 2 | 3>
                  label="포함 개수"
                  value={cfg.gapCount}
                  onChange={(v) => set('gapCount', v)}
                  className="c3"
                  options={[
                    { value: 1, label: '1개' },
                    { value: 2, label: '2개' },
                    { value: 3, label: '3개' },
                  ]}
                />
              </div>
              <div className="pool">
                <span className="small">공백 {cfg.gapMin}회 이상 {curGapPool.length}개</span>
                {curGapPool.map((n) => (
                  <Ball key={n} n={n} size="xxs" />
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="fs plain">
            <legend>공통 옵션</legend>
            <label className="stack tight">
              <span className="lbl-mid">
                꼭 넣을 번호 <span className="sub" style={{ fontWeight: 400 }}>(최대 5개)</span>
              </span>
              <input type="text" className="input" placeholder="예: 7, 23" value={includeText} onChange={(e) => setIncludeText(e.target.value)} />
            </label>
            <label className="stack tight">
              <span className="lbl-mid">뺄 번호</span>
              <input type="text" className="input" placeholder="예: 1, 45" value={excludeText} onChange={(e) => setExcludeText(e.target.value)} />
            </label>
            <label className="stack tight">
              <span className="lbl-mid">홀 : 짝 비율</span>
              <div className="select-wrap">
                <select className="select" value={cfg.oddEven} onChange={(e) => set('oddEven', e.target.value as OddEven)}>
                  <option value="any">제한 없음</option>
                  <option value="33">3 : 3</option>
                  <option value="24">2 : 4 ~ 4 : 2</option>
                </select>
              </div>
            </label>
            <div className="stack tight">
              <span className="lbl-mid">만들 세트 수</span>
              <Segment<1 | 3 | 5>
                label="만들 세트 수"
                value={cfg.sets}
                onChange={(v) => set('sets', v)}
                className="c3"
                options={[
                  { value: 1, label: '1세트' },
                  { value: 3, label: '3세트' },
                  { value: 5, label: '5세트' },
                ]}
              />
            </div>
          </fieldset>

          {problems.length > 0 && (
            <ul className="problems" role="alert" aria-label="조건 확인">
              {problems.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          <div className="btn-row">
            <button type="button" className="btn tall grow" onClick={reset}>
              초기화
            </button>
            <button type="button" className="btn tall primary grow2" onClick={generate} disabled={problems.length > 0} aria-disabled={problems.length > 0}>
              번호 만들기
            </button>
          </div>
        </Card>

        <div className="col gap16">
          <div className="card-head">
            <div className="card-head base" style={{ gap: 12, justifyContent: 'flex-start' }}>
              <h2 className="h2" tabIndex={-1} ref={resultRef}>
                추천 결과
              </h2>
              {result && <span className="sub">{result.summary}</span>}
            </div>
            <button type="button" className="btn sm" onClick={generate} disabled={!result || problems.length > 0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6, verticalAlign: -3 }}>
                <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              다시 만들기
            </button>
          </div>
          <div aria-live="polite">
            {genError && (
              <p className="problems" role="alert">
                {genError}
              </p>
            )}
            {!result && !genError && (
              <div className="state">
                <p className="sub">조건을 정하고 &quot;번호 만들기&quot;를 누르면 여기에 결과가 나옵니다.</p>
              </div>
            )}
          </div>
          {result &&
            result.sets.map((nums, i) => {
              const info = describeSet(nums, draws)
              return (
                <article key={i} className="result" aria-label={`${LABELS[i]} 세트`}>
                  <div className="card-head">
                    <div className="result-main">
                      <span className="set-label" aria-hidden="true">
                        {LABELS[i]}
                      </span>
                      <span className="balls g10">
                        {info.nums.map((n) => (
                          <Ball key={n} n={n} size="set" />
                        ))}
                      </span>
                    </div>
                    <div className="btn-row">
                      <button type="button" className="btn sm" onClick={() => copy(i, info.nums)} aria-label={`${LABELS[i]} 세트 번호 복사`}>
                        {copied === i ? '복사됨' : '복사'}
                      </button>
                      <Link to={`/mine?nums=${info.nums.join(',')}`} className="btn sm outline" aria-label={`${LABELS[i]} 세트로 내 번호 분석`}>
                        내 번호 분석 ›
                      </Link>
                    </div>
                  </div>
                  <div className="tags">
                    <span className="tag">합계 {info.sum}</span>
                    <span className="tag">
                      홀 : 짝 {info.odd} : {info.even}
                    </span>
                    <span className="tag">
                      저 : 고 {info.low} : {info.high}
                    </span>
                    <span className="tag">연속번호 {info.consecutive.length ? `${info.consecutive.length}쌍` : '없음'}</span>
                  </div>
                  <div className="result-foot">
                    <span className="sub">과거 {fmtInt(N)}회에 샀다면</span>
                    <b>{recordText(info.counts)}</b>
                    <span className="sub">· {info.firstMatch ? `과거 1등 조합과 겹침 (${info.firstMatch}회)` : '과거 1등 조합과 겹침 없음'}</span>
                  </div>
                </article>
              )
            })}
          <span className="sr-only" aria-live="polite">
            {copied !== null ? `${LABELS[copied]} 세트 번호를 복사했습니다` : ''}
          </span>
          <p className="note-box">
            이 기능은 조건에 맞는 조합을 무작위로 골라 주는 재미 기능입니다. 당첨을 보장하거나 당첨 확률을 높이지 않으며, 모든 조합의 1등 당첨 확률은 1/{fmtInt(TOTAL_COMBOS)}으로 같습니다.
          </p>
        </div>
      </div>

      <Card aria-labelledby="h-modes">
        <div className="stack">
          <h2 id="h-modes" className="h2">
            추천 방식별 조건 필드
          </h2>
          <p className="sub">드롭다운에서 추천 방식을 바꾸면 위 &quot;조건&quot; 영역이 아래 구성으로 바뀝니다. 공통 옵션은 모든 방식에 함께 적용됩니다.</p>
        </div>
        <div className="info-cards">
          <ModeCard active={cfg.mode === 'random'} title="무작위 선택" desc="추가 조건 없이 1~45에서 6개를 고르게 뽑습니다.">
            <p className="small">공통 옵션(넣을 번호, 뺄 번호, 홀짝)만 적용</p>
          </ModeCard>
          <ModeCard active={cfg.mode === 'sum'} title="합계 기반 추천" desc="6개 합계가 지정한 범위 안인 조합만 만듭니다.">
            <ul>
              <li>합계 범위 (최소 ~ 최대)</li>
              <li>
                빠른 선택: ±1σ {BAND1.lo}~{BAND1.hi}, ±2σ {BAND2.lo}~{BAND2.hi}
              </li>
            </ul>
          </ModeCard>
          <ModeCard active={cfg.mode === 'freq'} title="빈도 기반 추천" desc="많이(또는 적게) 나온 번호 후보 안에서 6개를 뽑습니다.">
            <ul>
              <li>기간: 전체 · 최근 20 · 10 · 5회</li>
              <li>기준: 많이 나온 / 적게 나온</li>
              <li>후보 번호 수: 10 ~ 30개 (기본 15)</li>
            </ul>
            <div className="pool">
              <span className="small">예: 전체 · 많이 · 상위</span>
              {freqExample.map((n) => (
                <Ball key={n} n={n} size="mini" />
              ))}
            </div>
          </ModeCard>
          <ModeCard active={cfg.mode === 'gap'} title="미출현 기반 추천" desc="오래 쉰 번호를 정한 개수만큼 넣고 나머지는 무작위로 채웁니다.">
            <ul>
              <li>최소 공백: N회 이상 (기본 10)</li>
              <li>포함 개수: 1 · 2 · 3개</li>
            </ul>
            <div className="pool">
              <span className="small">예: 10회 이상 {gapExample.length}개</span>
              {gapExample.map((n) => (
                <Ball key={n} n={n} size="mini" />
              ))}
            </div>
          </ModeCard>
        </div>
      </Card>
    </>
  )
}

function ModeCard({ active, title, desc, children }: { active: boolean; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className={`info-card ${active ? 'active' : ''}`}>
      <div className="card-head" style={{ flexWrap: 'nowrap' }}>
        <h3 className="h3" style={{ fontSize: 'var(--fs-17)' }}>
          {title}
        </h3>
        {active && <span className="badge on">선택됨</span>}
      </div>
      <p className="sub">{desc}</p>
      {children}
    </div>
  )
}
