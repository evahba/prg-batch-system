import { useRef, useEffect } from 'react'
import { Lock, Clock, RotateCcw, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Collapsable } from '@/components/ui/collapsible'
import { ProgressBar } from '@/components/ui/progress-bar'
import { startTicket, completeTicket, resetTicket, extendTicket } from '@/api/tickets'
import type { SnapshotTicket, SocketState } from '@/hooks/useSocket'
import { useRemainingSeconds } from '@/hooks/useRemainingSeconds'
import { useMenu } from '@/hooks/useMenu'
import type { ScreenId } from '@/types/screen'
import { cn } from '@/lib/utils'


/** Simple beep via Web Audio */
function playQualityCheckSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // Ignore audio errors
  }
}

/** Parse code and title from itemTitleSnapshot like "Super Greens (V1)" */
function parseItemSnapshot(snapshot: string): { code: string; title: string } {
  const match = snapshot.match(/^(.+?)\s*\(([^)]+)\)$/)
  if (match) {
    return { title: match[1].trim(), code: match[2].trim() }
  }
  return { title: snapshot, code: '' }
}

function colorClass(color?: string | null) {
  if (color === 'blue') return 'bg-blue-500 text-white'
  if (color === 'red') return 'bg-red-500 text-white'
  if (color === 'orange') return 'bg-orange-500 text-white'
  return 'bg-green-500 text-white'
}

function WaitingCard({
  ticket,
  code,
  title,
  color,
  offsetMs,
  onStart,
}: {
  ticket: SnapshotTicket
  code: string
  title: string
  color?: string | null
  offsetMs: number
  onStart: (id: number) => void
}) {
  const getWaitingMins = () => {
    if (!ticket.createdAt) return null
    const elapsedMs = (Date.now() - offsetMs) - ticket.createdAt
    return Math.max(0, Math.floor(elapsedMs / 60000))
  }

  const waitingMins = getWaitingMins()

  return (
    <Card className={ticket.priority ? 'border-2 border-red-500 bg-red-50' : ''}>
      <CardContent className="px-3 py-2 flex items-center gap-2">
        <Button size="sm" className="h-8 gap-1 shrink-0 px-2" onClick={() => onStart(ticket.id)}><ArrowLeft size={12} />Start</Button>
        {ticket.priority && (
          <span className="animate-pulse bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0">!</span>
        )}
        <span className="font-semibold text-sm shrink-0">Batch {ticket.batchSizeSnapshot}</span>
        <span className="font-medium truncate flex-1">{title}</span>
        {code && (
          <span className={`font-bold text-xs px-2 py-0.5 rounded shrink-0 ${colorClass(color)}`}>{code}</span>
        )}
        <span className={cn(
          "text-xs font-medium shrink-0",
          waitingMins === null || waitingMins < 4 ? "text-muted-foreground" :
          waitingMins < 5 ? "text-orange-500" :
          "text-red-500"
        )}>
          {waitingMins !== null ? `${waitingMins}m` : ''}
        </span>
      </CardContent>
    </Card>
  )
}

