import { useState } from 'react'
import { HiddenNav } from '@/components/HiddenNav'
import { ScreenContent } from '@/components/ScreenContent'
import { useSocket } from '@/hooks/useSocket'
import type { ScreenId } from '@/types/screen'
import './App.css'

function App() {
  const [screen, setScreen] = useState<ScreenId>(1)
  const socketState = useSocket(screen)

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ height: '100%', minHeight: '-webkit-fill-available' }}>
      <HiddenNav current={screen} onSelect={setScreen} />

      <main className="flex-1 overflow-hidden flex flex-col pt-8">
        <ScreenContent screen={screen} socketState={socketState} />
      </main>
    </div>
  )
}

export default App
