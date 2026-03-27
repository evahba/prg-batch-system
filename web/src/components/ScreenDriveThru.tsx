import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { CallFoodItem } from '@/components/CallFoodItem'
import { CallFoodItemWide } from '@/components/CallFoodItemWide'
import { Collapsable } from '@/components/ui/collapsible'
import { useMenu, groupMenuByDriveThruSections } from '@/hooks/useMenu'
import { createTicket, cancelTicket, markTicketPriority, type Ticket } from '@/api/tickets'
import { useRemainingSeconds } from '@/hooks/useRemainingSeconds'
import type { SocketState, SnapshotTicket } from '@/hooks/useSocket'
import type { MenuItem } from '@/api/menu'

/** True if there is an active call for this item (waiting or timer running) — block until cook completes. */
function hasActiveCallForItem(myCalls: SnapshotTicket[], item: MenuItem): boolean {
  return myCalls.some(
    (t) =>
      t.itemTitleSnapshot === `${item.title} (${item.code})` &&
      t.station === item.station &&
      t.state !== 'completed'
  )
}

/** Get the active ticket for this item (if any) */
function getActiveTicketForItem(myCalls: SnapshotTicket[], item: MenuItem): SnapshotTicket | undefined {
  return myCalls.find(
    (t) =>
      t.itemTitleSnapshot === `${item.title} (${item.code})` &&
      t.station === item.station &&
      t.state !== 'completed'
  )
}

/** Get the last completed ticket time for this item */
function getLastCompletedTime(completedTickets: SnapshotTicket[], item: MenuItem): Date | null {
  const targetTitle = `${item.title} (${item.code})`
  const completed = completedTickets
    .filter((t) => {
      const match = t.itemTitleSnapshot === targetTitle &&
        t.station === item.station &&
        t.state === 'completed' &&
        t.startedAt
      return match
    })
    .sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0
      return bTime - aTime
    })
  
  return completed.length > 0 && completed[0].startedAt 
    ? new Date(completed[0].startedAt) 
    : null
}

function toSnapshotTicket(t: Ticket): SnapshotTicket {
  return {
    id: t.id,
    station: t.station,
    seq: t.stationSeq,
    state: t.state,
    source: t.source,
    itemTitleSnapshot: t.itemTitleSnapshot,
    batchSizeSnapshot: t.batchSizeSnapshot,
    durationSeconds: t.durationSeconds,
    durationSnapshot: t.durationSnapshot,
    startedAt: t.startedAt,
  }
}