function BatchRow({
  ticket,
  offsetMs,
  onComplete,
  onReset,
  onExtend,
  playedSoundRef,
}: {
  ticket: SnapshotTicket
  offsetMs: number
  onComplete: (id: number) => void
  onReset: (id: number) => void
  onExtend: (id: number) => void
  playedSoundRef: React.MutableRefObject<Set<number>>
}) {
  const remaining = useRemainingSeconds(ticket.startedAt, ticket.durationSeconds ?? ticket.durationSnapshot, offsetMs)
  const isQualityCheck = remaining !== null && remaining <= 0

  useEffect(() => {
    if (isQualityCheck && !playedSoundRef.current.has(ticket.id)) {
      playedSoundRef.current.add(ticket.id)
      playQualityCheckSound()
    }
  }, [isQualityCheck, ticket.id, playedSoundRef])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins} MIN ${secs} SEC`
  }

  const totalSeconds = ticket.durationSeconds ?? ticket.durationSnapshot ?? 0

  return (
    <div className={cn(
      "flex flex-col border-b border-border last:border-0"
    )}>
      <div className="flex items-center gap-2 py-2 px-3">
        <span className="font-semibold text-sm shrink-0">B{ticket.batchSizeSnapshot}</span>
        <div className="flex-1 flex justify-center">
          {isQualityCheck ? (
            <span className="text-orange-600 font-semibold text-sm">QUALITY CHECK</span>
          ) : (
            <span className="text-foreground font-bold text-sm tabular-nums">{formatTime(remaining ?? 0)}</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2" onClick={() => onReset(ticket.id)}><RotateCcw size={12} />Reset</Button>
          <Button variant={isQualityCheck ? "default" : "outline"} size="sm" className="h-8 gap-1 px-2" onClick={() => onComplete(ticket.id)}><CheckCircle size={12} />Done</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2" disabled={!isQualityCheck} onClick={() => onExtend(ticket.id)}>
            {isQualityCheck ? <Clock size={12} /> : <Lock size={12} />}+10s
          </Button>
        </div>
      </div>
      {totalSeconds > 0 && (
        <div className="px-3 pb-2">
          <ProgressBar
            value={isQualityCheck ? totalSeconds : totalSeconds - (remaining ?? 0)}
            max={totalSeconds}
            invert
            complete={isQualityCheck}
            className="h-2"
          />
        </div>
      )}
    </div>
  )
}

function ItemCard({
  code,
  title,
  tickets,
  offsetMs,
  onComplete,
  onReset,
  onExtend,
  playedSoundRef,
  color,
}: {
  code: string
  title: string
  tickets: SnapshotTicket[]
  offsetMs: number
  onComplete: (id: number) => void
  onReset: (id: number) => void
  onExtend: (id: number) => void
  playedSoundRef: React.MutableRefObject<Set<number>>
  color?: string | null
}) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-2 px-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`font-bold text-xs px-2 py-0.5 rounded shrink-0 ${colorClass(color)}`}>
            {code}
          </div>
          <h3 className="font-semibold text-sm uppercase tracking-wide truncate">{title}</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        {tickets.map((ticket) => (
          <BatchRow
            key={ticket.id}
            ticket={ticket}
            offsetMs={offsetMs}
            onComplete={onComplete}
            onReset={onReset}
            onExtend={onExtend}
            playedSoundRef={playedSoundRef}
          />
        ))}
      </CardContent>
    </Card>
  )
}

type Props = {
  screen: ScreenId
  socketState: SocketState
}

export function ScreenBOH({ socketState }: Props) {
  const { tickets, completedTickets, offsetMs, menuVersion } = socketState
  const { menu } = useMenu(menuVersion)
  const playedSoundRef = useRef<Set<number>>(new Set())
  
  const getItemColor = (code: string) => {
    if (!menu) return null
    const item = menu.items.find(i => i.code === code)
    return item?.color ?? null
  }

  const handleStart = async (id: number) => {
    try {
      await startTicket(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start')
    }
  }

  const handleComplete = async (id: number) => {
    try {
      await completeTicket(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to complete')
    }
  }

  const handleReset = async (id: number) => {
    try {
      await resetTicket(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reset')
    }
  }

  const handleExtend = async (id: number) => {
    try {
      await extendTicket(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to extend')
    }
  }

  // Group tickets by item (code + title)
  const groupByItem = (ticketList: SnapshotTicket[]) => {
    const groups = new Map<string, { code: string; title: string; tickets: SnapshotTicket[] }>()
    
    for (const ticket of ticketList) {
      const { code, title } = parseItemSnapshot(ticket.itemTitleSnapshot ?? '')
      const key = `${code}|${title}`
      
      if (!groups.has(key)) {
        groups.set(key, { code, title, tickets: [] })
      }
      groups.get(key)!.tickets.push(ticket)
    }
    
    // Sort tickets within each group by seq asc (oldest first)
    for (const group of groups.values()) {
      group.tickets.sort((a, b) => a.seq - b.seq)
    }
    
    return Array.from(groups.values())
  }

  const waiting = tickets
    .filter((t) => t.state === 'created')
    .sort((a, b) => {
      const priorityDiff = (b.priority ? 1 : 0) - (a.priority ? 1 : 0)
      if (priorityDiff !== 0) return priorityDiff
      return (a.createdAt ?? 0) - (b.createdAt ?? 0)
    })
  const inProgress = tickets.filter((t) => t.state === 'started')
  
  const isQualityCheckTicket = (t: SnapshotTicket) => {
    const duration = t.durationSeconds ?? t.durationSnapshot
    if (!t.startedAt || !duration) return false
    return (Date.now() - offsetMs) >= t.startedAt + duration * 1000
  }

  const inProgressGroups = groupByItem(inProgress).sort((a, b) => {
    const aQC = a.tickets.some(isQualityCheckTicket) ? 1 : 0
    const bQC = b.tickets.some(isQualityCheckTicket) ? 1 : 0
    return bQC - aQC
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col overflow-hidden border-r border-border">
          <h2 className="text-sm font-semibold px-3 py-2 border-b border-border shrink-0 uppercase tracking-wide text-muted-foreground">In progress</h2>
          <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
            {inProgressGroups.length === 0 ? (
              <p className="text-muted-foreground text-sm p-2">No timers running</p>
            ) : (
              inProgressGroups.map((group) => (
                <ItemCard
                  key={`${group.code}-${group.title}`}
                  code={group.code}
                  title={group.title}
                  tickets={group.tickets}
                  offsetMs={offsetMs}
                  onComplete={handleComplete}
                  onReset={handleReset}
                  onExtend={handleExtend}
                  playedSoundRef={playedSoundRef}
                  color={getItemColor(group.code)}
                />
              ))
            )}
          </div>
        </section>

        <section className="flex-1 flex flex-col overflow-hidden">
          <h2 className="text-sm font-semibold px-3 py-2 border-b border-border shrink-0 uppercase tracking-wide text-muted-foreground">Waiting</h2>
          <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
            {waiting.length === 0 ? (
              <p className="text-muted-foreground text-sm p-2">No tickets waiting</p>
            ) : (
              waiting.map((ticket) => {
                const { code, title } = parseItemSnapshot(ticket.itemTitleSnapshot ?? '')
                return (
                  <WaitingCard
                    key={ticket.id}
                    ticket={ticket}
                    code={code}
                    title={title}
                    color={getItemColor(code)}
                    offsetMs={offsetMs}
                    onStart={handleStart}
                  />
                )
              })
            )}
          </div>
        </section>
      </div>

      <section className="border-t border-border shrink-0 px-3 py-2">
        <Collapsable
          title="Completed"
          count={completedTickets.length}
          defaultOpen={false}
        >
          <div className="flex flex-col gap-1 mt-2">
            {completedTickets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No completed tickets</p>
            ) : (
              completedTickets.slice(0, 20).map((t) => (
                <div key={t.id} className="text-sm text-muted-foreground py-1">
                  Batch {t.batchSizeSnapshot} - {t.itemTitleSnapshot} _{t.seq}
                </div>
              ))
            )}
          </div>
        </Collapsable>
      </section>
    </div>
  )
}
