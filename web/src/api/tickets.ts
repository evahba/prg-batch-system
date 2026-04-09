const API = import.meta.env.VITE_API_URL || ''

export type CreateTicketPayload = {
  menuItemId: number
  batchSize: string
  source: 'foh' | 'drive_thru'
}

export type Ticket = {
  id: number
  station: string
  stationSeq: number
  state: string
  source: string
  itemTitleSnapshot: string
  batchSizeSnapshot: string
  menuVersionAtCall: number
  startedAt?: number
  durationSeconds?: number
  durationSnapshot?: number
  priority?: boolean
}

/** Normalize API/socket payload (snake_case or camelCase) to Ticket shape. */
function normalizeTicket(raw: Record<string, unknown>): Ticket {
  const startedAt = raw.startedAt ?? raw.started_at
  const startedMs =
    typeof startedAt === 'number' ? startedAt : typeof startedAt === 'string' ? new Date(startedAt).getTime() : undefined
  return {
    id: (raw.id as number) ?? 0,
    station: (raw.station as string) ?? '',
    stationSeq: (raw.stationSeq ?? raw.station_seq) as number,
    state: (raw.state as string) ?? 'created',
    source: (raw.source as string) ?? '',
    itemTitleSnapshot: (raw.itemTitleSnapshot ?? raw.item_title_snapshot) as string,
    batchSizeSnapshot: (raw.batchSizeSnapshot ?? raw.batch_size_snapshot) as string,
    menuVersionAtCall: (raw.menuVersionAtCall ?? raw.menu_version_at_call) as number,
    startedAt: startedMs,
    durationSeconds: (raw.durationSeconds ?? raw.duration_seconds) as number | undefined,
    durationSnapshot: (raw.durationSnapshot ?? raw.duration_snapshot) as number | undefined,
    priority: (raw.priority as boolean | undefined) ?? false,
  }
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const r = await fetch(`${API}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create ticket')
  }
  const data = (await r.json()) as Record<string, unknown>
  return normalizeTicket(data)
}

export async function startTicket(id: number): Promise<Ticket> {
  const r = await fetch(`${API}/api/tickets/${id}/start`, { method: 'POST' })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to start')
  }
  const data = (await r.json()) as Record<string, unknown>
  return normalizeTicket(data)
}

export async function completeTicket(id: number): Promise<Ticket> {
  const r = await fetch(`${API}/api/tickets/${id}/complete`, { method: 'POST' })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to complete')
  }
  const data = (await r.json()) as Record<string, unknown>
  return normalizeTicket(data)
}

export async function resetTicket(id: number): Promise<Ticket> {
  const r = await fetch(`${API}/api/tickets/${id}/reset`, { method: 'POST' })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to reset')
  }
  const data = (await r.json()) as Record<string, unknown>
  return normalizeTicket(data)
}

export async function extendTicket(id: number, seconds = 10): Promise<Ticket> {
  const r = await fetch(`${API}/api/tickets/${id}/extend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to extend')
  }
  const data = (await r.json()) as Record<string, unknown>
  return normalizeTicket(data)
}

export async function markTicketPriority(id: number): Promise<Ticket> {
  const r = await fetch(`${API}/api/tickets/${id}/priority`, { method: 'POST' })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to mark priority')
  }
  const data = (await r.json()) as Record<string, unknown>
  return normalizeTicket(data)
}

export async function cancelTicket(id: number): Promise<void> {
  const r = await fetch(`${API}/api/tickets/${id}`, { method: 'DELETE' })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to cancel')
  }
}
