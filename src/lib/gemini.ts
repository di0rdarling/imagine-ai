import { getStoryMode, type StoryModeId } from "@/lib/story-modes";
import type { SupportingCharacter } from "@/lib/character-validation";

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
  supportingCast?: SupportingCharacter[];
}

export interface ChatHistoryMessage {
  sender: "character" | "user";
  text: string;
}

export type CastTransition = {
  characterName: string;
  type: "exit" | "entrance";
  reason?: string;
};

export interface GenerateCharacterResponseOptions {
  character: CharacterPersona;
  messages: ChatHistoryMessage[];
  model?: string;
  mode?: StoryModeId;
  supportingCast?: SupportingCharacter[];
  transitions?: CastTransition[];
}

export function buildSystemInstruction(
  character: CharacterPersona,
  modeId?: StoryModeId,
  supportingCastOverride?: SupportingCharacter[],
  transitions?: CastTransition[],
): string {
  const mode = getStoryMode(modeId);
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

  const cast = supportingCastOverride ?? character.supportingCast ?? [];
  const inSceneCast = cast.filter((c) => c.inScene);
  const offSceneCast = cast.filter((c) => !c.inScene);

  let castSection = "";
  if (cast.length > 0) {
    const sections: string[] = [];
    if (inSceneCast.length > 0) {
      const list = inSceneCast
        .map(
          (c, idx) =>
            `${idx + 1}. ${c.name} (${c.role || "Supporting character"})${
              c.description ? `\n   - Details/Quirks: ${c.description}` : ""
            }\n   - Status: PRESENT IN SCENE / ROOM`,
        )
        .join("\n");
      sections.push(`[Present in Scene / Available for Interaction]:\n${list}`);
    }
    if (offSceneCast.length > 0) {
      const list = offSceneCast
        .map(
          (c, idx) =>
            `${idx + 1}. ${c.name} (${c.role || "Supporting character"})${
              c.description ? `\n   - Details/Quirks: ${c.description}` : ""
            }\n   - Status: OFF-SCREEN / NOT CURRENTLY PRESENT (known to ${character.name}, can be mentioned or enter if narratively sensible)`,
        )
        .join("\n");
      sections.push(`[Known Supporting Characters (Off-Screen)]:\n${list}`);
    }

    castSection = `\n=== SUPPORTING CAST & RELATIONSHIPS ===\n${sections.join("\n\n")}\n`;
  }

  const multiCharacterGuidelines =
    inSceneCast.length > 0
      ? `\n=== MULTI-CHARACTER SCENE DIRECTING (CRUCIAL) ===
1. You are roleplaying as ${character.name} (the lead), but you ALSO direct the scene and voice the supporting characters present in the scene.
2. In your responses, include the actions, dialogue, banter, and reactions of the supporting characters who are present in the scene (${inSceneCast.map((c) => c.name).join(", ")}).
3. Supporting character dialogue MUST be enclosed in standard double quotes with clear narrative tags (e.g. ${inSceneCast[0].name} scoffed, "Are you serious?" or ${character.name} turned as ${inSceneCast[0].name} stepped forward).
4. Keep supporting characters distinct, true to their roles, and actively involved in the conversation or atmosphere.
5. If the user addresses a supporting character directly or refers to them, have that supporting character reply and react naturally within your narrative response.`
      : "";

  let transitionSection = "";
  if (transitions && transitions.length > 0) {
    const exitDirectives = transitions
      .filter((t) => t.type === "exit")
      .map(
        (t) =>
          `- ${t.characterName} has just stepped away or left the scene.${
            t.reason ? ` (Context/Reason: ${t.reason})` : ""
          }\n  -> MANDATORY INSTRUCTION: Do NOT let them vanish without explanation. Early in this response, narrate a smooth, in-character departure or exit for ${
            t.characterName
          } (e.g., they excuse themselves, receive an urgent call, step out of the room, or walk away). After their departure scene, they are off-screen and should not speak or participate further.`,
      );

    const entranceDirectives = transitions
      .filter((t) => t.type === "entrance")
      .map(
        (t) =>
          `- ${t.characterName} has just arrived or entered the scene.${
            t.reason ? ` (Context/Reason: ${t.reason})` : ""
          }\n  -> MANDATORY INSTRUCTION: Narrate ${
            t.characterName
          }'s entrance naturally into the current setting (e.g., knocking, stepping through the doorway, joining the table, or calling out) before having them speak or interact with the others.`,
      );

    const parts = [...exitDirectives, ...entranceDirectives];
    if (parts.length > 0) {
      transitionSection = `\n=== IMMEDIATE SCENE TRANSITION DIRECTIVE (EXECUTE THIS TURN) ===\n${parts.join(
        "\n\n",
      )}\n`;
    }
  }

  return `You are roleplaying as the following character in an interactive story / conversation:

=== CHARACTER DOSSIER ===
${traits}

=== PUBLIC PROFILE & PERSONALITY ===
${character.profile}

${character.background ? `=== BACKSTORY & SECRET KNOWLEDGE ===\n${character.background}\n` : ""}${castSection}
${character.greeting ? `=== INITIAL OPENING GREETING ===\n"${character.greeting}"\n` : ""}${transitionSection}
=== STORYTELLING MODE GUIDELINE ===
${mode.systemPromptGuideline}${multiCharacterGuidelines}

=== ROLEPLAY INSTRUCTIONS ===
1. STAY COMPLETELY IN CHARACTER at all times. Never refer to yourself as an AI, Gemini, Google, or a language model.
2. Embody the character's voice, tone, vocabulary, attitude, and quirks described in their profile and background.
3. UNDERSTANDING USER INPUT:
   - The user may write in ANY creative storytelling or roleplay style they prefer:
     a) Traditional book / novel prose with inline dialogue and speech tags:
        e.g. I pick up my phone and laugh, "I'm awake!" I type.
        e.g. "Wait for me," I whisper, reaching for my coat.
     b) Script / visual novel format with asterisks for actions and quotes for speech:
        e.g. *laughs into the phone* "I'm awake!"
     c) Pure dialogue, stage directions, or environmental scene narration.
   - Comprehend both what the user is saying aloud AND what their character is physically doing, feeling, typing, or observing in the scene, and react realistically to both words and actions.
4. FORMATTING & NARRATIVE STYLE (CRUCIAL):
   - Write standard published fiction prose.
   - Any words spoken aloud or sent as text messages by the character MUST be enclosed in standard double quotation marks (e.g. "What are you doing here?").
   - NEVER wrap quotation marks around asterisks, and NEVER wrap asterisks around quotation marks (e.g. do NOT write *"dialogue"* or "*dialogue*").
   - Do NOT wrap dialogue inside asterisks.
   - Character actions, movement, expressions, phone descriptions, and narrative scenery should simply be written as clean descriptive prose without asterisks.
   - Example of correct output:
     She lets out a soft sigh and glances down at her phone. "Are you still awake?" she texts back, waiting eagerly. A photo follows: a snapshot of the rainy street outside her window.
5. Keep replies natural, engaging, and attuned to the pace of a roleplay or conversation. Do not write endless essays unless the scene demands a lengthy monologue.
6. React directly to what the user says and does, and push the story or interaction forward.
7. Always bring your sentences and thoughts to a clean, natural close. Never cut off or terminate mid-sentence.`;
}

