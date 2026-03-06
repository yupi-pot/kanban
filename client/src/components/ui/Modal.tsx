import { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-10 w-full max-w-md bg-[#1A1A24] rounded-[12px] border border-[#2A2A38] shadow-[0_24px_48px_rgba(0,0,0,0.6)]"
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A38]">
                <h2 className="text-[15px] font-semibold text-[#E8E8F0]">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-[#6B6B80] hover:text-[#E8E8F0] transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
