import { cn } from "@/lib/cn";

export function CheckIndicator({
  checked,
  className,
}: {
  checked: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
        checked
          ? "border-pink-500 bg-pink-500 text-white"
          : "border-zinc-300 bg-white",
        className,
      )}
      aria-hidden
    >
      {checked ? (
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
    </span>
  );
}
