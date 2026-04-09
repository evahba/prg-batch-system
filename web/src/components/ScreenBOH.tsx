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

const TITLE_BY_SCREEN: Record<ScreenId, string> = {
  1: '',
  2: '',
  3: 'Stir fry',
  4: 'Fryer',
  5: 'Sides + Grill',
  menu: '',
}

/** Simple beep for new incoming order */
function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1200
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // Ignore audio errors
  }
}

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
      <CardContent className="px-3 py-2 short:px-2 short:py-1.5 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {ticket.priority && (
              <span className="animate-pulse bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shrink-0">Waiting</span>
            )}
            <span className="font-semibold text-sm shrink-0">Batch {ticket.batchSizeSnapshot}</span>
            <span className="font-medium text-sm truncate">{title}</span>
          </div>
          {code && (
            <span className={`font-bold text-sm px-2 py-0.5 rounded shrink-0 ${colorClass(color)}`}>{code}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" className="gap-1 h-8 short:h-7 short:text-xs" onClick={() => onStart(ticket.id)}><ArrowLeft size={12} />Start</Button>
          <span className={cn(
            "text-sm short:text-xs font-medium",
            waitingMins === null || waitingMins < 4 ? "text-foreground" :
            waitingMins < 5 ? "text-orange-500" :
            "text-red-500"
          )}>
            {waitingMins !== null ? `Waiting ${waitingMins} min` : 'Waiting'}
          </span>
        </div>
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
  onStep2,
  playedSoundRef,
  step2UsedRef,
}: {
  ticket: SnapshotTicket
  offsetMs: number
  onComplete: (id: number) => void
  onReset: (id: number) => void
  onExtend: (id: number) => void
  onStep2: (id: number) => void
  playedSoundRef: React.MutableRefObject<Set<number>>
  step2UsedRef: React.MutableRefObject<Set<number>>
}) {
  const remaining = useRemainingSeconds(ticket.startedAt, ticket.durationSeconds ?? ticket.durationSnapshot, offsetMs)
  const isQualityCheck = remaining !== null && remaining <= 0
  const step2Used = step2UsedRef.current.has(ticket.id)

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
      <div className="grid grid-cols-3 items-center py-2 short:py-1.5 px-3 short:px-2">
        <span className="font-semibold text-xs short:text-xs">BATCH {ticket.batchSizeSnapshot}</span>
        <div className="flex justify-center">
          {isQualityCheck ? (
            <span className="text-orange-600 font-semibold text-xs">QUALITY CHECK</span>
          ) : (
            <span className="text-foreground font-bold text-sm short:text-xs tabular-nums">{formatTime(remaining ?? 0)}</span>
          )}
        </div>
        <div />
      </div>
      {totalSeconds > 0 && (
        <div className="px-3 short:px-2">
          <ProgressBar
            value={isQualityCheck ? totalSeconds : totalSeconds - (remaining ?? 0)}
            max={totalSeconds}
            invert
            complete={isQualityCheck}
            className="h-2 short:h-1.5"
          />
        </div>
      )}
      <div className="flex gap-1.5 px-3 short:px-2 py-2 short:py-1.5">
        <Button variant="outline" className="flex-1 h-9 short:h-7 short:text-xs gap-1" onClick={() => onReset(ticket.id)}><RotateCcw size={12} />Reset</Button>
        {isQualityCheck && !step2Used ? (
          <Button variant="default" className="flex-1 h-9 short:h-7 short:text-xs gap-1" onClick={() => onStep2(ticket.id)}><Clock size={12} />Step 2</Button>
        ) : (
          <Button variant={isQualityCheck ? "default" : "outline"} className="flex-1 h-9 short:h-7 short:text-xs gap-1" onClick={() => onComplete(ticket.id)}><CheckCircle size={12} />Complete</Button>
        )}
        <Button
          variant="outline"
          className="flex-1 h-9 short:h-7 short:text-xs gap-1"
          disabled={!isQualityCheck}
          onClick={() => onExtend(ticket.id)}
        >
          {isQualityCheck ? <Clock size={12} /> : <Lock size={12} />}
          +10s
        </Button>
      </div>
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
  onStep2,
  playedSoundRef,
  step2UsedRef,
  color,
}: {
  code: string
  title: string
  tickets: SnapshotTicket[]
  offsetMs: number
  onComplete: (id: number) => void
  onReset: (id: number) => void
  onExtend: (id: number) => void
  onStep2: (id: number) => void
  playedSoundRef: React.MutableRefObject<Set<number>>
  step2UsedRef: React.MutableRefObject<Set<number>>
  color?: string | null
}) {
  const firstTicket = tickets[0]
  const responseTime = (() => {
    if (!firstTicket?.createdAt || !firstTicket?.startedAt) return null
    const ms = firstTicket.startedAt - firstTicket.createdAt
    const sec = Math.max(0, Math.floor(ms / 1000))
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins} MIN ${secs} SEC`
  })()

  return (
    <Card>
      <CardHeader className="pb-2 short:pb-1 pt-3 short:pt-2 px-3 short:px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`font-bold text-xs px-2 py-0.5 rounded shrink-0 ${colorClass(color)}`}>
              {code}
            </div>
            <h3 className="font-semibold text-base short:text-sm uppercase tracking-wide truncate">{title}</h3>
          </div>
          {responseTime && (
            <span className="text-xs text-muted-foreground shrink-0 short:hidden">Response: {responseTime}</span>
          )}
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
            onStep2={onStep2}
            playedSoundRef={playedSoundRef}
            step2UsedRef={step2UsedRef}
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

export function ScreenBOH({ screen, socketState }: Props) {
  const { tickets, completedTickets, offsetMs, menuVersion, snapshot } = socketState
  const { menu } = useMenu(menuVersion)
  const playedSoundRef = useRef<Set<number>>(new Set())
  const step2UsedRef = useRef<Set<number>>(new Set())
  const knownTicketIdsRef = useRef<Set<number>>(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!snapshot) return
    if (!initializedRef.current) {
      initializedRef.current = true
      tickets.forEach((t) => knownTicketIdsRef.current.add(t.id))
      return
    }
    const hasNew = tickets.some((t) => !knownTicketIdsRef.current.has(t.id))
    if (hasNew) playNewOrderSound()
    tickets.forEach((t) => knownTicketIdsRef.current.add(t.id))
  }, [tickets, snapshot])
  
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

  const handleStep2 = async (id: number) => {
    try {
      await extendTicket(id, 180)
      step2UsedRef.current.add(id)
      playedSoundRef.current.delete(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start step 2')
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

  const title = TITLE_BY_SCREEN[screen]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {title && (
        <h1 className="text-lg short:text-base font-semibold px-4 short:px-3 pt-3 short:pt-2">{title}</h1>
      )}

      <div className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col overflow-hidden border-r border-border">
          <h2 className="text-base short:text-sm font-semibold px-4 short:px-3 py-2 short:py-1.5 border-b border-border shrink-0">In progress</h2>
          <div className="flex-1 overflow-auto p-3 short:p-2 flex flex-col gap-2 short:gap-1.5">
            {inProgressGroups.length === 0 ? (
              <p className="text-muted-foreground text-sm">No timers running</p>
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
                  onStep2={handleStep2}
                  playedSoundRef={playedSoundRef}
                  step2UsedRef={step2UsedRef}
                  color={getItemColor(group.code)}
                />
              ))
            )}
          </div>
        </section>

        <section className="flex-1 flex flex-col overflow-hidden">
          <h2 className="text-base short:text-sm font-semibold px-4 short:px-3 py-2 short:py-1.5 border-b border-border shrink-0">Waiting</h2>
          <div className="flex-1 overflow-auto p-3 short:p-2 flex flex-col gap-2 short:gap-1.5">
            {waiting.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tickets waiting</p>
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

      <section className="border-t border-border shrink-0 px-4 py-3">
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
