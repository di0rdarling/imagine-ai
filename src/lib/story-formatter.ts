export type StorySegmentType = "action" | "dialogue" | "narration";

export interface StorySegment {
  type: StorySegmentType;
  text: string;
}

export type InlineTokenType = "action" | "dialogue" | "text";

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
 * Parses raw text from a story turn (character or user) into structured segments.
 * Maintained for backward compatibility and simple segment queries.
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
      const intermediate = rawText.slice(lastIndex, matchStart);
      pushPlainText(intermediate, segments);
    }

    if (match[1] !== undefined) {
      const actionText = match[2].trim();
      if (actionText) {
        segments.push({
          type: "action",
          text: actionText,
        });
      }
    } else if (match[3] !== undefined) {
      const dialogueText = match[4].trim();
      if (dialogueText) {
        segments.push({
          type: "dialogue",
          text: dialogueText,
        });
      }
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < rawText.length) {
    const remaining = rawText.slice(lastIndex);
    pushPlainText(remaining, segments);
  }

  return segments;
}

function pushPlainText(raw: string, segments: StorySegment[]) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  segments.push({
    type: "narration",
    text: trimmed,
  });
}

/**
 * Tokenizes a single paragraph into inline action, dialogue, and text tokens,
 * preserving spacing between words so mixed prose flows naturally without line breaks.
 */
export function tokenizeParagraph(paragraphText: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /(\*([^*]+)\*)|(["“]([^"”]+)["”])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(paragraphText)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    if (matchStart > lastIndex) {
      const intermediate = paragraphText.slice(lastIndex, matchStart);
      if (intermediate) {
        tokens.push({
          type: "text",
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

  if (lastIndex < paragraphText.length) {
    const remaining = paragraphText.slice(lastIndex);
    if (remaining) {
      tokens.push({
        type: "text",
        text: remaining,
      });
    }
  }

  return tokens;
}

/**
 * Splits a full message into paragraphs and classifies each paragraph:
 * - standalone_action: paragraph consists only of an *action*
 * - standalone_dialogue: paragraph consists only of "dialogue"
 * - mixed_paragraph: novel-style sentence mixing narration and dialogue (e.g. `I pick up my phone and laugh, "I'm awake!" I type.`)
 * - plain_narration: descriptive text without quotes or asterisks
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
    const hasMeaningfulText = tokens.some(
      (t) => t.type === "text" && t.text.trim().length > 0,
    );

    let kind: StoryBlockKind = "plain_narration";

    if (hasAction && !hasDialogue && !hasMeaningfulText) {
      kind = "standalone_action";
    } else if (hasDialogue && !hasAction && !hasMeaningfulText) {
      kind = "standalone_dialogue";
    } else if (hasDialogue || (hasAction && hasMeaningfulText)) {
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
