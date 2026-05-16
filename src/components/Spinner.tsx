interface Props {
  label?: string
}

export function Spinner({ label = 'Loading…' }: Props) {
  return (
    <div class="nkp-loading" aria-live="polite" aria-busy="true">
      <div class="nkp-spinner" />
      <span>{label}</span>
    </div>
  )
}
