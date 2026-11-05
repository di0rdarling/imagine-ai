"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import {
  parseCharacterFormData,
  validateCharacterInput,
  type CharacterInput,
} from "@/lib/character-validation";
import { createCharacter, deleteCharacter, getCharacterById, updateCharacter } from "@/lib/characters";

export type CharacterActionState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof CharacterInput, string>>;
  success?: boolean;
  characterId?: string;
};

export async function createCharacterAction(
  _prevState: CharacterActionState,
  formData: FormData,
): Promise<CharacterActionState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: "You must be signed in to create a character.",
    };
  }

  const fields = parseCharacterFormData(formData);
  const validation = validateCharacterInput(fields);

  if (!validation.isValid) {
    return {
      error: "Please review the highlighted fields.",
      fieldErrors: validation.errors,
    };
  }

  try {
    const created = await createCharacter(fields, session.user.id);
    revalidatePath("/characters");
    return {
      success: true,
      characterId: created._id.toString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to create character. Please try again." };
  }
}

export async function updateCharacterAction(
  characterId: string,
  _prevState: CharacterActionState,
  formData: FormData,
): Promise<CharacterActionState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: "You must be signed in to edit a character.",
    };
  }

  const existing = await getCharacterById(characterId);
  if (!existing) {
    return { error: "Character not found." };
  }

  if (existing.userId.toString() !== session.user.id) {
    return { error: "You do not have permission to edit this character." };
  }

  const fields = parseCharacterFormData(formData);
  const validation = validateCharacterInput(fields);

  if (!validation.isValid) {
    return {
      error: "Please review the highlighted fields.",
      fieldErrors: validation.errors,
    };
  }

  try {
    const updated = await updateCharacter(characterId, session.user.id, fields);
    if (!updated) {
      return { error: "Could not update character. Please try again." };
    }

    revalidatePath("/characters");
    revalidatePath(`/characters/${characterId}`);
    revalidatePath(`/characters/${characterId}/edit`);

    return {
      success: true,
      characterId: updated._id.toString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to update character. Please try again." };
  }
}

export async function deleteCharacterAction(
  characterId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  const deleted = await deleteCharacter(characterId, session.user.id);
  if (!deleted) {
    return {
      success: false,
      error: "Could not delete character or you do not have permission.",
    };
  }

  revalidatePath("/characters");
  return { success: true };
}
