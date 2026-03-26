import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import type { ScreenId } from '@/types/screen'
import { cn } from '@/lib/utils'

type Props = {
  current: ScreenId
  onSelect: (screen: ScreenId) => void
}

const SCREENS: { id: ScreenId; label: string }[] = [
  { id: 1, label: 'FOH' },
  { id: 2, label: 'Drive-thru' },
  { id: 3, label: 'Stir fry+Grill' },
  { id: 4, label: 'Fryer' },
  { id: 5, label: 'Sides' },
  { id: 'menu', label: 'Menu' },
]

export function ScreenNav({ current, onSelect }: Props) {
  return (
    <NavigationMenu className="max-w-none grow-0 shrink-0 justify-start">
      <NavigationMenuList className="flex-wrap gap-1 border-b-0 bg-transparent p-3">
        {SCREENS.map(({ id, label }) => (
          <NavigationMenuItem key={String(id)}>
            <NavigationMenuLink asChild>
              <button
                type="button"
                className={cn(
                  navigationMenuTriggerStyle(),
                  current === id && 'bg-accent'
                )}
                onClick={() => onSelect(id)}
              >
                {label}
              </button>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
