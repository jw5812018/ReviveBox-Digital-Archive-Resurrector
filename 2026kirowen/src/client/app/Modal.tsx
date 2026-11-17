import { useEffect, useRef, useState, type ReactNode } from 'react'

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
 *
 * The trigger is captured during the first render, before a child field's
 * autoFocus moves focus into the dialog. onClose is read through a ref so a
 * parent re-render (new callback identity) does not re-run the effect and
 * pull focus back to the first field.
 */
export function Modal({ label, wide, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [trigger] = useState<Element | null>(() => document.activeElement)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog
        .querySelector<HTMLElement>(
          'input, textarea, button, [tabindex]:not([tabindex="-1"])',
        )
        ?.focus()
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus()
      }
    }
  }, [trigger])

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