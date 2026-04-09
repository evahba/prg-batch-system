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
          <div className="text-sm text-muted-foreground">
            Contacts coming soon.
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
