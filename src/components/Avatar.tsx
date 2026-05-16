interface Props {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg'
  ringColor?: string | null
  badge?: number
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'nkp-avatar',
  md: 'nkp-avatar',
  lg: 'nkp-avatar lg',
}

export function Avatar({ src, name, size = 'md', ringColor, badge }: Props) {
  const cls = SIZE_CLASS[size] ?? 'nkp-avatar'
  const style = ringColor ? { borderColor: ringColor } : undefined
  const initial = name ? name.charAt(0).toUpperCase() : '?'

  return (
    <div class={cls} style={style}>
      {src ? (
        <img src={src} alt={name ?? 'User'} loading="lazy" />
      ) : (
        <div class="nkp-avatar-placeholder">{initial}</div>
      )}
      {badge != null && badge > 0 && (
        <span class="nkp-badge">{badge > 99 ? '99+' : badge}</span>
      )}
    </div>
  )
}
