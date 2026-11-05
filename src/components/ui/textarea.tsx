import { cn } from "@/lib/cn";

const appearanceClasses = {
  outline:
    "rounded-lg border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950",
  soft: "rounded-2xl bg-[#f4f4f6] p-4 text-zinc-900",
} as const;

export type TextareaAppearance = keyof typeof appearanceClasses;

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  appearance?: TextareaAppearance;
  withCharCount?: boolean;
}

export function Textarea({
  appearance = "outline",
  withCharCount = false,
  className,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full text-base md:text-sm leading-relaxed placeholder:text-zinc-400 outline-none ring-zinc-900/10 focus:ring-2 resize-none",
        appearance === "outline"
          ? "text-zinc-900 dark:text-zinc-50"
          : "text-zinc-900",
        appearanceClasses[appearance],
        withCharCount && "pb-7",
        className,
      )}
      {...props}
    />
  );
}
