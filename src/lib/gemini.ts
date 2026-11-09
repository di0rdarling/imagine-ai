import { getStoryMode, type StoryModeId } from "@/lib/story-modes";
import type { SupportingCharacter } from "@/lib/character-validation";
import { recapLooksIncomplete } from "@/lib/story-memory";

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
  storyMemoryRecap?: string | null;
  previousInnerMonologue?: string | null;
}

export function buildSystemInstruction(
  character: CharacterPersona,
  modeId?: StoryModeId,
  supportingCastOverride?: SupportingCharacter[],
  transitions?: CastTransition[],
  storyMemoryRecap?: string | null,
  previousInnerMonologue?: string | null,
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

  const recap = storyMemoryRecap?.trim();
  const memorySection = recap
    ? `\n=== STORY SO FAR (COMPACT CONTINUITY MEMORY) ===
The chat transcript for this turn only includes recent messages. Treat the recap below as canon for everything that happened earlier. Do not contradict it unless a recent turn clearly updates a detail.

${recap}\n`
    : "";

  const monologue = previousInnerMonologue?.trim();
  const monologueSection = monologue
    ? `\n=== CONTINUITY: ${character.name.toUpperCase()}'S UNVOICED INNER THOUGHTS FROM PREVIOUS TURN ===
At the end of your last turn, your private, internal train of thought was:
"${monologue}"

MANDATORY CONTINUITY INSTRUCTION:
Continue seamlessly from this internal emotional state and train of thought. You do not need to repeat these thoughts verbatim aloud, but ${character.name}'s tone, micro-expressions, underlying tension, secret intentions, or decisions in this next turn MUST be informed by and consistent with this internal mindset.\n`
    : "";

  const allowWorldNPCs = mode.id === "story" || mode.id === "immersive";

  const npcInstruction = allowWorldNPCs
    ? `3. SPONTANEOUS NEW CHARACTERS & LIVING WORLD:
   - You have creative freedom to introduce spontaneous, contextual minor characters/NPCs (e.g. a bartender, a neighbor, a guard, a courier, a doctor, a passerby) whenever it makes sense for the environment.
   - You do NOT need to choose between only ${character.name} or only an NPC:
     a) Both ${character.name} and an NPC can speak, banter, or interact together in the same response.
     b) Or an NPC can carry the conversation while ${character.name} observes silently or is absent.
     c) Or ${character.name} can take center stage.
     Let the dynamic flow naturally like an organic scene in a novel.`
    : `3. EXCLUSIVE FOCUS ON ${character.name.toUpperCase()} (NO UNINVITED NPCS):
   - In ${mode.title}, the conversation is an intimate, direct one-on-one exchange between the user and ${character.name}.
   - Do NOT introduce spontaneous NPCs, bystanders, or third-party characters.
   - Keep the spotlight strictly on ${character.name} and the user unless the user explicitly invites or addresses another character.`;

  return `You are the scene director and storyteller of an interactive story, anchored to the user's perspective. You voice ${character.name} as the lead, while directing the living environment and portraying all other characters in the scene:

=== LEAD CHARACTER DOSSIER ===
${traits}

=== PUBLIC PROFILE & PERSONALITY ===
${character.profile}

${character.background ? `=== BACKSTORY & SECRET KNOWLEDGE ===\n${character.background}\n` : ""}${castSection}
${character.greeting ? `=== INITIAL OPENING GREETING ===\n"${character.greeting}"\n` : ""}${memorySection}${monologueSection}${transitionSection}
=== STORYTELLING MODE GUIDELINE ===
${mode.systemPromptGuideline}${multiCharacterGuidelines}

=== SCENE DIRECTING & PERSPECTIVE RULES ===
1. PERSPECTIVE ANCHORED TO THE USER:
   - Always keep the narrative camera anchored to where the user's character currently is.
   - Do NOT jump across town or into a private room to narrate what absent characters are doing in secret unless the user is right there to perceive it.
2. PRESENCE, ABSENCE, & NO FORCED COMMUNICATION:
   - If ${character.name} is present in the room/scene with the user, they can speak, act, react, or share the spotlight with others in the room.
   - If ${character.name} is NOT present in the room (or has just left), DO NOT force them to appear, text, call, linger at the doorway, or send messages just so they have something to do in the response.
   - Never invent arbitrary text messages, phone buzzes, or phantom interruptions just to keep ${character.name} talking when they are physically absent.
${npcInstruction}
4. VOICE & IMMERSION:
   - Never refer to yourself as an AI, Gemini, Google, or a language model.
   - Embody ${character.name}'s voice, tone, vocabulary, attitude, and quirks described in their dossier whenever they speak or act.
5. UNDERSTANDING USER INPUT:
   - The user may write in ANY creative storytelling or roleplay style they prefer:
     a) Traditional book / novel prose with inline dialogue and speech tags:
        e.g. I pick up my coat and laugh, "Wait for me outside."
     b) Script / visual novel format with asterisks for actions and quotes for speech:
        e.g. *leans against the doorway* "Who was that at the door?"
     c) Pure dialogue, stage directions, or environmental scene narration.
   - Comprehend both what the user is saying aloud AND what their character is physically doing, feeling, typing, or observing in the scene, and react realistically to both words and actions.
6. FORMATTING & NARRATIVE STYLE (CRUCIAL):
   - Write standard published fiction prose.
   - Any spoken dialogue (whether from ${character.name}, a supporting character, or a spontaneous NPC) MUST be enclosed in standard double quotation marks: "Like this."
   - Never wrap quotation marks around asterisks, and never wrap asterisks around quotation marks (e.g. do NOT write *"dialogue"* or "*dialogue*").
   - Do NOT wrap dialogue inside asterisks.
   - Actions, movement, atmosphere, and body language should simply be written as clean descriptive prose without asterisks.
   - Example (Shared scene with lead and NPC):
     Marcus stepped back from the bar, sliding two glasses across the worn mahogany. "House special," the barkeep muttered before turning back to the taps. ${character.name} picked up one of the glasses, studying the dark amber liquid with a dry smirk. "I wouldn't drink that all at once if I were you."
   - Example (When lead is absent from the room):
     The door clicked shut behind ${character.name}, leaving the hallway heavy with sudden silence. Down at the end of the corridor, the night clerk glanced up from a dog-eared paperback, his wire-rimmed glasses catching the dim yellow light. "Heading out into that rain?" he asked, tapping a stack of room keys against the desk.
7. PACING & CLOSURE:
   - Keep replies natural, engaging, and attuned to the pace of the scene.
   - React directly to what the user says and does, and push the story or interaction forward.
   - Always bring your sentences and thoughts to a clean, natural close. Never cut off or terminate mid-sentence.
   - If compact continuity memory is present, honor those earlier facts, relationships, locations, and open threads while staying focused on the recent turns.`;
}

