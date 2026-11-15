import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  label: string
  wide?: boolean
  children: ReactNode
  onClose: () => void
}

/**
 * Dialog wrapper with baseline focus management (R10 AC3, AC9):
 * - Esc closes
 * - focus moves into the dialog on open and returns to the trigger on close
 */
export function Modal({ label, wide, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    triggerRef.current = document.activeElement
    const dialog = dialogRef.current
    const focusable = dialog?.querySelector<HTMLElement>(
      'input, textarea, button, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className={`modal${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  )
}