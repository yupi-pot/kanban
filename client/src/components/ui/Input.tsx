import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[13px] text-[#6B6B80] font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-[#0F0F13] border rounded-[8px] px-3 py-2 text-[14px] text-[#E8E8F0]
            placeholder:text-[#6B6B80] outline-none transition-all duration-150
            ${error
              ? 'border-[#FF4D6A] focus:border-[#FF4D6A]'
              : 'border-[#2A2A38] focus:border-[#7C5CFC]'
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[12px] text-[#FF4D6A]">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