async function generateGeminiText({
  model,
  systemInstruction,
  userText,
  temperature,
  maxOutputTokens,
  thinkingBudget,
}: {
  model: string;
  systemInstruction: string;
  userText: string;
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget?: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is missing. Please set it in your environment or .env.local.",
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = {
    temperature,
    topP: 0.95,
    maxOutputTokens,
  };
  if (thinkingBudget !== undefined) {
    generationConfig.thinkingConfig = { thinkingBudget };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userText }],
        },
      ],
      generationConfig,
    }),
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
  const parts = candidate?.content?.parts;
  let fullText = "";

  if (Array.isArray(parts)) {
    fullText = parts
      .filter((p: { text?: string; thought?: boolean }) => Boolean(p.text && !p.thought))
      .map((p: { text: string }) => p.text)
      .join("");
  }

  if (!fullText.trim()) {
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      throw new Error(`Gemini response stopped with reason: ${candidate.finishReason}`);
    }
    throw new Error("Received empty response from Gemini.");
  }

  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("Gemini recap was truncated (MAX_TOKENS).");
  }

  return fullText.trim();
}

export function calculateMaxEnhancedLength(draftLength: number): number {
  const safeLength = Math.max(1, draftLength);
  // Give short drafts enough room to ground the scene with 1-2 descriptive sentences (~280-320 chars),
  // scale comfortably for medium drafts, and cap long drafts to avoid runaway verbosity.
  const baseline = Math.max(safeLength + 280, Math.round(safeLength * 2.2));
  const upperCap = Math.max(750, safeLength + 200);
  return Math.min(baseline, upperCap);
}

