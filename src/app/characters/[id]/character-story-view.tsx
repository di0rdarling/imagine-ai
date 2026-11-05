"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DeleteCharacterButton } from "@/app/characters/delete-character-button";
import { Button, ConfirmDialog, Textarea } from "@/components/ui";
import { parseStoryParagraphs, type StoryParagraphBlock } from "@/lib/story-formatter";
import type { SupportingCharacter } from "@/lib/character-validation";
import type { CastTransition } from "@/lib/gemini";

import {
  DEFAULT_STORY_MODE,
  getStoryMode,
  STORY_MODES,
  type StoryModeId,
} from "@/lib/story-modes";

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
  supportingCast?: SupportingCharacter[];
};

interface CharacterStoryViewProps {
  character: SerializedCharacter;
  userName?: string | null;
  initialMessages?: Array<{
    id: string;
    sender: "character" | "user";
    text: string;
  }> | null;
  initialMode?: StoryModeId;
  initialCast?: SupportingCharacter[];
}

type ChatMessage = {
  id: string;
  sender: "character" | "user";
  text: string;
};

const COMPOSER_MAX_ROWS = 4;

function resizeComposer(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  const styles = window.getComputedStyle(el);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 22;
  const paddingY =
    Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
  const maxHeight = lineHeight * COMPOSER_MAX_ROWS + paddingY;
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
}

function createInitialMessages(greeting: string): ChatMessage[] {
  return [
    {
      id: "greeting",
      sender: "character",
      text: greeting,
    },
  ];
}

