import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadLottoData } from './load'
import type { LottoData } from './types'

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: LottoData }

interface Ctx {
  state: DataState
  retry: () => void
}

const DataCtx = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: 'loading' })
  const load = useCallback((force: boolean) => {
    setState({ status: 'loading' })
    loadLottoData(force)
      .then((data) => setState({ status: 'ready', data }))
      .catch((e: unknown) => setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
  }, [])
  useEffect(() => {
    load(false)
  }, [load])
  return <DataCtx.Provider value={{ state, retry: () => load(true) }}>{children}</DataCtx.Provider>
}

export function useDataState(): Ctx {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('DataProvider 밖에서 useDataState를 호출했습니다')
  return ctx
}

/** 데이터가 준비된 화면(Outlet 안)에서만 사용한다. */
export function useData(): LottoData {
  const { state } = useDataState()
  if (state.status !== 'ready') throw new Error('데이터가 아직 준비되지 않았습니다')
  return state.data
}
