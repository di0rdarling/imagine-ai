import { cn } from "@/lib/cn";

export interface FormSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function FormSection({
  title,
  description,
  className,
  children,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-zinc-100 bg-white p-5 text-zinc-900 shadow-xs sm:p-6",
        className,
      )}
    >
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs font-medium text-zinc-500 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}
