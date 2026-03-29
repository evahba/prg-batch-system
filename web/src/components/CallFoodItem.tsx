import { useState } from 'react'
import { CircleX, Siren, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BatchToggle } from '@/components/ui/batch-toggle'
import { ProgressBar } from '@/components/ui/progress-bar'
import { ImagePlaceholder } from '@/components/ui/image-placeholder'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MenuItem } from '@/api/menu'
import { getRecommendedBatch } from '@/helpers/daypart'

type Props = {
  item: MenuItem
  onCall: (menuItemId: number, batchSize: string) => Promise<void>
  onCancel?: (ticketId: number) => Promise<void>
  onPriority?: (ticketId: number) => Promise<void>
  disabled?: boolean
  disabledReason?: string
  activeTicketId?: number
  calledBatchSize?: string
  remainingSeconds?: number | null
  totalSeconds?: number
  lastCalledAt?: Date | null
  isPriority?: boolean
  compact?: boolean
}

export function CallFoodItem({ 
  item, 
  onCall, 
  onCancel,
  onPriority,
  disabled = false, 
  disabledReason,
  activeTicketId,
  calledBatchSize,
  remainingSeconds,
  totalSeconds,
  lastCalledAt,
  isPriority: _isPriority = false,
  compact = false,
}: Props) {
  const recommendedBatch = getRecommendedBatch(
    item.recommendedBatch ?? {},
    item.batchSizes ?? []
  )
  const [batchSize, setBatchSize] = useState(recommendedBatch)
  const [loading, setLoading] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const handleCall = async () => {
    setLoading(true)
    try {
      await onCall(item.id, batchSize)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelClick = () => {
    setShowCancelDialog(true)
  }

  const handleCancelConfirm = async () => {
    if (!activeTicketId || !onCancel) return
    setCanceling(true)
    try {
      await onCancel(activeTicketId)
    } finally {
      setCanceling(false)
    }
  }

  const handlePriority = async () => {
    if (!activeTicketId || !onPriority) return
    await onPriority(activeTicketId)
  }

  const isCooking = remainingSeconds !== null && remainingSeconds !== undefined && remainingSeconds > 0
  const isQualityCheck = remainingSeconds !== null && remainingSeconds !== undefined && remainingSeconds <= 0
  const progress = totalSeconds && remainingSeconds !== null && remainingSeconds !== undefined
    ? Math.min(((totalSeconds - remainingSeconds) / totalSeconds) * 100, 100)
    : 0

  const holdTimeSeconds = item.holdTime ?? 600
  const qualityCheckElapsed = isQualityCheck && remainingSeconds !== null && remainingSeconds !== undefined
    ? Math.abs(remainingSeconds)
    : 0
  const holdTimeRemaining = holdTimeSeconds - qualityCheckElapsed
  const isHoldExpiring = isQualityCheck && holdTimeRemaining <= holdTimeSeconds / 2
  const isHoldExpired = isQualityCheck && holdTimeRemaining <= 0

  const imageUrl = item.imageUrl ? `${import.meta.env.VITE_API_URL || ''}${item.imageUrl}` : null

  const getTimeSinceLastCall = (date: Date | null | undefined) => {
    if (!date) return null
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    return {
      diffMins,
      formatted: diffMins < 1 ? 'Just now' :
                 diffMins < 60 ? `${diffMins}m ago` :
                 diffMins < 24 * 60 ? `${Math.floor(diffMins / 60)}h ago` :
                 `${Math.floor(diffMins / (24 * 60))}d ago`
    }
  }

  const timeSinceLastCall = getTimeSinceLastCall(lastCalledAt)
  
  const getQualityBadge = () => {
    if (!timeSinceLastCall) return null
    const mins = timeSinceLastCall.diffMins
    
    if (mins > 15) return { text: 'Call Now', variant: 'destructive' as const, style: 'destructive' }
    if (mins >= 10) return { text: 'B quality', variant: 'default' as const, style: 'warning' }
    if (mins < 5) return { text: 'A quality', variant: 'default' as const, style: 'success' }
    return null
  }
  
  const qualityBadge = getQualityBadge()

  let buttonText = 'Call'
  if (loading) buttonText = 'Calling…'
  else if (disabled && disabledReason) buttonText = disabledReason
  else if (isHoldExpired) buttonText = '⚠️ EXPIRED - DISCARD'
  else if (isQualityCheck) {
    buttonText = 'Almost done'
  }
  else if (isCooking) {
    const mins = Math.floor(remainingSeconds / 60)
    const secs = remainingSeconds % 60
    buttonText = `${mins}:${String(secs).padStart(2, '0')}`
  }

  let cardClassName = "flex flex-col"
  if (isHoldExpired) {
    cardClassName += " border-4 border-red-600 bg-red-50"
  } else if (isHoldExpiring) {
    cardClassName += " border-2 border-red-500 animate-pulse"
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className="pt-3 pb-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="font-bold text-base leading-tight">{item.code}</span>
              <div className={`h-1 w-full rounded-full ${
                item.color === 'blue' ? 'bg-blue-500' :
                item.color === 'red' ? 'bg-red-500' :
                item.color === 'green' ? 'bg-green-500' :
                item.color === 'orange' ? 'bg-orange-500' :
                item.color === 'yellow' ? 'bg-yellow-400' :
                'bg-transparent'
              }`} />
            </div>
            {(item.ingredients || item.allergens || item.nutrition) && (
              <button
                onClick={() => setShowInfo(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-4 w-4" />
              </button>
            )}
          </div>
          {qualityBadge ? (
            <Badge 
              variant={qualityBadge.variant} 
              className={`text-xs font-semibold ${
                qualityBadge.style === 'destructive' ? 'animate-pulse' :
                qualityBadge.style === 'warning' ? 'bg-yellow-500 text-white border-yellow-500' :
                qualityBadge.style === 'success' ? 'bg-green-500 text-white border-green-500' :
                ''
              }`}
            >
              {qualityBadge.text}
            </Badge>
          ) : timeSinceLastCall && (
            <span className="text-xs text-muted-foreground">
              {timeSinceLastCall.formatted}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wide mt-1 text-center">
          {item.title}
        </h3>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2 pt-0 space-y-2">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={item.title} 
            className={compact ? "w-full h-14 object-contain rounded" : "w-full aspect-[3/1] object-contain rounded"}
          />
        ) : (
          <ImagePlaceholder className={compact ? "h-14" : "aspect-[3/1]"} />
        )}
        
        <div className="min-h-[56px] flex items-center justify-center">
          {activeTicketId ? (
            <div className="flex flex-col items-center text-sm gap-1">
              <span className="text-muted-foreground">Recommended: <span className="font-semibold text-foreground">{recommendedBatch}</span></span>
              <span className="text-muted-foreground">Called: <span className="font-semibold text-foreground">{calledBatchSize ?? '—'}</span></span>
            </div>
          ) : item.batchSizes.length === 3 ? (
            <BatchToggle
              options={item.batchSizes}
              value={batchSize}
              onChange={setBatchSize}
              disabled={disabled}
              recommended={recommendedBatch}
            />
          ) : (
            <div className="flex gap-1 justify-center">
              {item.batchSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => !disabled && setBatchSize(size)}
                  disabled={disabled}
                  className={`
                    px-4 py-2 min-w-[44px] rounded-md font-medium transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${batchSize === size
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-3 px-3 flex flex-col gap-2">
        {(isCooking || isQualityCheck) ? (
          <div className="flex gap-2 w-full items-center">
            {activeTicketId && onPriority && (
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={handlePriority}
              >
                <Siren className="h-5 w-5" />
              </Button>
            )}
            <ProgressBar
              value={isCooking ? progress : 100}
              max={100}
              showText={true}
              text={buttonText}
              className="flex-1 h-12"
              complete={isQualityCheck}
            />
            {activeTicketId && onCancel && (
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={handleCancelClick}
                disabled={canceling}
              >
                <CircleX className="h-5 w-5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-2 w-full items-center">
            {activeTicketId && onPriority && (
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={handlePriority}
              >
                <Siren className="h-5 w-5" />
              </Button>
            )}
            <Button
              className="flex-1 h-12 text-base font-semibold"
              onClick={handleCall}
              disabled={loading || disabled}
            >
              {buttonText}
            </Button>
            {activeTicketId && onCancel && (
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={handleCancelClick}
                disabled={canceling}
              >
                <CircleX className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </CardFooter>

      <AlertDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Order?"
        description="This will cancel the cooking ticket. This action cannot be undone."
        cancelLabel="Go Back"
        actionLabel="Cancel Order"
        variant="destructive"
        onAction={handleCancelConfirm}
      />

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl bg-white text-gray-900">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-base font-bold text-gray-900">{item.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[80vh] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {imageUrl && (
              <img src={imageUrl} alt={item.title} className="w-full object-cover" />
            )}
            <div className="px-6 pb-6 space-y-4 pt-4">
              {item.ingredients && item.ingredients.length > 0 && (
                <p className="text-center text-xs text-gray-500 leading-relaxed">
                  {item.ingredients.slice(0, -1).join(', ')}{item.ingredients.length > 1 ? ' and ' : ''}{item.ingredients[item.ingredients.length - 1]}.
                </p>
              )}

              {item.allergens && item.allergens.length > 0 && (
                <div>
                  <p className="font-bold text-xs text-gray-900 mb-0.5">Allergens</p>
                  <p className="text-xs text-gray-500">
                    Contains {item.allergens.slice(0, -1).join(', ')}{item.allergens.length > 1 ? ' and ' : ''}{item.allergens[item.allergens.length - 1]}.
                  </p>
                </div>
              )}

              {item.nutrition && (
                <div>
                  <p className="font-bold text-xs text-gray-900 mb-1">Nutritional Information</p>
                  <div className="divide-y divide-gray-100">
                    {item.nutrition.serving_size_oz != null && (
                      <div className="flex justify-between py-1.5 text-xs">
                        <span className="text-gray-500">Serving Size</span>
                        <span className="font-medium text-gray-900">{item.nutrition.serving_size_oz}<span className="font-bold">OZ</span></span>
                      </div>
                    )}
                    {item.nutrition.protein_g != null && (
                      <div className="flex justify-between py-1.5 text-xs">
                        <span className="text-gray-500">Protein</span>
                        <span className="font-medium text-gray-900">{item.nutrition.protein_g}<span className="font-bold">g</span></span>
                      </div>
                    )}
                    {item.nutrition.saturated_fat_g != null && (
                      <div className="flex justify-between py-1.5 text-xs">
                        <span className="text-gray-500">Saturated Fat</span>
                        <span className="font-medium text-gray-900">{item.nutrition.saturated_fat_g}<span className="font-bold">g</span></span>
                      </div>
                    )}
                    {item.nutrition.carbohydrate_g != null && (
                      <div className="flex justify-between py-1.5 text-xs">
                        <span className="text-gray-500">Carbohydrate</span>
                        <span className="font-medium text-gray-900">{item.nutrition.carbohydrate_g}<span className="font-bold">g</span></span>
                      </div>
                    )}
                    {item.nutrition.calories_kcal != null && (
                      <div className="flex justify-between py-1.5 text-xs">
                        <span className="text-gray-500">Calories</span>
                        <span className="font-medium text-gray-900">{item.nutrition.calories_kcal}<span className="font-bold">cal</span></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
