import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from '../../context/ThemeContext'
import { ActionMenu } from './ActionMenu'

const modes: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, isDark, setMode } = useTheme()
  const Current = isDark ? Moon : Sun
  return (
    <ActionMenu
      className={className}
      label={`Theme: ${mode}. Choose light, dark or system.`}
      trigger={
        <span className="icon-btn border border-line bg-surface/80" aria-hidden="true">
          <Current size={17} />
        </span>
      }
      items={modes.map(({ value, label, icon: Icon }) => ({
        label,
        icon: (
          <span className="flex w-4 justify-center">
            {mode === value ? <Check size={15} className="text-primary" /> : <Icon size={15} className="text-muted" />}
          </span>
        ),
        onClick: () => setMode(value),
      }))}
    />
  )
}
