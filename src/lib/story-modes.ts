export type StoryModeId = "immersive" | "story" | "companion" | "casual";

export interface StoryModeOption {
  id: StoryModeId;
  title: string;
  badge: string;
  description: string;
  replyLength: string;
  icon: string;
  accentColor: string;
  maxTokens: number;
  systemPromptGuideline: string;
}

export const STORY_MODES: Record<StoryModeId, StoryModeOption> = {
  immersive: {
    id: "immersive",
    title: "Immersive Mode",
    badge: "12 / msg",
    description: "Maximum immersion — the most vivid, detailed, and lingering.",
    replyLength: "Extended replies (3-5 rich paragraphs)",
    icon: "✨",
    accentColor: "from-pink-500 to-purple-600",
    maxTokens: 4096,
    systemPromptGuideline: `[CURRENT ACTIVE MODE: IMMERSIVE MODE]
- Deliver responses with 3 to 5 multi-sentence paragraphs giving profound narrative depth.
- SPEND PARAGRAPHS ON SCENE & ATMOSPHERE: Allocate most of the word count to physical blocking, room acoustics, environmental texture, lighting, weather, tactile details, and unspoken psychological tension.
- DIALOGUE ECONOMY (CRUCIAL): Do NOT stuff multiple speeches or scattered lines of dialogue across paragraphs. Keep spoken dialogue sparse and impactful (usually at most one single spoken beat or exchange). Let silence and physical presence carry the rest.`,
  },
  story: {
    id: "story",
    title: "Story Mode",
    badge: "8 / msg",
    description: "Page-turning multi-character plot that keeps the drama and story moving.",
    replyLength: "Moderate-length replies (2-3 paragraphs)",
    icon: "📖",
    accentColor: "from-fuchsia-500 to-pink-500",
    maxTokens: 3072,
    systemPromptGuideline: `[CURRENT ACTIVE MODE: STORY MODE]
- Deliver responses with 2 to 3 well-paced paragraphs.
- SPEND PARAGRAPHS ON ACTION & STAGING: Balance forward momentum, physical reactions, environmental shifts, and tension.
- DIALOGUE ECONOMY (CRUCIAL): Do not monopolize the dialogue. Give at most one cohesive spoken line or exchange, and let the user respond before speaking again.`,
  },
  companion: {
    id: "companion",
    title: "Companion Mode",
    badge: "8 / msg",
    description: "Warm, empathetic stories with personal intimacy and character bonding.",
    replyLength: "Moderate-length replies (2-3 paragraphs)",
    icon: "💖",
    accentColor: "from-rose-500 to-amber-500",
    maxTokens: 3072,
    systemPromptGuideline: `[CURRENT ACTIVE MODE: COMPANION MODE]
- Emphasize emotional connection, vulnerability, warmth, and interpersonal chemistry.
- Focus closely on the relationship between you and the user, tuning into their feelings and tone.
- Deliver responses with 2 to 3 conversational and emotionally engaged paragraphs.
- Keep the dialogue natural and focused: one meaningful spoken beat paired with emotional cues, pauses, and expressive body language.`,
  },
  casual: {
    id: "casual",
    title: "Casual Mode",
    badge: "4 / msg",
    description: "Light, easygoing, fast-paced exchanges.",
    replyLength: "Concise replies (1-2 short paragraphs)",
    icon: "☀️",
    accentColor: "from-amber-400 to-pink-500",
    maxTokens: 2048,
    systemPromptGuideline: `[CURRENT ACTIVE MODE: CASUAL MODE]
- Keep responses concise, playful, snappy, and quick to read.
- Avoid overly dense or sprawling narrative essays. Focus on direct, immediate dialogue with punchy expressions.
- Deliver responses with 1 to 2 short paragraphs (no more than 3-4 sentences total), with a single quick line of dialogue.`,
  },
};

export const DEFAULT_STORY_MODE: StoryModeId = "story";

export function getStoryMode(modeId?: string | null): StoryModeOption {
  if (modeId && modeId in STORY_MODES) {
    return STORY_MODES[modeId as StoryModeId];
  }
  return STORY_MODES[DEFAULT_STORY_MODE];
}
