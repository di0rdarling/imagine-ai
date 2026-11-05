"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DeleteCharacterButton } from "@/app/characters/delete-character-button";
import { Button, ConfirmDialog, Input } from "@/components/ui";

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

function createInitialMessages(greeting: string): ChatMessage[] {
  return [
    {
      id: "greeting",
      sender: "character",
      text: greeting,
    },
  ];
}

export function CharacterStoryView({ character }: CharacterStoryViewProps) {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"story" | "info">("story");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    createInitialMessages(character.greeting),
  );
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const hasConversation = messages.some((message) => message.sender === "user");

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === "story") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, activeTab]);

  const handleResetConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
    setChatError(null);
    setInputMessage("");
    setMessages(createInitialMessages(character.greeting));
    setShowResetConfirm(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = inputMessage.trim();
    if (!userText || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputMessage("");
    setIsTyping(true);
    setChatError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/characters/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterId: character.id,
          messages: nextMessages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to get a response`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `char-${Date.now()}`,
          sender: "character",
          text: data.reply,
        },
      ]);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to communicate with the character.";
      setChatError(message);
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-1 flex-col text-zinc-900 [color-scheme:light]">
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset story conversation?"
        description={
          <>
            This will permanently erase your entire chat with{" "}
            <span className="font-semibold text-zinc-900">{character.name}</span> and
            restart from their opening greeting. This action cannot be undone.
          </>
        }
        confirmLabel="Reset conversation"
        cancelLabel="Keep chatting"
        onConfirm={handleResetConversation}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Top Header Bar spanning full width */}
      <header className="shrink-0 border-b border-zinc-200/80 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back Link & Character Preview */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/characters"
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
              title="Back to Characters"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </Link>

            <div className="hidden h-5 w-px bg-zinc-200 sm:block" />

            {character.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl object-cover border border-zinc-200"
              />
            ) : (
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
                {character.name.charAt(0)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-zinc-900 truncate">
                  {character.name}
                </h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    character.visibility === "public"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                  }`}
                >
                  {character.visibility}
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate">
                {character.occupation} • Age {character.age}
                {character.height ? ` • ${character.height} cm` : ""} • {character.gender}
              </p>
            </div>
          </div>

          {/* Right: Tab Navigation + Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("story")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "story"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Story Mode & Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "info"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Character Dossier
              </button>
            </div>

            {activeTab === "story" && hasConversation && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                disabled={isTyping}
              >
                Reset
              </Button>
            )}

            {character.isOwner ? (
              <DeleteCharacterButton
                variant="text"
                characterId={character.id}
                characterName={character.name}
                onDeleted={() => router.push("/characters")}
              />
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === "story" ? (
        <div className="flex min-h-0 flex-1 flex-col bg-[#f8f9fa]">
          {/* Story Chat Message Stream */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {/* Character Intro Card */}
              <div className="mx-auto my-4 flex max-w-md flex-col items-center text-center">
                {character.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={character.avatarUrl}
                    alt={character.name}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border border-zinc-200 shadow-xs"
                  />
                ) : (
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-zinc-900 text-2xl font-bold text-white shadow-xs">
                    {character.name.charAt(0)}
                  </div>
                )}
                <h2 className="mt-3 text-lg font-bold text-zinc-900">{character.name}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {character.occupation} • Age {character.age}
                  {character.height ? ` • ${character.height} cm` : ""} • {character.gender}
                </p>

                {character.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                    {character.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white border border-zinc-200/80 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 shadow-2xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-xs leading-relaxed text-zinc-600 line-clamp-3">
                  {character.profile}
                </p>
              </div>

              <div className="relative my-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <span className="relative bg-[#f8f9fa] px-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Story Started
                </span>
              </div>

              {/* Message bubbles */}
              {messages.map((msg) => {
                const isChar = msg.sender === "character";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${isChar ? "justify-start" : "justify-end"}`}
                  >
                    {isChar && (
                      character.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={character.avatarUrl}
                          alt={character.name}
                          className="h-8 w-8 shrink-0 rounded-xl object-cover border border-zinc-200 self-start mt-1"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white self-start mt-1">
                          {character.name.charAt(0)}
                        </div>
                      )
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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
                <div className="flex items-center gap-2.5 justify-start">
                  {character.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="h-8 w-8 shrink-0 rounded-xl object-cover border border-zinc-200"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white">
                      {character.name.charAt(0)}
                    </div>
                  )}
                  <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-2.5 text-xs font-medium text-zinc-500 animate-pulse shadow-xs">
                    {character.name} is formulating a response…
                  </div>
                </div>
              )}

              {chatError && (
                <div className="flex justify-center my-2">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 shadow-xs">
                    <span className="font-semibold">Unable to get reply: </span>
                    {chatError}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sticky Message input pinned at bottom */}
          <div className="shrink-0 border-t border-zinc-200/80 bg-white px-4 py-3.5 sm:px-8">
            <form onSubmit={handleSendMessage} className="mx-auto flex w-full max-w-3xl gap-2">
              <Input
                appearance="soft"
                inputSize="lg"
                className="flex-1"
                placeholder={`Talk to ${character.name}... (e.g. "What is our mission?")`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isTyping}
                autoFocus
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="rounded-2xl px-5"
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      ) : (
        /* Full-screen Character Dossier View */
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-6 sm:p-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
            <div className="flex items-start gap-5">
              {character.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover border border-zinc-200 shadow-xs"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-3xl font-bold text-white shadow-xs">
                  {character.name.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-zinc-900">{character.name}</h2>
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

                <p className="mt-1 text-sm font-medium text-zinc-500">
                  {character.occupation} • Age {character.age}
                  {character.height ? ` • ${character.height} cm` : ""} • {character.gender}
                </p>

                {character.tags.length > 0 && (
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
                )}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Public Profile
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
                {character.profile}
              </p>
            </div>

            {character.greeting && (
              <div className="border-t border-zinc-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Initial Greeting
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-800 italic whitespace-pre-wrap">
                  &ldquo;{character.greeting}&rdquo;
                </p>
              </div>
            )}

            {character.background && (
              <div className="border-t border-zinc-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Private Background
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {character.background}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
