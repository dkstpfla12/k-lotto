import { Bar, Cell, ComposedChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import type { NumberStatus } from '../../data/types'

/** 번호별 현재 공백(막대, 공백 긴 순) + 평균 출현 간격(점) */
export default function GapBars({ rows, label }: { rows: NumberStatus[]; label: string }) {
  const maxY = Math.max(30, ...rows.map((r) => Math.max(r.gap_now, r.avg_gap)))
  const lim = Math.ceil(maxY / 10) * 10
  const ticks: number[] = []
  for (let t = 0; t <= lim; t += 10) ticks.push(t)
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="18%">
          <XAxis dataKey="number" type="category" interval={0} tick={{ fontSize: 13, fill: '#2f3b52' }} axisLine={{ stroke: '#8b96a8' }} tickLine={false} height={24} />
          <YAxis domain={[0, lim]} ticks={ticks} tick={{ fontSize: 13, fill: '#4a5361' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(19,32,59,0.06)' }}
            formatter={(v, name) => [typeof v === 'number' ? (name === 'avg_gap' ? v.toFixed(1) : String(v)) + '회' : String(v), name === 'avg_gap' ? '평균 간격' : '현재 공백']}
            labelFormatter={(_l, p) => {
              const r = p?.[0]?.payload as NumberStatus | undefined
              return r ? `${r.number}번 · 마지막 출현 ${r.last_seen_draw}회 · 역대 최장 ${r.max_gap}회` : ''
            }}
            contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: '#e3e7ee' }}
          />
          <Bar dataKey="gap_now" isAnimationActive={false} radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.number} fill={r.gap_now > r.avg_gap * 2 ? '#1d5fd1' : '#9db6e6'} />
            ))}
          </Bar>
          <Scatter dataKey="avg_gap" fill="#eb6834" stroke="#ffffff" strokeWidth={2} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
