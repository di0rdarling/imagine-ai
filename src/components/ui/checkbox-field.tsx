import { cn } from "@/lib/cn";
import { CheckIndicator } from "@/components/ui/check-indicator";

export interface CheckboxFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: React.ReactNode;
  id?: string;
  className?: string;
}

export function CheckboxField({
  checked,
  onCheckedChange,
  label,
  id,
  className,
}: CheckboxFieldProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className="mt-0.5 shrink-0"
      >
        <CheckIndicator checked={checked} />
      </button>
      <button
        type="button"
        onClick={() => onCheckedChange(!checked)}
        className="cursor-pointer select-none text-left text-xs font-semibold leading-snug text-zinc-700 sm:text-sm"
      >
        {label}
      </button>
    </div>
  );
}
