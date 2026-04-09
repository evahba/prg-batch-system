import { useState } from 'react'
import { HiddenNav } from '@/components/HiddenNav'
import { TopBanner } from '@/components/TopBanner'
import { ScreenContent } from '@/components/ScreenContent'
import { useSocket } from '@/hooks/useSocket'
import type { ScreenId } from '@/types/screen'
import './App.css'

function App() {
  const [screen, setScreen] = useState<ScreenId>(1)
  const socketState = useSocket(screen)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <HiddenNav current={screen} onSelect={setScreen} />
      <TopBanner />

      <main className="flex-1 overflow-hidden flex flex-col pt-16">
        <ScreenContent screen={screen} socketState={socketState} />
      </main>
    </div>
  )
}

export default App
