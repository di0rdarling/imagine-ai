"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useRef, useState, useTransition } from "react";

import { createCharacterAction, type CharacterActionState } from "@/app/characters/actions";
import {
  AlertCard,
  Button,
  CharCountInput,
  CharCountTextarea,
  CheckboxField,
  ChoiceCard,
  FormField,
  FormSection,
  Input,
  SegmentedControl,
  StickyFormFooter,
} from "@/components/ui";
import { PRESET_TAGS } from "@/lib/character-validation";
import { readImageAsCompressedDataUrl } from "@/lib/resize-image";

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-binary", label: "Non-binary" },
] as const;

export function CharacterCreateForm() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string>("Male");
  const [occupation, setOccupation] = useState("");
  const [tags, setTags] = useState<string[]>(["Anime", "Fantasy"]);
  const [tagInput, setTagInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [profile, setProfile] = useState("");
  const [greeting, setGreeting] = useState("");
  const [background, setBackground] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(true);

  // Status & Feedback
  const [formFeedback, setFormFeedback] = useState<CharacterActionState | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar upload handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert("Image must be 12MB or smaller.");
      return;
    }

    try {
      const dataUrl = await readImageAsCompressedDataUrl(file);
      setAvatarPreview(dataUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not process image.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Tags handler
  const togglePresetTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      if (tags.length >= 10) return;
      setTags([...tags, tag]);
    }
  };

  const addCustomTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Form Reset / Clear
  const handleClear = () => {
    if (
      name ||
      profile ||
      greeting ||
      background ||
      avatarPreview
    ) {
      const confirmClear = window.confirm("Clear all entered character details?");
      if (!confirmClear) return;
    }

    setName("");
    setHeight("");
    setAge("");
    setGender("Male");
    setOccupation("");
    setTags([]);
    setProfile("");
    setGreeting("");
    setBackground("");
    setVisibility("public");
    setAvatarPreview(null);
    setCopyrightConfirmed(true);
    setFormFeedback(null);
    setSaveMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save draft locally
  const handleSaveDraft = () => {
    try {
      const draft = {
        name,
        height,
        age,
        gender,
        occupation,
        tags,
        profile,
        greeting,
        background,
        visibility,
        copyrightConfirmed,
        avatarPreview,
      };
      localStorage.setItem("imagine_ai_character_draft", JSON.stringify(draft));
      setSaveMessage("Draft saved to browser!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage("Draft could not be saved.");
    }
  };

  // Restore draft
  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem("imagine_ai_character_draft");
      if (!raw) {
        setSaveMessage("No saved draft found.");
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }
      const draft = JSON.parse(raw);
      if (draft.name) setName(draft.name);
      if (draft.height) setHeight(draft.height);
      if (draft.age) setAge(draft.age);
      if (draft.gender) setGender(draft.gender);
      if (draft.occupation) setOccupation(draft.occupation);
      if (Array.isArray(draft.tags) && draft.tags.length > 0) setTags(draft.tags);
      if (draft.profile) setProfile(draft.profile);
      if (draft.greeting) setGreeting(draft.greeting);
      if (draft.background) setBackground(draft.background);
      if (draft.visibility) setVisibility(draft.visibility);
      if (typeof draft.copyrightConfirmed === "boolean") {
        setCopyrightConfirmed(draft.copyrightConfirmed);
      }
      if (draft.avatarPreview) setAvatarPreview(draft.avatarPreview);
      setSaveMessage("Draft restored!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage("Failed to restore draft.");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormFeedback(null);

    if (authStatus !== "authenticated" || !session?.user?.id) {
      setFormFeedback({
        error: "You must be signed in to create and save a character.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("height", height);
    formData.set("age", age);
    formData.set("gender", gender);
    formData.set("occupation", occupation);
    tags.forEach((tag) => formData.append("tags", tag));
    formData.set("profile", profile);
    formData.set("greeting", greeting);
    formData.set("background", background);
    formData.set("visibility", visibility);
    formData.set("copyrightConfirmed", copyrightConfirmed ? "on" : "off");
    if (avatarPreview) {
      formData.set("avatarUrl", avatarPreview);
    }

    startTransition(async () => {
      const response = await createCharacterAction({}, formData);
      if (response.error || response.fieldErrors) {
        setFormFeedback(response);
      } else if (response.success && response.characterId) {
        localStorage.removeItem("imagine_ai_character_draft");
        router.push(`/characters/${response.characterId}`);
      }
    });
  };

  // Background detail status helper
  const getBackgroundQualityFeedback = () => {
    const len = background.trim().length;
    if (len === 0 || len < 60) {
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-rose-500">
          <span>😡</span>
          <span>Needs more detail to come alive...</span>
        </span>
      );
    }
    if (len < 200) {
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
          <span>🤔</span>
          <span>Good foundation, add more backstory or quirks...</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <span>✨</span>
        <span>Rich background ready for deep storytelling!</span>
      </span>
    );
  };

  return (
    <div className="mx-auto w-full max-w-xl pb-28 pt-2 text-zinc-900 [color-scheme:light]">
      {/* Top Action Bar */}
      <div className="mb-4 flex items-center justify-between px-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push("/characters")}
          aria-label="Close"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>

        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className="text-xs font-medium text-emerald-600 transition">
              {saveMessage}
            </span>
          )}
          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={handleRestoreDraft}
            title="Restore saved draft"
          >
            Restore
          </Button>
          <Button type="button" variant="soft" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <Button type="button" variant="soft" size="sm" onClick={handleSaveDraft}>
            Save
          </Button>
        </div>
      </div>

      {/* Auth warning if not signed in */}
      {authStatus === "unauthenticated" && (
        <AlertCard tone="warning" className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <span>You are not signed in. Characters are saved to your account.</span>
            <Link
              href="/sign-in?callbackUrl=/characters/new"
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-amber-900 px-3 text-xs font-medium text-white hover:bg-amber-800"
            >
              Sign In
            </Link>
          </div>
        </AlertCard>
      )}

      {formFeedback?.error ? (
        <AlertCard tone="error" className="mb-4">
          {formFeedback.error}
        </AlertCard>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormSection
          title="Basic Info"
          description="Character's Core Identity and Appearance"
        >
            {/* Avatar */}
            <div>
              <label className="block text-sm font-semibold text-zinc-800">
                Avatar<span className="text-rose-500">*</span>
              </label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload-input"
                />
                {avatarPreview ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-28 w-28 rounded-2xl object-cover shadow-xs border border-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      aria-label="Remove avatar"
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-700"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="avatar-upload-input"
                    className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-2xl bg-[#f4f4f6] text-zinc-500 hover:bg-zinc-200/80 transition"
                  >
                    <svg
                      className="h-7 w-7 text-zinc-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    <span className="mt-1 text-[11px] font-semibold text-zinc-500">
                      Upload images
                    </span>
                  </label>
                )}
              </div>
            </div>

            <FormField
              id="char-name"
              label="Name"
              required
              error={formFeedback?.fieldErrors?.name}
            >
              <CharCountInput
                id="char-name"
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>

            {/* Height & Age (Two Columns) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <FormField id="char-height" label="Height">
                <CharCountInput
                  id="char-height"
                  maxLength={5}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 188"
                />
              </FormField>
              <FormField
                id="char-age"
                label="Age"
                required
                error={formFeedback?.fieldErrors?.age}
              >
                <CharCountInput
                  id="char-age"
                  maxLength={5}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 22"
                  required
                />
              </FormField>
            </div>

            <FormField label="Gender" required>
              <SegmentedControl
                options={GENDER_OPTIONS}
                value={gender}
                onChange={setGender}
              />
            </FormField>

            <FormField
              id="char-occupation"
              label="Occupation"
              required
              error={formFeedback?.fieldErrors?.occupation}
            >
              <CharCountInput
                id="char-occupation"
                maxLength={50}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. CEO"
                required
              />
            </FormField>
        </FormSection>

        <FormSection
          title="Public Settings"
          description="Shown on the character's public profile"
        >
            <FormField label="Tags" required error={formFeedback?.fieldErrors?.tags}>

              {/* Selected Tags Display */}
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-zinc-400 hover:text-white"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag Selector Trigger */}
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className="flex h-12 w-full items-center justify-between rounded-2xl bg-[#f4f4f6] px-4 text-sm text-zinc-400 hover:bg-zinc-200/80 transition"
                >
                  <span className={tags.length > 0 ? "text-zinc-700 font-medium" : ""}>
                    {tags.length > 0 ? `${tags.length} tag(s) selected` : "Select tags..."}
                  </span>
                  <svg
                    className={`h-4 w-4 text-zinc-500 transition-transform ${
                      isTagDropdownOpen ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Dropdown / Tag picker panel */}
                {isTagDropdownOpen && (
                  <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">
                    <p className="text-xs font-medium text-zinc-500 mb-2">
                      Popular Tags (tap to toggle):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TAGS.map((tag) => {
                        const active = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => togglePresetTag(tag)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              active
                                ? "bg-zinc-900 text-white"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-2">
                      <Input
                        appearance="compact"
                        inputSize="sm"
                        className="flex-1"
                        placeholder="Add custom tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomTag();
                          }
                        }}
                      />
                      <Button type="button" size="sm" className="rounded-xl" onClick={addCustomTag}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </FormField>

            <FormField
              id="char-profile"
              label="Profile"
              required
              error={formFeedback?.fieldErrors?.profile}
            >
              <CharCountTextarea
                id="char-profile"
                rows={4}
                maxLength={2000}
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="Public info such as identity, relationship with the user, motivations and goals"
                required
              />
            </FormField>

            <FormField
              id="char-greeting"
              label="Greeting"
              required
              error={formFeedback?.fieldErrors?.greeting}
            >
              <CharCountTextarea
                id="char-greeting"
                rows={3}
                maxLength={500}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="The character's first message. Wrap actions and expressions with **"
                required
              />
            </FormField>
        </FormSection>

        <FormSection title="Background" description="Core details, kept private" className="[&>div:last-child]:gap-3">
          <CharCountTextarea
            id="char-background"
            rows={5}
            maxLength={3000}
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="Background, family, personality, preferences, etc."
          />
          <div className="px-1">{getBackgroundQualityFeedback()}</div>
        </FormSection>

        <FormSection
          title={
            <>
              Visibility<span className="text-rose-500">*</span>
            </>
          }
          className="[&>div:last-child]:mt-4 [&>div:last-child]:gap-3"
        >
          <ChoiceCard
            selected={visibility === "private"}
            onSelect={() => setVisibility("private")}
            title="Private"
            icon={
              <svg
                className="h-5 w-5 text-zinc-800"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            }
          />
          <ChoiceCard
            selected={visibility === "public"}
            onSelect={() => setVisibility("public")}
            title="Public"
            icon={
              <svg
                className="h-5 w-5 text-zinc-800"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            }
          />
          <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-zinc-500">
            <span className="font-semibold text-zinc-400">ⓘ</span>
            <span>
              Private characters are visible only to you. Public characters become discoverable
              site-wide after review.
            </span>
          </p>
        </FormSection>

        <CheckboxField
          className="mt-1 px-2"
          checked={copyrightConfirmed}
          onCheckedChange={setCopyrightConfirmed}
          label="I confirm this content does not infringe on any copyrights or violate any laws"
        />

        <StickyFormFooter>
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={isPending || !copyrightConfirmed}
            className="shadow-xl"
          >
            {isPending ? "Creating Character…" : "Create"}
          </Button>
        </StickyFormFooter>
      </form>
    </div>
  );
}
