import { cn } from "@/lib/cn";

const appearanceClasses = {
  outline:
    "rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950",
  soft: "rounded-2xl bg-[#f4f4f6] px-4 text-zinc-900",
  compact: "rounded-xl bg-zinc-100 px-3 text-zinc-900",
} as const;

const sizeClasses = {
  md: "h-11 text-base md:text-sm",
  lg: "h-12 text-base md:text-sm",
  sm: "h-9 text-base md:text-xs",
} as const;

export type InputAppearance = keyof typeof appearanceClasses;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  appearance?: InputAppearance;
  inputSize?: keyof typeof sizeClasses;
  hasTrailing?: boolean;
}

export function Input({
  appearance = "outline",
  inputSize = "md",
  hasTrailing = false,
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        "w-full placeholder:text-zinc-400 outline-none ring-zinc-900/10 focus:ring-2 disabled:opacity-60",
        appearance === "outline"
          ? "text-zinc-900 dark:text-zinc-50"
          : "text-zinc-900",
        appearanceClasses[appearance],
        sizeClasses[inputSize],
        hasTrailing && appearance === "soft" && inputSize === "lg" && "pr-16",
        hasTrailing && appearance === "soft" && inputSize !== "lg" && "pr-14",
        className,
      )}
      {...props}
    />
  );
}
