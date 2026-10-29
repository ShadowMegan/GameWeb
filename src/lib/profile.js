export const AVATAR_ICONS = [
  { id: 'gamepad', label: 'Gamepad' },
  { id: 'zap', label: 'Rayo' },
  { id: 'flame', label: 'Llama' },
  { id: 'skull', label: 'Calavera' },
  { id: 'crown', label: 'Corona' },
]

export const NEON_COLORS = [
  { id: 'pink', label: 'Rosa', value: '#ff2e88' },
  { id: 'cyan', label: 'Cian', value: '#00e5ff' },
  { id: 'purple', label: 'Púrpura', value: '#8a2be2' },
  { id: 'yellow', label: 'Amarillo', value: '#ffd319' },
  { id: 'green', label: 'Verde', value: '#00ff41' },
]

export function getAvatarIcon(id) {
  return AVATAR_ICONS.find((a) => a.id === id) ?? AVATAR_ICONS[0]
}

export function getNeonColor(id) {
  return NEON_COLORS.find((c) => c.id === id) ?? NEON_COLORS[0]
}
