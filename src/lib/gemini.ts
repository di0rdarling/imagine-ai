export interface CharacterPersona {
  name: string;
  age: string;
  gender: string;
  occupation: string;
  height?: string | null;
  tags?: string[];
  profile: string;
  greeting?: string;
  background?: string | null;
}

export interface ChatHistoryMessage {
  sender: "character" | "user";
  text: string;
}

export interface GenerateCharacterResponseOptions {
  character: CharacterPersona;
  messages: ChatHistoryMessage[];
  model?: string;
}

export function buildSystemInstruction(character: CharacterPersona): string {
  const traits = [
    `Name: ${character.name}`,
    `Occupation/Role: ${character.occupation}`,
    `Age: ${character.age}`,
    `Gender: ${character.gender}`,
    character.height ? `Height: ${character.height} cm` : null,
    character.tags && character.tags.length > 0
      ? `Tags / Archetypes: ${character.tags.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are roleplaying as the following character in an interactive story / conversation:

=== CHARACTER DOSSIER ===
${traits}

=== PUBLIC PROFILE & PERSONALITY ===
${character.profile}

${character.background ? `=== BACKSTORY & SECRET KNOWLEDGE ===\n${character.background}\n` : ""}
${character.greeting ? `=== INITIAL OPENING GREETING ===\n"${character.greeting}"\n` : ""}

=== ROLEPLAY INSTRUCTIONS ===
1. STAY COMPLETELY IN CHARACTER at all times. Never refer to yourself as an AI, Gemini, Google, or a language model.
2. Embody the character's voice, tone, vocabulary, attitude, and quirks described in their profile and background.
3. You may use actions/emotes formatted with asterisks (e.g. *leans forward thoughtfully*, *smirks*, *draws blade*) to add life and physical presence to the scene.
4. Keep replies natural, engaging, and attuned to the pace of a roleplay or conversation. Do not write endless essays unless the scene demands a lengthy monologue.
5. React directly to what the user says and push the story or interaction forward.`;
}

/**
 * Calls the Google Gemini API to generate the character's in-character response.
 * Defaults to "gemini-3.5-flash" (or GEMINI_MODEL env override if provided).
 */
export async function generateCharacterResponse({
  character,
  messages,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
}: GenerateCharacterResponseOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is missing. Please set it in your environment or .env.local.",
    );
  }

  const systemInstruction = buildSystemInstruction(character);

  // Convert chat messages to Gemini's contents format
  // Gemini expects roles: "user" | "model"
  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  for (const msg of messages) {
    const text = msg.text.trim();
    if (!text) continue;

    const role = msg.sender === "user" ? "user" : "model";

    // Combine consecutive messages with the same role as required by Gemini API
    const lastContent = contents[contents.length - 1];
    if (lastContent && lastContent.role === role) {
      lastContent.parts.push({ text });
    } else {
      contents.push({
        role,
        parts: [{ text }],
      });
    }
  }

  // Ensure there's at least one message and that the last message is from the user
  if (contents.length === 0) {
    throw new Error("No conversation messages provided to generate a response.");
  }

  // If the conversation starts with a model turn (e.g. initial greeting), Gemini requires
  // the first turn in contents to typically be user unless using system instruction, but
  // if contents starts with model, prepend a synthetic user start if needed or ensure format:
  if (contents[0].role === "model") {
    contents.unshift({
      role: "user",
      parts: [{ text: "[The scene begins / Conversation starts]" }],
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${apiKey}`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let errorMessage = `Gemini API responded with status ${response.status}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error?.message) {
        errorMessage = `Gemini API error: ${parsed.error.message}`;
      }
    } catch {
      if (errText) errorMessage = `Gemini API error: ${errText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const responsePart = candidate?.content?.parts?.[0]?.text;

  if (!responsePart || typeof responsePart !== "string") {
    // If finishReason is blocked or empty
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      throw new Error(`Gemini response stopped with reason: ${candidate.finishReason}`);
    }
    throw new Error("Received empty response from Gemini.");
  }

  return responsePart.trim();
}
