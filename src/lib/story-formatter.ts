export type StorySegmentType = "action" | "dialogue" | "narration";

export interface StorySegment {
  type: StorySegmentType;
  text: string;
}

export type InlineTokenType = "action" | "dialogue" | "narration";

export interface InlineToken {
  type: InlineTokenType;
  text: string;
}

export type StoryBlockKind =
  | "standalone_action"
  | "standalone_dialogue"
  | "mixed_paragraph"
  | "plain_narration";

export interface StoryParagraphBlock {
  kind: StoryBlockKind;
  tokens: InlineToken[];
  rawText: string;
}

/**
 * Tokenizes a paragraph into structured tokens.
 * - Dialogue: matches double quotes `"..."` or smart quotes `“...”`
 * - Action/Emphasis: matches asterisks `*...*`
 * - Narration: any text outside quotes or asterisks (dialogue tags, scene prose, actions)
 */
export function tokenizeParagraph(paragraphText: string): InlineToken[] {
  // Normalize conflicting asterisk-quote collisions:
  // e.g. *"Hello"* or "*Hello*" -> "Hello"
  const cleaned = paragraphText
    .replace(/\*["“]([^"”]+)["”]\*/g, '"$1"')
    .replace(/["“]\*([^*]+)\*["”]/g, '"$1"');

  const tokens: InlineToken[] = [];
  const regex = /(\*([^*]+)\*)|(["“]([^"”]+)["”])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    if (matchStart > lastIndex) {
      const intermediate = cleaned.slice(lastIndex, matchStart);
      if (intermediate) {
        tokens.push({
          type: "narration",
          text: intermediate,
        });
      }
    }

    if (match[1] !== undefined) {
      tokens.push({
        type: "action",
        text: match[2],
      });
    } else if (match[3] !== undefined) {
      tokens.push({
        type: "dialogue",
        text: match[4],
      });
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < cleaned.length) {
    const remaining = cleaned.slice(lastIndex);
    if (remaining) {
      tokens.push({
        type: "narration",
        text: remaining,
      });
    }
  }

  return tokens;
}

/**
 * Splits message text into paragraphs and classifies each paragraph.
 */
export function parseStoryParagraphs(rawText: string): StoryParagraphBlock[] {
  if (!rawText.trim()) return [];

  const rawParagraphs = rawText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return rawParagraphs.map((para) => {
    const tokens = tokenizeParagraph(para);

    const hasAction = tokens.some((t) => t.type === "action" && t.text.trim());
    const hasDialogue = tokens.some((t) => t.type === "dialogue" && t.text.trim());
    const hasNarration = tokens.some(
      (t) => t.type === "narration" && t.text.trim().length > 0,
    );

    let kind: StoryBlockKind = "plain_narration";

    if (hasAction && !hasDialogue && !hasNarration) {
      kind = "standalone_action";
    } else if (hasDialogue && !hasAction && !hasNarration) {
      kind = "standalone_dialogue";
    } else if (hasDialogue || (hasAction && hasNarration)) {
      kind = "mixed_paragraph";
    } else {
      kind = "plain_narration";
    }

    return {
      kind,
      tokens,
      rawText: para,
    };
  });
}

/**
 * Legacy segment parser maintained for tests and backwards compatibility.
 */
export function parseStoryMessage(rawText: string): StorySegment[] {
  if (!rawText) return [];

  const segments: StorySegment[] = [];
  const regex = /(\*([^*]+)\*)|(["“]([^"”]+)["”])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    if (matchStart > lastIndex) {
      const intermediate = rawText.slice(lastIndex, matchStart).trim();
      if (intermediate) {
        segments.push({ type: "narration", text: intermediate });
      }
    }

    if (match[1] !== undefined) {
      const actionText = match[2].trim();
      if (actionText) {
        segments.push({ type: "action", text: actionText });
      }
    } else if (match[3] !== undefined) {
      const dialogueText = match[4].trim();
      if (dialogueText) {
        segments.push({ type: "dialogue", text: dialogueText });
      }
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < rawText.length) {
    const remaining = rawText.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: "narration", text: remaining });
    }
  }

  return segments;
}
