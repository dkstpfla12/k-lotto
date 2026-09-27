import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FreqRow } from '../../data/calc'

interface TickProps {
  x?: number
  y?: number
  payload?: { value: number }
}

/** 기대값 대비 편차 막대 (양수 빨강·음수 파랑). 편차가 큰 번호(|d| ≥ 강조 기준)는 굵게 */
export default function DeviationBars({ rows, label, boldAt }: { rows: FreqRow[]; label: string; boldAt: number }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.deviation)))
  const step = maxAbs > 20 ? 15 : maxAbs > 8 ? 5 : maxAbs > 3 ? 2 : 1
  const lim = Math.ceil(maxAbs / step) * step
  const ticks: number[] = []
  for (let t = -lim; t <= lim; t += step) ticks.push(t)
  const bold = new Set(rows.filter((r) => Math.abs(r.deviation) >= boldAt).map((r) => r.number))
  const Tick = (props: unknown) => {
    const { x = 0, y = 0, payload } = props as TickProps
    const v = payload?.value ?? 0
    return (
      <text x={x} y={y + 12} textAnchor="middle" fontSize={13} fontWeight={bold.has(v) ? 700 : 400} fill="#2f3b52">
        {v}
      </text>
    )
  }
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -16 }} barCategoryGap="18%">
          <XAxis dataKey="number" interval={0} tick={Tick} axisLine={false} tickLine={false} height={24} />
          <YAxis domain={[-lim, lim]} ticks={ticks} tick={{ fontSize: 13, fill: '#4a5361' }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0')} />
          <ReferenceLine y={0} stroke="#8b96a8" />
          <Tooltip
            cursor={{ fill: 'rgba(19,32,59,0.06)' }}
            formatter={(v) => [typeof v === 'number' ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '회' : String(v), '기대 대비']}
            labelFormatter={(_l, p) => {
              const r = p?.[0]?.payload as FreqRow | undefined
              return r ? `${r.number}번 · ${r.count}회 출현` : ''
            }}
            contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: '#e3e7ee' }}
          />
          <Bar dataKey="deviation" isAnimationActive={false} radius={[3, 3, 3, 3]}>
            {rows.map((r) => (
              <Cell key={r.number} fill={r.deviation >= 0 ? '#d42f2c' : '#1d5fd1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
