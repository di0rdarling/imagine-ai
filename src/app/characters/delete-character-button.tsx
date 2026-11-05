"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteCharacterAction } from "@/app/characters/actions";
import { Button } from "@/components/ui";

interface DeleteCharacterButtonProps {
  characterId: string;
  characterName: string;
  variant?: "icon" | "text";
  /** Called after successful delete; defaults to router.refresh(). */
  onDeleted?: () => void;
}

export function DeleteCharacterButton({
  characterId,
  characterName,
  variant = "icon",
  onDeleted,
}: DeleteCharacterButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${characterName}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteCharacterAction(characterId);
      if (res.success) {
        if (onDeleted) {
          onDeleted();
        } else {
          router.refresh();
        }
      } else {
        alert(res.error || "Failed to delete character.");
      }
    });
  };

  if (variant === "text") {
    return (
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Delete"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="iconSm"
      onClick={handleDelete}
      disabled={isPending}
      title={`Delete ${characterName}`}
      aria-label={`Delete ${characterName}`}
      className="text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
    >
      {isPending ? (
        <span className="text-xs">…</span>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      )}
    </Button>
  );
}
