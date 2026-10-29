import { Gamepad2, Zap, Flame, Skull, Crown } from 'lucide-react'
import { NEON_COLORS } from '../lib/profile.js'

const ICON_MAP = {
  gamepad: Gamepad2,
  zap: Zap,
  flame: Flame,
  skull: Skull,
  crown: Crown,
}

function ArcadeAvatar({ user, size = 'md' }) {
  const avatarId = user?.avatar || 'gamepad'
  const colorId = user?.neonColor || 'pink'
  const Icon = ICON_MAP[avatarId] ?? Gamepad2
  const color = NEON_COLORS.find((c) => c.id === colorId)?.value ?? '#ff2e88'

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center shrink-0`}
      style={{
        border: `2px solid ${color}`,
        background: `${color}1f`,
        boxShadow: `0 0 12px ${color}66`,
      }}
      aria-hidden="true"
    >
      <Icon className={iconSizes[size]} style={{ color }} />
    </div>
  )
}

export default ArcadeAvatar
