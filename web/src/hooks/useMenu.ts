import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchMenu, type MenuItem, type MenuResponse } from '@/api/menu'

export function useMenu(menuVersion?: number) {
  const [data, setData] = useState<MenuResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchSeqRef = useRef(0)

  const refetch = useCallback(() => {
    const seq = ++fetchSeqRef.current
    return fetchMenu()
      .then((result) => {
        if (seq === fetchSeqRef.current) setData(result)
      })
      .catch((e) => {
        if (seq === fetchSeqRef.current)
          setError(e instanceof Error ? e.message : 'Failed to load menu')
      })
      .finally(() => {
        if (seq === fetchSeqRef.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    refetch()
  }, [])

  useEffect(() => {
    if (menuVersion != null && menuVersion > 0) {
      refetch()
    }
  }, [menuVersion])

  return { menu: data, loading, error, refetch }
}

export type FohRow = { code: string; span?: number }[]

export function groupMenuByFohSections(items: MenuItem[]) {
  const enabled = items.filter((i) => i.enabled)
  const byCode = Object.fromEntries(enabled.map((i) => [i.code, i]))
  const get = (c: string) => byCode[c]

  return {
    section1: {
      row1: ['C13', 'C3', 'B3', 'F4'].map((c) => get(c)).filter(Boolean),
      row2: ['M1', 'V1', 'R1', 'R2'].map((c) => get(c)).filter(Boolean),
    },
    section2: {
      row1: [
        { code: 'B1', span: 1 },
        { code: 'C1', span: 2 },
        { code: 'CB5', span: 1 },
      ].map(({ code, span }) => ({ item: get(code), span })).filter((e) => e.item) as { item: MenuItem; span: number }[],
      row2: ['C2', 'CB3', 'CB1', 'B5'].map((c) => get(c)).filter(Boolean),
    },
    section3: ['C4', 'E1', 'E2', 'E3'].map((c) => get(c)).filter(Boolean),
  }
}

/** Drive-thru: sections with explicit row groupings */
export function groupMenuByDriveThruSections(items: MenuItem[]) {
  const enabled = items.filter((i) => i.enabled)
  const byCode = Object.fromEntries(enabled.map((i) => [i.code, i]))
  return {
    section1: {
      row1: ['M1', 'R1'].map((c) => byCode[c]).filter(Boolean),
      row2: ['CB3', 'C3', 'V1'].map((c) => byCode[c]).filter(Boolean),
    },
    section2: {
      row1: ['B5', 'C1', 'C2'].map((c) => byCode[c]).filter(Boolean),
      row2: ['F4', 'B1', 'C4'].map((c) => byCode[c]).filter(Boolean),
    },
  }
}
