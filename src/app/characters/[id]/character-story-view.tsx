"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteCharacterButton } from "@/app/characters/delete-character-button";
import { Button, Input } from "@/components/ui";

export type SerializedCharacter = {
  id: string;
  name: string;
  avatarUrl: string | null;
  height: string | null;
  age: string;
  gender: string;
  occupation: string;
  tags: string[];
  profile: string;
  greeting: string;
  background: string | null;
  visibility: "private" | "public";
  createdAt: string;
  isOwner: boolean;
};

interface CharacterStoryViewProps {
  character: SerializedCharacter;
}

type ChatMessage = {
  id: string;
  sender: "character" | "user";
  text: string;
};

export function CharacterStoryView({ character }: CharacterStoryViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"story" | "info">("story");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "greeting",
      sender: "character",
      text: character.greeting,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const userText = inputMessage.trim();
    if (!userText || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    // Dynamic story simulation response based on character personality
    setTimeout(() => {
      let reply = "";
      if (userText.toLowerCase().includes("hello") || userText.toLowerCase().includes("hi")) {
        reply = `*nods acknowledgingly* Good to meet you. In this world, we have to stay alert. What brings you here?`;
      } else if (userText.toLowerCase().includes("who are you") || userText.toLowerCase().includes("name")) {
        reply = `*adjusts stance* I am ${character.name}, ${character.occupation.toLowerCase()}. ${character.profile.slice(0, 120)}...`;
      } else {
        reply = `*considers your words carefully* "${userText}"... interesting. As a ${character.occupation.toLowerCase()}, I've seen many things, but your presence might change the story completely. What is your next move?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `char-${Date.now()}`,
          sender: "character",
          text: reply,
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Top Bar */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/characters"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Characters
        </Link>

        {character.isOwner ? (
          <DeleteCharacterButton
            variant="text"
            characterId={character.id}
            characterName={character.name}
            onDeleted={() => router.push("/characters")}
          />
        ) : null}
      </div>

      {/* Main Character Identity Card */}
      <div className="rounded-3xl border border-zinc-100 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-4">
          {character.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl object-cover border border-zinc-200"
            />
          ) : (
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-2xl font-bold text-white">
              {character.name.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 truncate">
                {character.name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  character.visibility === "public"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}
              >
                {character.visibility}
              </span>
            </div>

            <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-500">
              {character.occupation} • Age {character.age}
              {character.height ? ` • ${character.height} cm` : ""} • {character.gender}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {character.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tab selection */}
        <div className="mt-6 flex border-b border-zinc-100">
          <button
            onClick={() => setActiveTab("story")}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === "story"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            } mr-6`}
          >
            Story Mode & Chat
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === "info"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Character Dossier
          </button>
        </div>

        {/* Content Tabs */}
        {activeTab === "story" ? (
          <div className="mt-5 flex flex-col gap-4">
            {/* Story Chat Stream */}
            <div className="flex flex-col gap-3 min-h-[300px] max-h-[480px] overflow-y-auto p-2 bg-[#f8f9fa] rounded-2xl">
              {messages.map((msg) => {
                const isChar = msg.sender === "character";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isChar ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                        isChar
                          ? "bg-white text-zinc-900 border border-zinc-200/80 shadow-xs"
                          : "bg-zinc-900 text-white shadow-xs"
                      }`}
                    >
                      {isChar && (
                        <p className="mb-1 text-xs font-bold text-zinc-400">
                          {character.name}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-2.5 text-xs font-medium text-zinc-400 animate-pulse">
                    {character.name} is formulating a response…
                  </div>
                </div>
              )}
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                appearance="soft"
                inputSize="lg"
                className="flex-1"
                placeholder={`Talk to ${character.name}... (e.g. "What is our mission?")`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="rounded-2xl"
              >
                Send
              </Button>
            </form>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Public Profile
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
                {character.profile}
              </p>
            </div>

            {character.background && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Private Background
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {character.background}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
