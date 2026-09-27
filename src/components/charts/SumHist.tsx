import { Bar, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistBin } from '../../data/calc'

/** 합계 분포: 10 단위 실제 회차 수(막대) + 이론 정규분포(선). 정상 범위 구간(108~168 포함 구간)은 남색, 그 외 회색 */
export default function SumHist({ bins, label }: { bins: HistBin[]; label: string }) {
  const data = bins.map((b) => ({ ...b, mid: b.lo + 5, name: `${b.lo}~${b.hi}` }))
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="12%">
          <XAxis
            dataKey="lo"
            ticks={[40, 80, 120, 160, 200, 240].filter((t) => t < 240)}
            tickFormatter={(v: number) => String(v)}
            tick={{ fontSize: 13, fill: '#4a5361' }}
            axisLine={{ stroke: '#c9d0db' }}
            tickLine={false}
            interval={0}
          />
          <YAxis tick={{ fontSize: 13, fill: '#4a5361' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            formatter={(v, name) => [typeof v === 'number' ? (name === 'theory' ? v.toFixed(1) : String(v)) + '회' : String(v), name === 'theory' ? '이론' : '실제']}
            labelFormatter={(_l, p) => {
              const d = p?.[0]?.payload as { name: string } | undefined
              return d ? `합계 ${d.name}` : ''
            }}
            contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: '#e3e7ee' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.lo} fill={d.lo >= 110 && d.lo < 170 ? '#13203b' : '#8e9bb3'} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="theory" stroke="#d42f2c" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
