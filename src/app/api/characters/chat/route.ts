import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getCharacterById } from "@/lib/characters";
import { generateCharacterResponse, summarizeStoryMemory, type CastTransition } from "@/lib/gemini";
import {
  getConversation,
  resetConversation,
  saveConversationMessages,
  updateConversationMode,
  updateConversationSupportingCast,
} from "@/lib/story-conversations";
import {
  assembleTurnMessages,
  fallbackContextOnSummarizeFailure,
  formatTranscriptForSummary,
  prepareModelContext,
  serializeStoryMemory,
  type StoryMemory,
} from "@/lib/story-memory";
import { type StoryModeId } from "@/lib/story-modes";
import type { SupportingCharacter } from "@/lib/character-validation";

interface ChatRequestBody {
  characterId: string;
  mode?: StoryModeId;
  supportingCast?: SupportingCharacter[];
  transitions?: CastTransition[];
  messages: Array<{
    id?: string;
    sender: "character" | "user";
    text: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to converse with characters." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
    if (!body || !body.characterId || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid request payload. 'characterId' and 'messages' are required." },
        { status: 400 },
      );
    }

    const character = await getCharacterById(body.characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    // Access control: private characters can only be used by their creator
    if (
      character.visibility === "private" &&
      character.userId.toString() !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You do not have permission to converse with this character." },
        { status: 403 },
      );
    }

    const existingConvo = await getConversation(character._id, session.user.id);

    const effectiveCast =
      body.supportingCast ??
      existingConvo?.supportingCast ??
      character.supportingCast ??
      [];

    let fullMessages;
    try {
      fullMessages = assembleTurnMessages(
        existingConvo?.messages,
        body.messages,
        character.greeting,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "A user message is required.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let storyMemory: StoryMemory | undefined = existingConvo?.storyMemory;
    let prepared = prepareModelContext(fullMessages, storyMemory);

    if (prepared.needsSummarization && prepared.messagesToFold.length > 0) {
      try {
        const recap = await summarizeStoryMemory({
          characterName: character.name,
          existingRecap: prepared.recap,
          transcript: formatTranscriptForSummary(prepared.messagesToFold),
        });
        if (recap && prepared.coverThroughId) {
          storyMemory = {
            recap,
            coveredThroughMessageId: prepared.coverThroughId,
            updatedAt: new Date(),
          };
          prepared = {
            ...prepared,
            recap,
            needsSummarization: false,
            messagesToFold: [],
          };
        }
      } catch {
        const fallback = fallbackContextOnSummarizeFailure(
          prepared,
          prepared.unsummarized,
        );
        prepared = {
          ...prepared,
          recap: fallback.recap,
          recentMessages: fallback.recentMessages,
          needsSummarization: false,
          messagesToFold: [],
        };
      }
    }

    const reply = await generateCharacterResponse({
      character: {
        name: character.name,
        age: character.age,
        gender: character.gender,
        occupation: character.occupation,
        height: character.height,
        tags: character.tags,
        profile: character.profile,
        greeting: character.greeting,
        background: character.background,
        supportingCast: effectiveCast,
      },
      messages: prepared.recentMessages,
      mode: body.mode,
      supportingCast: effectiveCast,
      transitions: body.transitions,
      storyMemoryRecap: prepared.recap,
    });

    const persistedMessages = [
      ...fullMessages,
      {
        id: `char-${Date.now()}`,
        sender: "character" as const,
        text: reply,
      },
    ];

    await saveConversationMessages(
      character._id,
      session.user.id,
      persistedMessages,
      body.mode,
      effectiveCast,
      storyMemory,
    );

    return NextResponse.json({
      reply,
      storyMemory: serializeStoryMemory(storyMemory),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate character response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      characterId?: string;
      mode?: StoryModeId;
      supportingCast?: SupportingCharacter[];
    } | null;

    if (!body?.characterId) {
      return NextResponse.json(
        { error: "characterId is required" },
        { status: 400 },
      );
    }

    if (body.mode) {
      await updateConversationMode(body.characterId, session.user.id, body.mode);
    }

    if (body.supportingCast) {
      await updateConversationSupportingCast(
        body.characterId,
        session.user.id,
        body.supportingCast,
      );
    }

    return NextResponse.json({
      success: true,
      mode: body.mode,
      supportingCast: body.supportingCast,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update conversation settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("characterId");
    if (!characterId) {
      return NextResponse.json(
        { error: "characterId parameter is required" },
        { status: 400 },
      );
    }

    await resetConversation(characterId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset conversation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
