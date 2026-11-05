import { cn } from "@/lib/cn";
import { CheckIndicator } from "@/components/ui/check-indicator";

export interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ChoiceCard({
  selected,
  onSelect,
  title,
  icon,
  className,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex h-14 w-full items-center justify-between rounded-2xl px-5 text-left transition",
        selected
          ? "border border-zinc-300 bg-zinc-100/90"
          : "bg-[#f4f4f6] hover:bg-zinc-200/80",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-base font-bold text-zinc-900">
          {title}
        </span>
      </div>
      <CheckIndicator checked={selected} />
    </button>
  );
}
