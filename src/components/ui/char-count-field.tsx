import { cn } from "@/lib/cn";
import { Input, type InputProps } from "@/components/ui/input";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";

function CharCountBadge({
  current,
  max,
  position = "input",
}: {
  current: number;
  max: number;
  position?: "input" | "textarea";
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute text-xs font-semibold text-zinc-400",
        position === "input" && "right-4 top-1/2 -translate-y-1/2",
        position === "textarea" && "bottom-3 right-4",
      )}
    >
      {current}/{max}
    </span>
  );
}

export interface CharCountInputProps extends InputProps {
  value: string;
  maxLength: number;
}

export function CharCountInput({
  value,
  maxLength,
  appearance = "soft",
  inputSize = "lg",
  className,
  ...props
}: CharCountInputProps) {
  return (
    <div className="relative">
      <Input
        appearance={appearance}
        inputSize={inputSize}
        hasTrailing
        value={value}
        maxLength={maxLength}
        className={className}
        {...props}
      />
      <CharCountBadge current={value.length} max={maxLength} position="input" />
    </div>
  );
}

export interface CharCountTextareaProps extends TextareaProps {
  value: string;
  maxLength: number;
}

export function CharCountTextarea({
  value,
  maxLength,
  appearance = "soft",
  className,
  ...props
}: CharCountTextareaProps) {
  return (
    <div className="relative">
      <Textarea
        appearance={appearance}
        withCharCount
        value={value}
        maxLength={maxLength}
        className={className}
        {...props}
      />
      <CharCountBadge
        current={value.length}
        max={maxLength}
        position="textarea"
      />
    </div>
  );
}