export function limitEnhancedLength(
  draft: string,
  enhanced: string,
  maxLimit?: number,
): string {
  const source = draft.trim();
  const text = enhanced.trim();
  const maxCharacters = maxLimit ?? calculateMaxEnhancedLength(source.length);
  if (!text || text.length <= maxCharacters) return text;

  const slice = text.slice(0, maxCharacters);
  const endings = [". ", "! ", "? ", ".\n", "!\n", "?\n", '."', '!"', '?"'];
  let cut = -1;
  let matched = ".";
  for (const ending of endings) {
    const index = slice.lastIndexOf(ending);
    if (index > cut) {
      cut = index;
      matched = ending.trimEnd();
    }
  }

  if (cut >= 0) {
    return slice.slice(0, cut + matched.length).trim();
  }

  const wordEnd = slice.lastIndexOf(" ");
  return (wordEnd > 0 ? slice.slice(0, wordEnd) : slice).trim();
}

export async function enhanceUserDraft({
  draft,
  characterName,
  characterBackground,
  storyMode,
  recentTranscript,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
}: {
  draft: string;
  characterName: string;
  characterBackground?: string;
  storyMode?: StoryModeId;
  recentTranscript?: string;
  model?: string;
}): Promise<string> {
  const source = draft.trim();
  const maxCharacters = calculateMaxEnhancedLength(source.length);
  const mode = getStoryMode(storyMode);
  const systemInstruction = `You are a literary co-writer helping an interactive roleplay user enhance their message in a story featuring ${characterName}.

Your mission: Take the user's decision or action and enrich it into evocative, atmospheric roleplay prose that grounds and develops the immediate scene, while remaining focused, natural, and not overly verbose.

GUIDELINES:
1. DEVELOP & GROUND THE IMMEDIATE SCENE:
   - When the user decides what to do, anchor their action in their physical surroundings (lighting, ambient sound, weather, objects, distance, space, or room atmosphere) drawn from or matching the ongoing scene context.
   - Add purposeful physical staging and body language (e.g. posture, breath, expression, hesitation, eye contact, or how they handle an object) that makes their action feel real and tangible.
   - Help the scene feel alive and present, giving ${characterName} clear sensory and emotional cues to react to.

2. CONCISE & FOCUSED (NOT OVERLY VERBOSE):
   - Enhance the scene with crisp, purposeful detail—do NOT write runaway exposition, purple prose, or long wandering monologues.
   - For short actions/decisions, provide 1 to 2 rich, evocative sentences (~30-60 words).
   - For longer drafts, enrich the beats without bloating the message (maximum ${maxCharacters} characters).
   - Ensure the user's core action and dialogue remain the punchy centerpiece of the turn.

3. PRESERVE USER INTENT & AGENCY:
   - Keep the exact decision, dialogue meaning, emotional tone, attitude, and physical intent of the user.
   - Do NOT introduce unprompted major plot twists, new items/abilities, or unrequested decisions.
   - Do NOT control, speak for, or decide actions for ${characterName} or other characters. Only depict the user's side of the moment.
   - Do NOT resolve the outcome or consequence of the user's action (e.g. if attacking, searching, or asking something, leave the reaction and result for the other character's turn).

4. RESPECT POV & TENSE:
   - Match the user's POV (strictly 1st person "I" if the user wrote in 1st person; 2nd or 3rd person if they used those perspectives).
   - Match the tense of the ongoing scene (typically past tense, e.g. "I stepped forward", unless the user's draft or scene is in present tense).

5. STORY MODE STYLING (${mode.title.toUpperCase()}):
   - Tone and sensory texture may reflect ${mode.title} (${mode.description}).
   - Note: This is an enhancement for the user's action turn, so keep it focused on framing their immediate choice.

6. STORY FORMATTING & CLEAN OUTPUT:
   - Spoken dialogue MUST be enclosed in standard double quotes: "Like this."
   - Output ONLY the polished in-character prose.
   - Do NOT include any preamble, commentary, greetings, notes, or "Here is the enhanced version:".
   - Do NOT wrap the entire output in quotation marks unless the entire message is spoken dialogue.`;

  const userText = `${
    characterBackground?.trim()
      ? `STORY SETTING / BACKDROP:\n${characterBackground.trim().slice(0, 500)}\n\n`
      : ""
  }${
    recentTranscript?.trim()
      ? `RECENT SCENE CONTEXT:\n${recentTranscript.trim()}\n\n`
      : ""
  }USER'S DRAFT TO ENHANCE (${source.length} characters; guideline: enrich with scene detail and sensory depth, maximum ~${maxCharacters} characters):
${source}`;

  const enhanced = await generateGeminiText({
    model,
    systemInstruction,
    userText,
    temperature: 0.6,
    maxOutputTokens: Math.min(512, Math.max(128, Math.ceil(maxCharacters / 2.5))),
    thinkingBudget: 0,
  });

  return limitEnhancedLength(source, enhanced, maxCharacters);
}