function groupTicketsByHour(tickets: SnapshotTicket[]): Record<string, SnapshotTicket[]> {
  const groups: Record<string, SnapshotTicket[]> = {}
  const now = new Date()
  
  tickets.forEach((ticket) => {
    const ticketTime = ticket.startedAt ? new Date(ticket.startedAt) : now
    const hour = ticketTime.getHours()
    const hourLabel = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`
    
    if (!groups[hourLabel]) groups[hourLabel] = []
    groups[hourLabel].push(ticket)
  })
  
  return groups
}

function getCurrentHourLabel(): string {
  const now = new Date()
  const hour = now.getHours()
  return `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`
}

function MyCallRow({ ticket, offsetMs }: { ticket: SnapshotTicket; offsetMs: number }) {
  const remaining = useRemainingSeconds(
    ticket.startedAt,
    ticket.durationSeconds ?? ticket.durationSnapshot,
    offsetMs
  )
  const isQualityCheck = remaining !== null && remaining <= 0

  let status = 'Waiting'
  let variant: 'secondary' | 'default' | 'outline' = 'secondary'
  if (ticket.state === 'completed') {
    status = 'Done'
    variant = 'outline'
  } else if (ticket.state === 'started') {
    status = isQualityCheck ? 'Quality check' : `${Math.floor((remaining ?? 0) / 60)}:${String((remaining ?? 0) % 60).padStart(2, '0')}`
    variant = 'default'
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2 border-b border-border">
      <span className="text-foreground truncate min-w-0">
        {ticket.itemTitleSnapshot} × {ticket.batchSizeSnapshot}
      </span>
      <Badge variant={variant} className={isQualityCheck ? 'bg-orange-500 hover:bg-orange-500 shrink-0' : ''}>
        {status}
      </Badge>
    </li>
  )
}

type Props = { socketState: SocketState }

export function ScreenDriveThru({ socketState }: Props) {
  const { menu, loading, error } = useMenu(socketState.menuVersion)
  const [lastError, setLastError] = useState<string | null>(null)
  const [optimisticTickets, setOptimisticTickets] = useState<SnapshotTicket[]>([])
  const { tickets, completedTickets, offsetMs, snapshot, isInitializing } = socketState
  const hasReceivedSnapshot = snapshot !== null

  const byId = new Map<number, SnapshotTicket>()
  for (const t of optimisticTickets) byId.set(t.id, t)
  for (const t of tickets) byId.set(t.id, t)
  for (const t of completedTickets) byId.set(t.id, t)
  const myCalls = Array.from(byId.values()).sort((a, b) => b.seq - a.seq)

  const handleCall = async (menuItemId: number, batchSize: string) => {
    setLastError(null)
    try {
      const ticket = await createTicket({
        menuItemId,
        batchSize,
        source: 'drive_thru',
      })
      setOptimisticTickets((prev) => [toSnapshotTicket(ticket), ...prev].slice(0, 20))
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Failed to call')
    }
  }

  const handleCancel = async (ticketId: number) => {
    setLastError(null)
    try {
      await cancelTicket(ticketId)
      setOptimisticTickets((prev) => prev.filter((t) => t.id !== ticketId))
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Failed to cancel')
    }
  }

  const handlePriority = async (ticketId: number) => {
    setLastError(null)
    try {
      const updated = await markTicketPriority(ticketId)
      setOptimisticTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, priority: updated.priority } : t))
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Failed to mark priority')
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading menu…</div>
  if (error) return <div className="p-6 text-destructive">{error}</div>
  if (!menu) return null

  const { section1, section2 } = groupMenuByDriveThruSections(menu.items)

  function CallFoodItemWithTimer({ item }: { item: MenuItem }) {
    const activeTicket = getActiveTicketForItem(myCalls, item)
    const lastCompletedTime = getLastCompletedTime(completedTickets, item)
    const remaining = useRemainingSeconds(
      activeTicket?.startedAt,
      activeTicket?.durationSeconds ?? activeTicket?.durationSnapshot,
      offsetMs
    )
    
    const activeForItem = hasActiveCallForItem(myCalls, item)
    const disabled = isInitializing || !hasReceivedSnapshot || activeForItem
    
    let disabledReason: string | undefined
    if (isInitializing) {
      disabledReason = "Loading…"
    } else if (!hasReceivedSnapshot) {
      disabledReason = 'Connecting…'
    } else if (activeForItem && activeTicket) {
      if (activeTicket.state === 'created') {
        disabledReason = 'In queue'
      }
    }
    
    return (
      <CallFoodItem
        item={item}
        onCall={handleCall}
        onCancel={handleCancel}
        onPriority={handlePriority}
        disabled={disabled}
        disabledReason={disabledReason}
        activeTicketId={activeTicket?.id}
        calledBatchSize={activeTicket?.batchSizeSnapshot}
        remainingSeconds={remaining}
        totalSeconds={activeTicket?.durationSeconds ?? activeTicket?.durationSnapshot}
        lastCalledAt={lastCompletedTime}
        isPriority={activeTicket?.priority ?? false}
      />
    )
  }

  function CallFoodItemWideWithTimer({ item }: { item: MenuItem }) {
    const activeTicket = getActiveTicketForItem(myCalls, item)
    const lastCompletedTime = getLastCompletedTime(completedTickets, item)
    const remaining = useRemainingSeconds(
      activeTicket?.startedAt,
      activeTicket?.durationSeconds ?? activeTicket?.durationSnapshot,
      offsetMs
    )
    const activeForItem = hasActiveCallForItem(myCalls, item)
    const disabled = isInitializing || !hasReceivedSnapshot || activeForItem
    let disabledReason: string | undefined
    if (isInitializing) disabledReason = 'Loading…'
    else if (!hasReceivedSnapshot) disabledReason = 'Connecting…'
    else if (activeForItem && activeTicket?.state === 'created') disabledReason = 'In queue'
    return (
      <CallFoodItemWide
        item={item}
        onCall={handleCall}
        onCancel={handleCancel}
        onPriority={handlePriority}
        disabled={disabled}
        disabledReason={disabledReason}
        activeTicketId={activeTicket?.id}
        calledBatchSize={activeTicket?.batchSizeSnapshot}
        remainingSeconds={remaining}
        totalSeconds={activeTicket?.durationSeconds ?? activeTicket?.durationSnapshot}
        lastCalledAt={lastCompletedTime}
        isPriority={activeTicket?.priority ?? false}
      />
    )
  }

  function DriveThruSection({ title, rows }: { title: string; rows: { items: MenuItem[]; cols: number }[] }) {
    if (rows.every((r) => r.items.length === 0)) return null
    return (
      <section>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <div className="space-y-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${row.cols}, minmax(0, 1fr))` }}
            >
              {row.items.map((item) => (
                row.cols === 2
                  ? <CallFoodItemWideWithTimer key={item.id} item={item} />
                  : <CallFoodItemWithTimer key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-6">
      {lastError && (
        <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
          {lastError}
        </div>
      )}
      <DriveThruSection title="Section 1" rows={[
        { items: section1.row2, cols: 3 },
        { items: section1.row1, cols: 2 },
      ]} />
      <DriveThruSection title="Section 2" rows={[
        { items: section2.row1, cols: 3 },
        { items: section2.row2, cols: 3 },
      ]} />
      {myCalls.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">My calls</h2>
          <div className="space-y-2">
            {Object.entries(groupTicketsByHour(myCalls)).map(([hourLabel, tickets]) => (
              <Collapsable
                key={hourLabel}
                title={hourLabel}
                count={tickets.length}
                defaultOpen={hourLabel === getCurrentHourLabel()}
              >
                <ul className="text-sm space-y-2">
                  {tickets.map((t) => (
                    <MyCallRow key={t.id} ticket={t} offsetMs={offsetMs} />
                  ))}
                </ul>
              </Collapsable>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
