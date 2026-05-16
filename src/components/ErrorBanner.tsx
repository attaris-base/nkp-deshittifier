interface Props {
  message?: string
  onRetry?: () => void
}

export function ErrorBanner({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <div class="nkp-error" role="alert">
      <span class="nkp-error-text">⚠️ {message}</span>
      {onRetry && (
        <button class="nkp-retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
