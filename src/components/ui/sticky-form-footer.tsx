import { cn } from "@/lib/cn";

export function StickyFormFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent px-4 pb-6 pt-3",
        className,
      )}
    >
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}
