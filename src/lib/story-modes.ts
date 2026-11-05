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
- Provide extended, highly descriptive, and emotionally vivid responses.
- Linger on sensory details: sights, sounds, subtle glances, atmospheric ambiance, and inner tensions.
- Deliver responses with 3 to 5 multi-sentence paragraphs giving profound narrative depth.`,
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
- Balance rich scene detail with forward momentum and engaging plot progression.
- Keep the narrative dynamic, introducing turns, reactions, or questions that urge the next action.
- Deliver responses with 2 to 3 well-paced paragraphs.`,
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
- Deliver responses with 2 to 3 conversational and emotionally engaged paragraphs.`,
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
- Deliver responses with 1 to 2 short paragraphs (no more than 3-4 sentences total).`,
  },
};

export const DEFAULT_STORY_MODE: StoryModeId = "story";

export function getStoryMode(modeId?: string | null): StoryModeOption {
  if (modeId && modeId in STORY_MODES) {
    return STORY_MODES[modeId as StoryModeId];
  }
  return STORY_MODES[DEFAULT_STORY_MODE];
}
