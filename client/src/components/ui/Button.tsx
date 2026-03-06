import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const base = 'inline-flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px]'

    const variants = {
      primary: 'bg-[#7C5CFC] hover:bg-[#9B7FFF] text-white',
      ghost: 'bg-transparent hover:bg-[#2A2A38] text-[#E8E8F0] border border-[#2A2A38] hover:border-[#3A3A50]',
      danger: 'bg-transparent hover:bg-[#FF4D6A]/10 text-[#FF4D6A] border border-[#2A2A38] hover:border-[#FF4D6A]/40',
    }

    const sizes = {
      sm: 'text-[13px] px-3 py-1.5',
      md: 'text-[14px] px-4 py-2',
    }

    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