export async function generateCharacterInnerMonologue({
  character,
  recentTranscript,
  latestResponse,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
}: {
  character: CharacterPersona;
  recentTranscript?: string;
  latestResponse: string;
  model?: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is missing. Please set it in your environment or .env.local.",
    );
  }

  const traits = [
    `Name: ${character.name}`,
    `Role: ${character.occupation}`,
    `Age: ${character.age}`,
    `Gender: ${character.gender}`,
    character.tags && character.tags.length > 0
      ? `Archetypes: ${character.tags.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemInstruction = `You are the private subconscious mind of ${character.name}.
You are giving the reader an unfiltered, unvoiced peek into what ${character.name} is TRULY thinking and feeling right after their latest words or actions in this scene.

CHARACTER PROFILE:
${traits}
${character.profile}
${character.background ? `SECRET KNOWLEDGE & MOTIVATIONS:\n${character.background}\n` : ""}

CRITICAL GUIDELINES:
1. RAW FIRST-PERSON STREAM-OF-CONSCIOUSNESS:
   - Write in 1st person ("I", "my") strictly from ${character.name}'s unvoiced perspective.
   - Reveal the unsaid subtext: secret doubts, hidden attraction or suspicion, gut instincts, calculated plans, physical tension, or true emotional vulnerability.
   - Do NOT summarize or explain what happened from an outside point of view. It must feel like an intimate internal monologue, not a character report.
2. CONCISE & PUNCHY:
   - Keep the monologue to 2 to 4 vivid, gripping sentences (roughly 40 to 80 words total).
   - Never write a lengthy dissertation. Keep it immediate to the exact second this turn ended.
3. NO META-TALK / NO PREAMBLE:
   - Output ONLY the internal thoughts.
   - Do NOT wrap the entire response in quotes.
   - Do NOT say "Here is what I'm thinking:" or mention AI/Gemini.`;

  const userText = `${
    recentTranscript?.trim()
      ? `RECENT SCENE EXCERPT:\n${recentTranscript.trim()}\n\n`
      : ""
  }${character.name.toUpperCase()}'S LATEST RESPONSE (JUST SPOKEN / PERFORMED):
${latestResponse.trim()}

WHAT ARE YOUR UNFILTERED, UNVOICED THOUGHTS AT THIS EXACT MOMENT?`;

  const monologue = await generateGeminiText({
    model,
    systemInstruction,
    userText,
    temperature: 0.7,
    maxOutputTokens: 256,
    thinkingBudget: 0,
  });

  return monologue.trim();
}

export async function summarizeStoryMemory({
  characterName,
  existingRecap,
  transcript,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
}: {
  characterName: string;
  existingRecap?: string | null;
  transcript: string;
  model?: string;
}): Promise<string> {
  const systemInstruction = `You are the continuity editor for an interactive story starring ${characterName}.
Rewrite a compact story bible from the existing recap (if any) plus the new chapters.
Rules:
- Write in third person, past tense, plain prose. No in-character roleplay.
- Preserve location, who is present or absent, relationship temperature, important facts, promises, secrets revealed, and open plot threads.
- Drop filler dialogue, repeated sensory description, and discarded ideas.
- Keep the recap under 450 words, but ALWAYS finish every sentence. Never cut off mid-thought or mid-sentence.
- If the existing recap is incomplete or ends mid-sentence, rewrite it fully. Do not copy a truncation forward.
- If a newer chapter updates an older fact, keep the newer fact.
- Output ONLY the updated recap, no preamble.`;

  const userText = `${
    existingRecap?.trim()
      ? `EXISTING RECAP:\n${existingRecap.trim()}\n\n`
      : "EXISTING RECAP:\n(none yet)\n\n"
  }NEW CHAPTERS TO FOLD IN:\n${transcript}`;

  const recap = await generateGeminiText({
    model,
    systemInstruction,
    userText,
    temperature: 0.3,
    maxOutputTokens: 4096,
    thinkingBudget: 0,
  });

  if (recapLooksIncomplete(recap)) {
    throw new Error("Story memory recap ended before a complete sentence.");
  }

  return recap;
}

export async function generateCharacterResponse({
  character,
  messages,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
  mode,
  supportingCast,
  transitions,
  storyMemoryRecap,
  previousInnerMonologue,
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
    storyMemoryRecap,
    previousInnerMonologue,
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
