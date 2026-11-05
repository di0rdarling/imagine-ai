import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getCharacterById } from "@/lib/characters";
import { generateCharacterResponse } from "@/lib/gemini";
import {
  resetConversation,
  saveConversationMessages,
  updateConversationMode,
} from "@/lib/story-conversations";
import { type StoryModeId } from "@/lib/story-modes";

interface ChatRequestBody {
  characterId: string;
  mode?: StoryModeId;
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
      },
      messages: body.messages,
      mode: body.mode,
    });

    const fullMessages = [
      ...body.messages.map((m, i) => ({
        id: m.id || `${m.sender}-${i}`,
        sender: m.sender,
        text: m.text,
      })),
      {
        id: `char-${Date.now()}`,
        sender: "character" as const,
        text: reply,
      },
    ];

    // Persist conversation to MongoDB (including the active mode)
    await saveConversationMessages(
      character._id,
      session.user.id,
      fullMessages,
      body.mode,
    );

    return NextResponse.json({ reply });
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
    } | null;

    if (!body?.characterId || !body?.mode) {
      return NextResponse.json(
        { error: "characterId and mode are required" },
        { status: 400 },
      );
    }

    await updateConversationMode(body.characterId, session.user.id, body.mode);
    return NextResponse.json({ success: true, mode: body.mode });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update mode.";
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
