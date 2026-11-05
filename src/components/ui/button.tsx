import { cn } from "@/lib/cn";

const variantClasses = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
  soft: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
  danger: "bg-rose-50 text-rose-700 hover:bg-rose-100",
  dangerSolid: "bg-rose-600 text-white hover:bg-rose-700",
} as const;

const sizeClasses = {
  xs: "h-8 gap-1 rounded-full px-3 text-xs font-medium",
  sm: "h-9 gap-1.5 rounded-full px-3.5 text-xs font-medium",
  md: "h-11 gap-2 rounded-full px-6 text-sm font-medium",
  lg: "min-h-12 gap-2 rounded-full px-8 py-3 text-base font-semibold",
  icon: "h-9 w-9 rounded-full p-0",
  iconSm: "h-8 w-8 rounded-full p-0",
} as const;

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
