import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";

import { authOptions } from "@/lib/auth";
import { getCharacterById } from "@/lib/characters";
import { getConversation } from "@/lib/story-conversations";
import { serializeStoryMemory } from "@/lib/story-memory";
import { type StoryModeId } from "@/lib/story-modes";
import { CharacterStoryView } from "./character-story-view";

interface CharacterPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CharacterPageProps): Promise<Metadata> {
  const { id } = await params;
  const character = await getCharacterById(id);
  if (!character) {
    return { title: "Character Not Found" };
  }
  return {
    title: `${character.name} | Imagine AI Story Mode`,
    description: character.profile,
  };
}

export default function CharacterDetailPage({ params }: CharacterPageProps) {
  return (
    <main className="h-dvh flex flex-col bg-white overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
            Loading character…
          </div>
        }
      >
        <CharacterDetailContent params={params} />
      </Suspense>
    </main>
  );
}

async function CharacterDetailContent({ params }: CharacterPageProps) {
  const { id } = await params;
  const character = await getCharacterById(id);

  if (!character) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const isOwner = Boolean(
    session?.user?.id && character.userId.toString() === session.user.id,
  );

  let initialMessages: Array<{
    id: string;
    sender: "character" | "user";
    text: string;
  }> | null = null;
  let initialMode: StoryModeId | undefined = undefined;
  let initialCast = character.supportingCast ?? [];
  let initialStoryMemory = null;

  if (session?.user?.id) {
    const saved = await getConversation(character._id, session.user.id);
    if (saved) {
      if (saved.mode) {
        initialMode = saved.mode;
      }
      if (saved.supportingCast !== undefined) {
        initialCast = saved.supportingCast;
      }
      initialStoryMemory = serializeStoryMemory(saved.storyMemory);
      if (saved.messages && saved.messages.length > 0) {
        initialMessages = saved.messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
        }));
      }
    }
  }

  return (
    <CharacterStoryView
      character={{
        id: character._id.toString(),
        name: character.name,
        avatarUrl: character.avatarUrl,
        height: character.height,
        age: character.age,
        gender: character.gender,
        occupation: character.occupation,
        tags: character.tags,
        profile: character.profile,
        greeting: character.greeting,
        background: character.background,
        visibility: character.visibility,
        createdAt: character.createdAt.toISOString(),
        isOwner,
        supportingCast: character.supportingCast ?? [],
      }}
      userName={session?.user?.name || null}
      initialMessages={initialMessages}
      initialMode={initialMode}
      initialCast={initialCast}
      initialStoryMemory={initialStoryMemory}
    />
  );
}
