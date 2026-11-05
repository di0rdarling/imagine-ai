import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";

import { authOptions } from "@/lib/auth";
import { getCharactersByUserId, getPublicCharacters, type CharacterDocument } from "@/lib/characters";
import { DeleteCharacterButton } from "./delete-character-button";

export const metadata: Metadata = {
  title: "Characters",
  description: "Create, view, and interact with your AI story characters.",
};

export default function CharactersPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 sm:px-6 py-8">
      <Suspense fallback={<CharactersPageFallback />}>
        <CharactersPageContent />
      </Suspense>
    </main>
  );
}

function CharactersPageFallback() {
  return (
    <div className="mx-auto max-w-5xl py-12 text-center text-sm text-zinc-500">
      Loading story characters…
    </div>
  );
}

async function CharactersPageContent() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let myCharacters: CharacterDocument[] = [];
  if (userId) {
    myCharacters = await getCharactersByUserId(userId);
  }

  const publicCharacters = await getPublicCharacters(12);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            Story Characters
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Set up characters, step into their narratives, and converse in interactive story mode.
          </p>
        </div>

        <Link
          href="/characters/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white hover:bg-zinc-800 shadow-sm transition"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Character
        </Link>
      </div>

      {/* My Characters Section */}
      {session?.user ? (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-900">My Characters</h2>
            <span className="text-xs font-semibold text-zinc-500">
              {myCharacters.length} created
            </span>
          </div>

          {myCharacters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-2xl">
                🎭
              </div>
              <h3 className="mt-4 text-base font-bold text-zinc-900">
                You haven&apos;t created any characters yet
              </h3>
              <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                Bring a character to life with custom traits, background, and initial greetings.
              </p>
              <Link
                href="/characters/new"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white hover:bg-zinc-800 transition"
              >
                Create Your First Character
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myCharacters.map((char) => (
                <CharacterCard
                  key={char._id.toString()}
                  character={char}
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              Save & Manage Your AI Characters
            </h2>
            <p className="text-sm text-zinc-500">
              Sign in to create your own characters and resume stories across devices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in?callbackUrl=/characters"
              className="h-9 inline-flex items-center rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="h-9 inline-flex items-center rounded-full bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}

      {/* Discover / Public Characters Section */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Explore Characters</h2>
            <p className="text-xs text-zinc-500">
              Public characters ready to enter story mode with.
            </p>
          </div>
        </div>

        {publicCharacters.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
            No public characters published yet. Be the first to publish one!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {publicCharacters.map((char) => (
              <CharacterCard
                key={char._id.toString()}
                character={char}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CharacterCard({
  character,
  isOwner,
}: {
  character: CharacterDocument;
  isOwner?: boolean;
}) {
  const idStr = character._id.toString();

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md hover:border-zinc-300">
      <div>
        <div className="flex items-start gap-3">
          <Link href={`/characters/${idStr}`} className="shrink-0">
            {character.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="h-14 w-14 rounded-2xl object-cover border border-zinc-200"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-white">
                {character.name.charAt(0)}
              </div>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <Link href={`/characters/${idStr}`} className="truncate">
                <h3 className="font-bold text-zinc-900 group-hover:text-zinc-600 transition truncate">
                  {character.name}
                </h3>
              </Link>
              <div className="flex items-center gap-1">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                    character.visibility === "public"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {character.visibility}
                </span>
                {isOwner && (
                  <DeleteCharacterButton
                    characterId={idStr}
                    characterName={character.name}
                  />
                )}
              </div>
            </div>

            <p className="text-xs font-medium text-zinc-500 truncate">
              {character.occupation} • Age {character.age}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {character.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
            >
              #{tag}
            </span>
          ))}
          {character.tags.length > 3 && (
            <span className="text-[10px] text-zinc-400">
              +{character.tags.length - 3}
            </span>
          )}
        </div>

        {/* Greeting snippet */}
        <p className="mt-3 text-xs leading-relaxed text-zinc-600 line-clamp-2 italic bg-[#f8f9fa] p-2.5 rounded-xl border border-zinc-100">
          &ldquo;{character.greeting}&rdquo;
        </p>
      </div>

      <Link
        href={`/characters/${idStr}`}
        className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-900 group-hover:text-zinc-600 transition"
      >
        <span>Enter Story Mode</span>
        <svg
          className="h-4 w-4 transform transition-transform group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}
