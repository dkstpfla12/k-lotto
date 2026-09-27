import { Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BAND1, BAND2, SUM_MEAN } from '../../data/calc'
import type { DrawStats } from '../../data/types'

const TICK = { fontSize: 13, fill: '#4a5361' }

/** 최신 회차 점 + 값 라벨(점 왼쪽 빨간 상자, 시안과 동일). ReferenceDot의 shape로 직접 그린다. */
function LastDot(props: { cx?: number; cy?: number; value?: number }) {
  const { cx = 0, cy = 0, value } = props
  const text = String(value ?? '')
  const w = 18 + text.length * 9
  return (
    <g>
      <rect x={cx - 12 - w} y={cy - 11} width={w} height={22} rx={4} fill="#d42f2c" />
      <text x={cx - 12 - w / 2} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#ffffff">
        {text}
      </text>
      <circle cx={cx} cy={cy} r={6} fill="#d42f2c" stroke="#ffffff" strokeWidth={2} />
    </g>
  )
}

/** 회차별 합계 추이 + ±1σ/±2σ 밴드 + 평균 점선 + 최신 회차 강조 (시안 Main/Sum의 SVG를 Recharts로) */
export default function SumTrend({ stats, height = 300, label }: { stats: DrawStats[]; height?: number; label: string }) {
  if (stats.length === 0) return null
  const first = stats[0].draw_no
  const last = stats[stats.length - 1].draw_no
  const lastSum = stats[stats.length - 1].sum
  const n = stats.length
  const ticks = n <= 5 ? stats.map((s) => s.draw_no) : [0, 0.25, 0.5, 0.75, 1].map((f) => stats[Math.round(f * (n - 1))].draw_no)
  const yMin = Math.min(40, ...stats.map((s) => s.sum))
  const yMax = Math.max(240, ...stats.map((s) => s.sum))
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={stats} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <ReferenceArea
            y1={BAND2.lo}
            y2={BAND2.hi}
            fill="#f1f4f9"
            fillOpacity={1}
            ifOverflow="visible"
            label={{ value: `±2σ ${BAND2.lo}~${BAND2.hi}`, position: 'insideTopRight', fontSize: 13, fill: '#4a5361', dx: -6, dy: 4 }}
          />
          <ReferenceArea
            y1={BAND1.lo}
            y2={BAND1.hi}
            fill="#e2e9f4"
            fillOpacity={1}
            ifOverflow="visible"
            label={{ value: `±1σ ${BAND1.lo}~${BAND1.hi}`, position: 'insideTopRight', fontSize: 13, fill: '#2f3b52', dx: -6, dy: 4 }}
          />
          <ReferenceLine y={SUM_MEAN} stroke="#8b96a8" strokeDasharray="3 4" />
          <ReferenceLine y={SUM_MEAN} stroke="none" label={{ value: `평균 ${SUM_MEAN}`, position: 'insideBottomLeft', fontSize: 13, fill: '#4a5361', dy: -4 }} />
          <XAxis
            dataKey="draw_no"
            type="number"
            domain={[first, last]}
            ticks={ticks}
            tickFormatter={(v: number) => `${v}회`}
            tick={TICK}
            axisLine={false}
            tickLine={false}
            interval={0}
            height={28}
          />
          <YAxis domain={[yMin, yMax]} ticks={[80, 120, 160, 200]} tick={TICK} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            formatter={(v) => [`${v}`, '합계']}
            labelFormatter={(l, p) => {
              const s = p?.[0]?.payload as DrawStats | undefined
              return s ? `${s.draw_no}회 (${s.draw_date}) · ${s.sum_zone}` : `${l}회`
            }}
            contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: '#e3e7ee' }}
          />
          <Line type="linear" dataKey="sum" stroke="#13203b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          <ReferenceDot x={last} y={lastSum} ifOverflow="visible" shape={(p: unknown) => <LastDot {...(p as { cx?: number; cy?: number })} value={lastSum} />} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