/**
 * Calls the Google Gemini API to generate the character's in-character response.
 * Defaults to "gemini-3.5-flash" (or GEMINI_MODEL env override if provided).
 */
export async function generateCharacterResponse({
  character,
  messages,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
  mode,
  supportingCast,
  transitions,
}: GenerateCharacterResponseOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is missing. Please set it in your environment or .env.local.",
    );
  }

  const storyMode = getStoryMode(mode);
  const systemInstruction = buildSystemInstruction(
    character,
    mode,
    supportingCast,
    transitions,
  );

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
      maxOutputTokens: storyMode.maxTokens,
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

  // Extract all text parts, excluding internal thought/reasoning tokens if present
  const parts = candidate?.content?.parts;
  let fullText = "";

  if (Array.isArray(parts)) {
    fullText = parts
      .filter((p: { text?: string; thought?: boolean }) => Boolean(p.text && !p.thought))
      .map((p: { text: string }) => p.text)
      .join("");
  }

  if (!fullText.trim()) {
    // If finishReason is blocked or empty
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      throw new Error(`Gemini response stopped with reason: ${candidate.finishReason}`);
    }
    throw new Error("Received empty response from Gemini.");
  }

  let trimmed = fullText.trim();

  // Strip accidental asterisk-wrapped quotes like *"hello"* or "*hello*" -> "hello"
  trimmed = trimmed.replace(/\*["“]([^"”]+)["”]\*/g, '"$1"');
  trimmed = trimmed.replace(/["“]\*([^*]+)\*["”]/g, '"$1"');

  // Balance unclosed quotes or asterisks if ever truncated
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    trimmed += '"';
  }
  const asterisks = (trimmed.match(/\*/g) || []).length;
  if (asterisks % 2 !== 0) {
    trimmed += "*";
  }

  return trimmed;
}
