import { cn } from "@/lib/cn";

export function FieldError({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p className={cn("mt-1 text-xs text-rose-500", className)} role="alert">
      {message}
    </p>
  );
}
