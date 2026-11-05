import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";

import { authOptions } from "@/lib/auth";
import { getCharacterById } from "@/lib/characters";
import {
  CharacterCreateForm,
  type CharacterFormInitialValues,
} from "@/app/characters/new/character-create-form";

interface EditCharacterPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditCharacterPageProps): Promise<Metadata> {
  const { id } = await params;
  const character = await getCharacterById(id);
  if (!character) {
    return { title: "Character Not Found" };
  }
  return {
    title: `Edit ${character.name}`,
    description: `Update ${character.name}'s profile, story settings, and visibility.`,
  };
}

export default function EditCharacterPage({ params }: EditCharacterPageProps) {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-3 sm:px-6 py-4">
      <Suspense
        fallback={
          <div className="py-10 text-center text-sm text-zinc-500">Loading character…</div>
        }
      >
        <EditCharacterContent params={params} />
      </Suspense>
    </main>
  );
}

async function EditCharacterContent({ params }: EditCharacterPageProps) {
  const { id } = await params;
  const character = await getCharacterById(id);

  if (!character) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/characters/${id}/edit`);
  }

  if (character.userId.toString() !== session.user.id) {
    redirect(`/characters/${id}`);
  }

  const initialValues: CharacterFormInitialValues = {
    name: character.name,
    avatarUrl: character.avatarUrl,
    height: character.height ?? "",
    age: character.age,
    gender: character.gender,
    occupation: character.occupation,
    tags: character.tags,
    profile: character.profile,
    greeting: character.greeting,
    background: character.background ?? "",
    visibility: character.visibility,
  };

  return (
    <CharacterCreateForm mode="edit" characterId={id} initialValues={initialValues} />
  );
}
