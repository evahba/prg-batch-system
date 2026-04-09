import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function TopBanner() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed top-8 left-0 right-0 z-40 h-8 bg-red-600 flex items-center justify-between px-4">
        <span className="text-white text-sm font-semibold">Batch Caller 1.0</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-white text-sm font-medium hover:underline"
        >
          Made by Oleg
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground">Oleg Kuftyrev</span>
            <span className="text-muted-foreground">oleg.kuftyrev@pandarg.com</span>
            <span className="text-muted-foreground">714.249.5376</span>
            <span className="text-muted-foreground">EID: 1565789</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
