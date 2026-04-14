import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const variants = {
  primary: 'bg-gradient-to-r from-[hsl(244_73%_50%)] to-[hsl(244_73%_58%)] text-primary-foreground hover:opacity-95 shadow-[0_16px_34px_-18px_hsl(var(--primary)/0.75)]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/85',
  ghost: 'bg-transparent hover:bg-accent/80 hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_12px_28px_-18px_hsl(var(--destructive))]',
  outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
};

const sizes = {
  sm: 'h-10 px-4 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
