import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[] | SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  columns = 3,
}: SegmentedControlProps<T>) {
  const gridCols =
    columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className={cn("grid gap-2", gridCols, className)} role="group">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "flex h-11 items-center justify-center rounded-2xl text-xs font-medium transition sm:text-sm",
              selected
                ? "bg-zinc-900 font-semibold text-white shadow-xs"
                : "bg-[#f4f4f6] text-zinc-600 hover:bg-zinc-200/80",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
