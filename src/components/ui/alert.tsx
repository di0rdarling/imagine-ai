import { cn } from "@/lib/cn";

const toneClasses = {
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  info: "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
} as const;

export type AlertTone = keyof typeof toneClasses;

export interface AlertProps {
  tone?: AlertTone;
  className?: string;
  children: React.ReactNode;
}

export function Alert({ tone = "info", className, children }: AlertProps) {
  return (
    <p
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        toneClasses[tone],
        className,
      )}
      role="status"
    >
      {children}
    </p>
  );
}

const cardToneClasses = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-zinc-200 bg-zinc-50 text-zinc-800",
} as const;

/** Rounded card alert used on character flows (always light). */
export function AlertCard({ tone = "info", className, children }: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 text-xs sm:text-sm",
        cardToneClasses[tone],
        className,
      )}
      role="status"
    >
      {children}
    </div>
  );
}
