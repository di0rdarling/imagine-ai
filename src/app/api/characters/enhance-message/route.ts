import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getCharacterById } from "@/lib/characters";
import { enhanceUserDraft } from "@/lib/gemini";
import { type StoryModeId } from "@/lib/story-modes";

interface EnhanceRequestBody {
  characterId: string;
  draft: string;
  mode?: StoryModeId;
  recentMessages?: Array<{
    sender: "character" | "user";
    text: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to use this feature." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as EnhanceRequestBody | null;
    if (!body || !body.characterId || typeof body.draft !== "string" || !body.draft.trim()) {
      return NextResponse.json(
        { error: "Invalid request payload. 'characterId' and non-empty 'draft' are required." },
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
        { error: "You do not have permission to access this character." },
        { status: 403 },
      );
    }

    // Format recent scene turns into a readable excerpt
    let recentTranscript = "";
    if (Array.isArray(body.recentMessages) && body.recentMessages.length > 0) {
      const turns = body.recentMessages.slice(-6);
      recentTranscript = turns
        .map((m) => {
          const speaker = m.sender === "character" ? character.name : "You";
          return `${speaker}: ${m.text.trim()}`;
        })
        .join("\n\n");
    }

    const enhancedText = await enhanceUserDraft({
      draft: body.draft,
      characterName: character.name,
      characterBackground: character.background || undefined,
      storyMode: body.mode,
      recentTranscript,
    });

    return NextResponse.json({ enhancedText });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to enhance message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
