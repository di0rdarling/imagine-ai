import { cn } from "@/lib/cn";
import { FieldError } from "@/components/ui/field-error";

export interface FormFieldProps {
  id?: string;
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn(className)}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-zinc-800"
      >
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {hint ? (
        <p className="mt-0.5 text-xs font-medium text-zinc-500">{hint}</p>
      ) : null}
      <div className="mt-2">{children}</div>
      <FieldError message={error} />
    </div>
  );
}

/** Auth-style label stack (lighter label weight). */
export function AuthFormField({
  id,
  label,
  error,
  children,
}: Omit<FormFieldProps, "required" | "hint">) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      <FieldError message={error} className="mt-0" />
    </label>
  );
}
