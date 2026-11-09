import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getCharacterById } from "@/lib/characters";
import { generateCharacterInnerMonologue } from "@/lib/gemini";

interface InnerMonologueRequestBody {
  characterId: string;
  latestResponse: string;
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
        { error: "You must be signed in to view character thoughts." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as InnerMonologueRequestBody | null;
    if (
      !body ||
      !body.characterId ||
      typeof body.latestResponse !== "string" ||
      !body.latestResponse.trim()
    ) {
      return NextResponse.json(
        { error: "Invalid request payload. 'characterId' and 'latestResponse' are required." },
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

    let recentTranscript = "";
    if (Array.isArray(body.recentMessages) && body.recentMessages.length > 0) {
      const turns = body.recentMessages.slice(-4);
      recentTranscript = turns
        .map((m) => {
          const speaker = m.sender === "character" ? character.name : "You";
          return `${speaker}: ${m.text.trim()}`;
        })
        .join("\n\n");
    }

    const monologue = await generateCharacterInnerMonologue({
      character: {
        name: character.name,
        age: character.age,
        gender: character.gender,
        occupation: character.occupation,
        tags: character.tags,
        profile: character.profile,
        background: character.background,
      },
      latestResponse: body.latestResponse,
      recentTranscript,
    });

    return NextResponse.json({ monologue });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate inner monologue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
