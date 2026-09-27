import { SOURCES } from './sources'
import { parseDraws, parseStats, parseStatus } from './parse'
import type { LottoData } from './types'

async function fetchCsv(url: string, name: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${name} 데이터 응답 오류 (HTTP ${res.status})`)
  return res.text()
}

let cached: Promise<LottoData> | null = null

/** 세션(페이지 수명) 동안 한 번만 불러오고 메모리에 캐시한다. 실패하면 캐시를 비워 재시도할 수 있게 한다. */
export function loadLottoData(force = false): Promise<LottoData> {
  if (!cached || force) {
    cached = (async () => {
      const [d, s, n] = await Promise.all([
        fetchCsv(SOURCES.draw, 'draw'),
        fetchCsv(SOURCES.draw_stats, 'draw_stats'),
        fetchCsv(SOURCES.number_status, 'number_status'),
      ])
      const draws = parseDraws(d)
      const stats = parseStats(s)
      const status = parseStatus(n)
      if (draws.length === 0 || stats.length !== draws.length || status.length !== 45) {
        throw new Error(`데이터 행 수가 맞지 않습니다 (draw ${draws.length}, draw_stats ${stats.length}, number_status ${status.length})`)
      }
      return { draws, stats, status, loadedAt: new Date() }
    })()
    cached.catch(() => {
      cached = null
    })
  }
  return cached
}