export function CharacterStoryView({
  character,
  userName,
  initialMessages,
  initialMode,
  initialCast,
}: CharacterStoryViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const displayName = userName || session?.user?.name || "You";

  const [activeTab, setActiveTab] = useState<"story" | "info">("story");
  const [currentMode, setCurrentMode] = useState<StoryModeId>(
    () => initialMode || DEFAULT_STORY_MODE,
  );
  const [showModeModal, setShowModeModal] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [supportingCast, setSupportingCast] = useState<SupportingCharacter[]>(
    () => initialCast ?? character.supportingCast ?? [],
  );
  const [pendingTransitions, setPendingTransitions] = useState<CastTransition[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessages && initialMessages.length > 0) {
      return initialMessages;
    }
    return createInitialMessages(character.greeting);
  });
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showStoryGuideModal, setShowStoryGuideModal] = useState(false);

  const activeModeOption = getStoryMode(currentMode);

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

  useEffect(() => {
    resizeComposer(composerRef.current);
  }, [inputMessage]);

  const handleResetConversation = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
    setChatError(null);
    setInputMessage("");
    setMessages(createInitialMessages(character.greeting));
    setPendingTransitions([]);
    setShowResetConfirm(false);

    // Also clear conversation from database
    try {
      await fetch(`/api/characters/chat?characterId=${character.id}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore network errors on background reset
    }
  };

  const handleSelectMode = async (modeId: StoryModeId) => {
    setCurrentMode(modeId);
    setShowModeModal(false);

    // Save chosen mode to database in the background
    try {
      await fetch("/api/characters/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          mode: modeId,
        }),
      });
    } catch {
      // Non-blocking background sync
    }
  };

  const handleUpdateCast = async (
    newCast: SupportingCharacter[],
    detectedTransitions?: CastTransition[],
  ) => {
    // Detect transitions if not explicitly provided
    const transitionsToRecord: CastTransition[] = detectedTransitions || [];
    if (!detectedTransitions) {
      for (const oldChar of supportingCast) {
        const updated = newCast.find((c) => c.id === oldChar.id);
        if (updated) {
          if (oldChar.inScene && !updated.inScene) {
            transitionsToRecord.push({
              characterName: updated.name || oldChar.name,
              type: "exit",
            });
          } else if (!oldChar.inScene && updated.inScene) {
            transitionsToRecord.push({
              characterName: updated.name || oldChar.name,
              type: "entrance",
            });
          }
        }
      }
    }

    if (transitionsToRecord.length > 0) {
      setPendingTransitions((prev) => [...prev, ...transitionsToRecord]);
    }

    setSupportingCast(newCast);

    // Save updated cast to database in the background
    try {
      await fetch("/api/characters/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          supportingCast: newCast,
        }),
      });
    } catch {
      // Non-blocking background sync
    }
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

    const transitionsToSend = [...pendingTransitions];
    setPendingTransitions([]);

    try {
      const res = await fetch("/api/characters/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterId: character.id,
          mode: currentMode,
          supportingCast,
          transitions: transitionsToSend.length > 0 ? transitionsToSend : undefined,
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
      // Restore pending transitions if request failed
      if (transitionsToSend.length > 0) {
        setPendingTransitions((prev) => [...transitionsToSend, ...prev]);
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

      <StoryGuideModal
        open={showStoryGuideModal}
        characterName={character.name}
        onClose={() => setShowStoryGuideModal(false)}
      />

      <StoryModeModal
        open={showModeModal}
        selectedMode={currentMode}
        onSelectMode={handleSelectMode}
        onClose={() => setShowModeModal(false)}
      />

      <CastManagerModal
        open={showCastModal}
        cast={supportingCast}
        mainCharacterName={character.name}
        onSave={handleUpdateCast}
        onClose={() => setShowCastModal(false)}
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
            {/* Story Mode Selector Trigger (Matching mobile pill in screenshot) */}
            <button
              type="button"
              onClick={() => setShowModeModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition"
              title="Change Storytelling Mode"
            >
              <span>{activeModeOption.icon}</span>
              <span className="hidden sm:inline font-medium text-zinc-800">
                {activeModeOption.title}
              </span>
              <svg
                className="h-3.5 w-3.5 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Cast Drawer Trigger */}
            <button
              type="button"
              onClick={() => setShowCastModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition"
              title="Manage Supporting Cast & Scene Characters"
            >
              <span>👥</span>
              <span className="hidden sm:inline font-medium text-zinc-800">
                Cast
              </span>
              {supportingCast.filter((c) => c.inScene).length > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-700">
                  {supportingCast.filter((c) => c.inScene).length}
                </span>
              )}
            </button>

            {/* Story Guide Help Button */}
            <button
              type="button"
              onClick={() => setShowStoryGuideModal(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none"
              title="How to write and format story responses"
              aria-label="Story formatting guide"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeWidth="2" strokeLinecap="round" d="M12 16v-4M12 8h.01" />
              </svg>
            </button>

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
              <>
                <Link
                  href={`/characters/${character.id}/edit`}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-100 px-3.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-200"
                >
                  Edit
                </Link>
                <DeleteCharacterButton
                  variant="text"
                  characterId={character.id}
                  characterName={character.name}
                  onDeleted={() => router.push("/characters")}
                />
              </>
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

              {/* In-Scene Cast Banner */}
              {supportingCast.some((c) => c.inScene) && (
                <div className="flex items-center justify-between rounded-2xl border border-purple-200/80 bg-purple-50/60 px-4 py-2 text-xs text-purple-900 shadow-2xs">
                  <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                    <span className="font-semibold text-purple-800 shrink-0">In Scene:</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-medium text-purple-950 border border-purple-200 shrink-0">
                      ⭐ {character.name} (Lead)
                    </span>
                    {supportingCast
                      .filter((c) => c.inScene)
                      .map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 rounded-full bg-purple-100/80 px-2.5 py-0.5 font-medium text-purple-900 border border-purple-200 shrink-0"
                        >
                          👤 {c.name}
                          {c.role ? <span className="opacity-60 text-[10px]">({c.role})</span> : null}
                        </span>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCastModal(true)}
                    className="shrink-0 ml-2 font-semibold text-purple-700 hover:text-purple-900 underline text-xs"
                  >
                    Manage
                  </button>
                </div>
              )}

              {/* Pending Transition Notification Pill */}
              {pendingTransitions.length > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-2 text-xs text-amber-900 animate-in fade-in duration-150">
                  <span className="text-sm">🎬</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">Next turn scene transition: </span>
                    {pendingTransitions.map((t, idx) => (
                      <span key={idx} className="mr-2">
                        {t.characterName}{" "}
                        <span className={t.type === "exit" ? "text-rose-700 font-medium" : "text-emerald-700 font-medium"}>
                          {t.type === "exit" ? "will leave the scene" : "will enter the scene"}
                        </span>
                        {idx < pendingTransitions.length - 1 ? ";" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg) => {
                const isChar = msg.sender === "character";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isChar ? "justify-start" : "justify-end"}`}
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
                      className={`max-w-[88%] sm:max-w-[78%] rounded-3xl px-5 py-4 text-sm leading-relaxed transition ${
                        isChar
                          ? "bg-white text-zinc-900 border border-zinc-200/80 shadow-xs"
                          : "bg-zinc-900 text-white shadow-xs"
                      }`}
                    >
                      {/* Speaker header */}
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`text-xs font-bold tracking-tight ${
                            isChar ? "text-zinc-900" : "text-zinc-200"
                          }`}
                        >
                          {isChar ? character.name : displayName}
                        </span>
                      </div>

                      <StoryMessageContent text={msg.text} isCharacter={isChar} />
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
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
              <form onSubmit={handleSendMessage} className="flex w-full gap-2 items-end">
                <Textarea
                  ref={composerRef}
                  appearance="soft"
                  rows={1}
                  className="flex-1 min-h-12 py-3 overflow-y-auto"
                  placeholder={`Talk to ${character.name}... (e.g. *steps closer* "What is our mission?")`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
                      return;
                    }
                    e.preventDefault();
                    if (!inputMessage.trim() || isTyping) return;
                    e.currentTarget.form?.requestSubmit();
                  }}
                  disabled={isTyping}
                  autoFocus
                  aria-label={`Message ${character.name}`}
                />
                <button
                  type="button"
                  onClick={() => setShowStoryGuideModal(true)}
                  className="hidden sm:inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-[#f8f9fa] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition"
                  title="Writing tips & story formatting guide"
                  aria-label="Story writing guide"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path strokeWidth="2" strokeLinecap="round" d="M12 16v-4M12 8h.01" />
                  </svg>
                </button>
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  className="rounded-2xl px-5"
                >
                  Send
                </Button>
              </form>

              {/* Story mode badge above input bar */}
              <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Mode:</span>
                  <button
                    type="button"
                    onClick={() => setShowModeModal(true)}
                    className="inline-flex items-center gap-1 font-semibold text-zinc-700 hover:text-zinc-950 underline"
                  >
                    <span>{activeModeOption.icon}</span>
                    <span>{activeModeOption.title}</span>
                  </button>
                  <span className="hidden sm:inline text-zinc-400">
                    — {activeModeOption.replyLength}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStoryGuideModal(true)}
                  className="underline hover:text-zinc-600 transition shrink-0 ml-2"
                >
                  Writing guide
                </button>
              </div>
            </div>
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

            {supportingCast.length > 0 && (
              <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Supporting Cast ({supportingCast.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCastModal(true)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                  >
                    Manage Cast
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {supportingCast.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3.5 text-xs text-zinc-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-zinc-900 text-sm">{c.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            c.inScene
                              ? "bg-purple-100 text-purple-800"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {c.inScene ? "In Scene" : "Off-Screen"}
                        </span>
                      </div>
                      {c.role ? (
                        <p className="mt-1 font-medium text-zinc-600">{c.role}</p>
                      ) : null}
                      {c.description ? (
                        <p className="mt-1 text-zinc-500 italic">{c.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StoryMessageContent({
  text,
  isCharacter,
}: {
  text: string;
  isCharacter: boolean;
}) {
  const blocks = parseStoryParagraphs(text);

  // Fallback to simple rendered text if no blocks parsed
  if (blocks.length === 0) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, pIdx) => {
        // Pure standalone dialogue paragraph (e.g. "Don't say anything. Yes, this is a $14,000 dress...")
        if (block.kind === "standalone_dialogue") {
          const dialogueText = block.tokens[0]?.text ?? block.rawText;
          return (
            <p
              key={pIdx}
              className={`text-sm leading-relaxed font-sans font-medium ${
                isCharacter ? "text-zinc-900" : "text-white"
              }`}
            >
              <span className={isCharacter ? "text-indigo-600 font-bold mr-0.5" : "text-indigo-300 font-bold mr-0.5"}>
                &ldquo;
              </span>
              <span>{dialogueText}</span>
              <span className={isCharacter ? "text-indigo-600 font-bold ml-0.5" : "text-indigo-300 font-bold ml-0.5"}>
                &rdquo;
              </span>
            </p>
          );
        }

        // Standalone action / narration paragraph (e.g. *Almost immediately, the three dots flash...*)
        if (block.kind === "standalone_action") {
          const actionText = block.tokens[0]?.text ?? block.rawText;
          return (
            <p
              key={pIdx}
              className={`text-sm leading-relaxed font-serif italic ${
                isCharacter ? "text-purple-700" : "text-purple-300"
              }`}
            >
              *{actionText}*
            </p>
          );
        }

        // Novel-style mixed paragraph (e.g. `She lets out a groan... "And for the record, yes."`)
        if (block.kind === "mixed_paragraph") {
          return (
            <p key={pIdx} className="text-sm leading-relaxed">
              {block.tokens.map((tok, tIdx) => {
                if (tok.type === "dialogue") {
                  return (
                    <span
                      key={tIdx}
                      className={`font-sans font-medium ${
                        isCharacter ? "text-zinc-900" : "text-white"
                      }`}
                    >
                      <span className={isCharacter ? "text-indigo-600 font-bold" : "text-indigo-300 font-bold"}>
                        &ldquo;
                      </span>
                      <span>{tok.text}</span>
                      <span className={isCharacter ? "text-indigo-600 font-bold" : "text-indigo-300 font-bold"}>
                        &rdquo;
                      </span>
                    </span>
                  );
                }

                if (tok.type === "action") {
                  return (
                    <span
                      key={tIdx}
                      className={`font-serif italic ${
                        isCharacter ? "text-purple-700" : "text-purple-300"
                      }`}
                    >
                      *{tok.text}*
                    </span>
                  );
                }

                // Regular narration / action clause outside quotes
                return (
                  <span
                    key={tIdx}
                    className={`font-serif italic ${
                      isCharacter ? "text-purple-700" : "text-purple-300"
                    }`}
                  >
                    {tok.text}
                  </span>
                );
              })}
            </p>
          );
        }

        // Pure descriptive narration paragraph without dialogue (e.g. the middle paragraph in your screenshot)
        return (
          <p
            key={pIdx}
            className={`text-sm leading-relaxed font-serif italic ${
              isCharacter ? "text-purple-700" : "text-purple-300"
            }`}
          >
            {block.rawText}
          </p>
        );
      })}
    </div>
  );
}

function StoryGuideModal({
  open,
  characterName,
  onClose,
}: {
  open: boolean;
  characterName: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Dismiss guide"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-guide-title"
        className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl text-zinc-900 [color-scheme:light]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeWidth="2" strokeLinecap="round" d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <div>
              <h2 id="story-guide-title" className="text-base font-bold text-zinc-900">
                Story Roleplay & Writing Guide
              </h2>
              <p className="text-xs text-zinc-500">
                How to write immersive story turns with {characterName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
            aria-label="Close guide"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Guide Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6 text-sm">
          <div>
            <p className="text-zinc-700 leading-relaxed">
              <span className="font-semibold text-zinc-900">{characterName}</span> reads both your
              spoken dialogue and your physical actions. You can write in whatever style feels most natural to you!
            </p>
          </div>

          {/* Breakdown cards */}
          <div className="flex flex-col gap-3">
            {/* Novel / Prose Style */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  ✍️
                </span>
                <h3 className="font-bold text-zinc-900 text-sm">Natural Novel Prose (Recommended)</h3>
              </div>
              <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                You don&apos;t have to use asterisks if you don&apos;t want to! Just write like you&apos;re reading or writing a book, mixing dialogue tags and actions into your sentences.
              </p>
              <div className="mt-2.5 rounded-xl bg-white border border-indigo-200 px-3 py-2 text-xs text-zinc-800">
                I pick up my phone and laugh, &ldquo;I&apos;m awake!&rdquo; I type.
              </div>
            </div>

            {/* Script / Action Asterisks */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  🎭
                </span>
                <h3 className="font-bold text-zinc-900 text-sm">Script & Asterisk Format</h3>
              </div>
              <p className="mt-1.5 text-xs text-zinc-600">
                Prefer roleplay tags? Wrap actions in asterisks and speech in quotes:
              </p>
              <div className="mt-2.5 rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs font-mono text-zinc-800">
                *smirks and taps quickly on screen* &ldquo;You won&apos;t believe what just happened.&rdquo;
              </div>
            </div>

            {/* Ambient Narration & World Context */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  📖
                </span>
                <h3 className="font-bold text-zinc-900 text-sm">Setting the Scene & Narration</h3>
              </div>
              <p className="mt-1.5 text-xs text-zinc-600">
                Describe the surroundings, background events, changes in weather, or timeskips.
              </p>
              <div className="mt-2.5 rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs font-mono text-zinc-800">
                The morning sun streams into the kitchen as the kettle begins to whistle.
              </div>
            </div>
          </div>

          {/* Quick takeaway */}
          <div className="rounded-2xl border border-zinc-200 bg-[#f8f9fa] p-4 text-xs text-zinc-600 leading-relaxed">
            <span className="font-semibold text-zinc-900">How {characterName} responds: </span>
            {characterName} will understand what you are doing (e.g. typing on your phone, laughing) as well as what you said (&ldquo;I&apos;m awake!&rdquo;), and react to both in character.
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-3.5 bg-zinc-50 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="rounded-full px-6"
          >
            Got it, let&apos;s write
          </Button>
        </div>
      </div>
    </div>
  );
}

function StoryModeModal({
  open,
  selectedMode,
  onSelectMode,
  onClose,
}: {
  open: boolean;
  selectedMode: StoryModeId;
  onSelectMode: (mode: StoryModeId) => void;
  onClose: () => void;
}) {
  const [tentativeMode, setTentativeMode] = useState<StoryModeId>(selectedMode);

  useEffect(() => {
    if (open) {
      setTentativeMode(selectedMode);
    }
  }, [open, selectedMode]);

  if (!open) return null;

  const modeList = Object.values(STORY_MODES);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Dismiss modal"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="choose-mode-title"
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-[32px] sm:rounded-3xl border border-zinc-200 bg-white shadow-2xl text-zinc-900 [color-scheme:light] animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="w-6" /> {/* Spacer for optical balance */}
          <h2 id="choose-mode-title" className="text-lg font-bold text-zinc-900">
            Choose a Mode
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Mode List Options */}
        <div className="flex flex-col gap-2.5 px-4 sm:px-6 py-2">
          {modeList.map((mode) => {
            const isSelected = tentativeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTentativeMode(mode.id)}
                className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition border-2 ${
                  isSelected
                    ? "border-pink-500 bg-pink-50/20 shadow-xs"
                    : "border-zinc-100 bg-[#f8f9fa] hover:border-zinc-200 hover:bg-zinc-100/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-zinc-200/80 text-xl shadow-2xs">
                    {mode.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-zinc-900">{mode.title}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200/80 px-2 py-0.5 text-[10px] font-semibold text-pink-700">
                        <span>💎</span>
                        <span>{mode.badge}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>

                {/* Radio checkmark circle (styled like the screenshot) */}
                <div className="shrink-0 pl-1">
                  {isSelected ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-white shadow-xs">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-zinc-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm Footer */}
        <div className="px-4 sm:px-6 py-4 pt-3">
          <Button
            type="button"
            size="lg"
            fullWidth
            onClick={() => onSelectMode(tentativeMode)}
            className="rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function CastManagerModal({
  open,
  cast,
  mainCharacterName,
  onSave,
  onClose,
}: {
  open: boolean;
  cast: SupportingCharacter[];
  mainCharacterName: string;
  onSave: (cast: SupportingCharacter[], transitions?: CastTransition[]) => void;
  onClose: () => void;
}) {
  const [localCast, setLocalCast] = useState<SupportingCharacter[]>(cast);
  const [transitionReasons, setTransitionReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setLocalCast(cast);
      setTransitionReasons({});
    }
  }, [open, cast]);

  if (!open) return null;

  const handleToggleScene = (id: string) => {
    setLocalCast((prev) =>
      prev.map((c) => (c.id === id ? { ...c, inScene: !c.inScene } : c)),
    );
  };

  const handleRemove = (id: string) => {
    setLocalCast((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAdd = () => {
    if (localCast.length >= 8) return;
    setLocalCast((prev) => [
      ...prev,
      {
        id: `cast-${Date.now()}`,
        name: "",
        role: "",
        description: "",
        inScene: true,
      },
    ]);
  };

  const handleSave = () => {
    const cleaned = localCast
      .filter((c) => c.name.trim().length > 0)
      .map((c) => ({
        ...c,
        name: c.name.trim(),
        role: c.role.trim(),
        description: (c.description || "").trim(),
      }));

    // Detect transitions with any custom reason provided by user
    const detectedTransitions: CastTransition[] = [];
    for (const oldChar of cast) {
      const updated = cleaned.find((c) => c.id === oldChar.id);
      if (updated) {
        if (oldChar.inScene && !updated.inScene) {
          detectedTransitions.push({
            characterName: updated.name || oldChar.name,
            type: "exit",
            reason: transitionReasons[updated.id]?.trim() || undefined,
          });
        } else if (!oldChar.inScene && updated.inScene) {
          detectedTransitions.push({
            characterName: updated.name || oldChar.name,
            type: "entrance",
            reason: transitionReasons[updated.id]?.trim() || undefined,
          });
        }
      }
    }

    onSave(cleaned, detectedTransitions.length > 0 ? detectedTransitions : undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Dismiss modal"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cast-manager-title"
        className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-t-[32px] sm:rounded-3xl border border-zinc-200 bg-white shadow-2xl text-zinc-900 [color-scheme:light] animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <div>
              <h2 id="cast-manager-title" className="text-base sm:text-lg font-bold text-zinc-900">
                Supporting Cast & Scene
              </h2>
              <p className="text-xs text-zinc-500">
                Characters who converse, react, and banter alongside {mainCharacterName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Cast list scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
          {localCast.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
              <span className="text-3xl">🎭</span>
              <h3 className="mt-2 text-sm font-bold text-zinc-800">No supporting cast yet</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Add friends, rivals, or sidekicks. {mainCharacterName} will direct the scene,
                narrate their actions, and include their dialogue in responses!
              </p>
            </div>
          ) : (
            localCast.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 transition"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleScene(c.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                        c.inScene
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-zinc-200 text-zinc-600 border border-zinc-300"
                      }`}
                      title="Click to toggle in-scene status"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.inScene ? "bg-purple-600" : "bg-zinc-400"}`} />
                      {c.inScene ? "In Scene (Speaking)" : "Off-Screen (Absent)"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    className="text-xs font-medium text-rose-500 hover:text-rose-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalCast((prev) =>
                          prev.map((item) =>
                            item.id === c.id ? { ...item, name: val } : item,
                          ),
                        );
                      }}
                      placeholder="e.g. Sarah"
                      maxLength={30}
                      className="w-full rounded-xl bg-white px-3 py-1.5 text-sm text-zinc-900 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                      Role / Dynamic
                    </label>
                    <input
                      type="text"
                      value={c.role}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalCast((prev) =>
                          prev.map((item) =>
                            item.id === c.id ? { ...item, role: val } : item,
                          ),
                        );
                      }}
                      placeholder="e.g. Sarcastic Partner, Rookie Detective"
                      maxLength={50}
                      className="w-full rounded-xl bg-white px-3 py-1.5 text-sm text-zinc-900 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div className="mt-2.5">
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                    Personality Quirks & Voice
                  </label>
                  <textarea
                    rows={2}
                    value={c.description || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalCast((prev) =>
                        prev.map((item) =>
                          item.id === c.id ? { ...item, description: val } : item,
                        ),
                      );
                    }}
                    placeholder="e.g. Sharp-tongued, observant, sips coffee constantly."
                    maxLength={300}
                    className="w-full rounded-xl bg-white px-3 py-1.5 text-xs text-zinc-900 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                  />
                </div>

                {/* Transition reason input shown when scene presence has changed */}
                {(() => {
                  const original = cast.find((orig) => orig.id === c.id);
                  if (!original || original.inScene === c.inScene) return null;
                  const isExiting = original.inScene && !c.inScene;
                  return (
                    <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1">
                        <span>🎬</span>
                        <span>
                          {isExiting
                            ? `${c.name || "Character"} is exiting the scene`
                            : `${c.name || "Character"} is entering the scene`}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700 mb-1.5">
                        {isExiting
                          ? "How should they leave? (Leave blank to let AI write a natural exit)"
                          : "How do they arrive? (Leave blank to let AI write a natural entrance)"}
                      </p>
                      <input
                        type="text"
                        value={transitionReasons[c.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTransitionReasons((prev) => ({
                            ...prev,
                            [c.id]: val,
                          }));
                        }}
                        placeholder={
                          isExiting
                            ? "e.g. Received an urgent phone call, stepped out angrily, excused themselves to bed"
                            : "e.g. Knocked on the door, walked in carrying drinks, ran over"
                        }
                        maxLength={100}
                        className="w-full rounded-lg bg-white px-2.5 py-1 text-xs text-zinc-900 border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  );
                })()}
              </div>
            ))
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={localCast.length >= 8}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 transition disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add Character ({localCast.length}/8)
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-3.5 bg-zinc-50 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="rounded-full px-6 bg-zinc-900 text-white hover:bg-zinc-800"
          >
            Save Scene Cast
          </Button>
        </div>
      </div>
    </div>
  );
}
