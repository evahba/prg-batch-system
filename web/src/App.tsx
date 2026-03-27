import { useState, useEffect } from 'react'
// import { HiddenNav } from '@/components/HiddenNav'
import { ScreenContent } from '@/components/ScreenContent'
import { useSocket } from '@/hooks/useSocket'
import type { ScreenId } from '@/types/screen'
import './App.css'

const PATH_TO_SCREEN: Record<string, ScreenId> = {
  '/sc1': 1,
  '/sc2': 2,
  '/sc3': 3,
  '/sc4': 4,
  '/sc5': 5,
  '/menu': 'menu',
}

const SCREEN_TO_PATH: Record<string, string> = {
  '1': '/sc1',
  '2': '/sc2',
  '3': '/sc3',
  '4': '/sc4',
  '5': '/sc5',
  'menu': '/menu',
}

function getScreenFromPath(): ScreenId {
  return PATH_TO_SCREEN[window.location.pathname] ?? 1
}

function App() {
  const [screen, setScreen] = useState<ScreenId>(getScreenFromPath)
  const socketState = useSocket(screen)

  useEffect(() => {
    const path = SCREEN_TO_PATH[String(screen)]
    if (path && window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
  }, [screen])

  useEffect(() => {
    const onPop = () => setScreen(getScreenFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ height: '100%', minHeight: '-webkit-fill-available' }}>
      {/* <HiddenNav current={screen} onSelect={setScreen} /> */}

      <main className="flex-1 overflow-hidden flex flex-col">
        <ScreenContent screen={screen} socketState={socketState} />
      </main>
    </div>
  )
}

export default App
