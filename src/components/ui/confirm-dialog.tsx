"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  className?: string;
}

/** Modal confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isPending = false,
  className,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Dismiss dialog"
        onClick={onCancel}
        disabled={isPending}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className={cn(
          "relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl text-zinc-900 [color-scheme:light]",
          className,
        )}
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-lg">
          ⚠️
        </div>
        <h2 id="confirm-dialog-title" className="text-lg font-bold tracking-tight text-zinc-900">
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="mt-2 text-sm leading-relaxed text-zinc-600"
        >
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="dangerSolid"
            onClick={onConfirm}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
