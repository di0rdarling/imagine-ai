export const RECENT_MESSAGE_LIMIT = 16;
export const COMPACTION_SLACK = 8;

export type StoryMemory = {
  recap: string;
  coveredThroughMessageId: string;
  updatedAt: Date | string;
};

export type SerializedStoryMemory = {
  recap: string;
  updatedAt: string | null;
};

export function serializeStoryMemory(
  memory?: StoryMemory | null,
): SerializedStoryMemory | null {
  if (!memory?.recap?.trim()) return null;
  const updatedAt =
    memory.updatedAt instanceof Date
      ? memory.updatedAt.toISOString()
      : memory.updatedAt
        ? String(memory.updatedAt)
        : null;
  return {
    recap: memory.recap.trim(),
    updatedAt,
  };
}

export function recapLooksIncomplete(recap?: string | null): boolean {
  if (!recap?.trim()) return true;
  return !/[.!?…]["'”’)]*$/.test(recap.trim());
}

export type StoryTurnMessage = {
  id: string;
  sender: "character" | "user";
  text: string;
};

export type PreparedModelContext = {
  recentMessages: StoryTurnMessage[];
  recap: string | null;
  needsSummarization: boolean;
  messagesToFold: StoryTurnMessage[];
  coverThroughId: string | null;
  unsummarized: StoryTurnMessage[];
};

function normalizeClientMessages(
  clientMessages: Array<{ id?: string; sender: "character" | "user"; text: string }>,
): StoryTurnMessage[] {
  return clientMessages
    .filter((m) => m.text?.trim())
    .map((m, i) => ({
      id: m.id || `${m.sender}-${i}`,
      sender: m.sender,
      text: m.text,
    }));
}

/**
 * Builds the full turn transcript from the stored conversation plus the
 * newest user message. The UI may still hold the whole story; the server
 * is the source of truth for what already happened.
 */
export function assembleTurnMessages(
  stored: StoryTurnMessage[] | null | undefined,
  clientMessages: Array<{ id?: string; sender: "character" | "user"; text: string }>,
  greeting?: string | null,
): StoryTurnMessage[] {
  const normalizedClient = normalizeClientMessages(clientMessages);
  const latestUser = [...normalizedClient].reverse().find((m) => m.sender === "user");

  if (!latestUser) {
    throw new Error("A user message is required to continue the story.");
  }

  const history: StoryTurnMessage[] =
    stored && stored.length > 0
      ? stored
      : greeting?.trim()
        ? [
            {
              id: "greeting",
              sender: "character",
              text: greeting.trim(),
            },
          ]
        : normalizedClient.filter((m) => m.sender === "character");

  const lastStored = history[history.length - 1];
  if (lastStored && lastStored.id === latestUser.id) {
    return history;
  }
  if (
    lastStored &&
    lastStored.sender === "user" &&
    lastStored.text.trim() === latestUser.text.trim()
  ) {
    return history;
  }

  return [...history, latestUser];
}

export function prepareModelContext(
  messages: StoryTurnMessage[],
  memory?: StoryMemory | null,
): PreparedModelContext {
  const coveredIndex = memory?.coveredThroughMessageId
    ? messages.findIndex((m) => m.id === memory.coveredThroughMessageId)
    : -1;

  const unsummarized = coveredIndex >= 0 ? messages.slice(coveredIndex + 1) : messages;
  const existingRecap = memory?.recap?.trim() ? memory.recap.trim() : null;
  const recapIsIncomplete = Boolean(existingRecap && recapLooksIncomplete(existingRecap));

  // A truncated recap is worse than no recap. Rebuild it from earlier chapters,
  // or omit it this turn if there is not enough history to fold yet.
  if (recapIsIncomplete) {
    if (messages.length > RECENT_MESSAGE_LIMIT) {
      const recentMessages = messages.slice(-RECENT_MESSAGE_LIMIT);
      const messagesToFold = messages.slice(0, -RECENT_MESSAGE_LIMIT);
      return {
        recentMessages,
        recap: existingRecap,
        needsSummarization: true,
        messagesToFold,
        coverThroughId: messagesToFold[messagesToFold.length - 1]?.id ?? null,
        unsummarized: messages,
      };
    }

    return {
      recentMessages: messages,
      recap: null,
      needsSummarization: false,
      messagesToFold: [],
      coverThroughId: memory?.coveredThroughMessageId ?? null,
      unsummarized: messages,
    };
  }

  if (unsummarized.length <= RECENT_MESSAGE_LIMIT + COMPACTION_SLACK) {
    return {
      recentMessages: unsummarized,
      recap: existingRecap,
      needsSummarization: false,
      messagesToFold: [],
      coverThroughId: memory?.coveredThroughMessageId ?? null,
      unsummarized,
    };
  }

  const recentMessages = unsummarized.slice(-RECENT_MESSAGE_LIMIT);
  const messagesToFold = unsummarized.slice(0, -RECENT_MESSAGE_LIMIT);

  return {
    recentMessages,
    recap: existingRecap,
    needsSummarization: true,
    messagesToFold,
    coverThroughId: messagesToFold[messagesToFold.length - 1]?.id ?? null,
    unsummarized,
  };
}

export function fallbackContextOnSummarizeFailure(
  prepared: PreparedModelContext,
  allUnsummarized: StoryTurnMessage[],
): Pick<PreparedModelContext, "recentMessages" | "recap"> {
  const cap = RECENT_MESSAGE_LIMIT + COMPACTION_SLACK;
  return {
    recap: prepared.recap,
    recentMessages: allUnsummarized.slice(-cap),
  };
}

export function formatTranscriptForSummary(messages: StoryTurnMessage[]): string {
  return messages
    .map((m) => {
      const speaker = m.sender === "user" ? "USER" : "CHARACTER";
      return `[${speaker}]\n${m.text.trim()}`;
    })
    .join("\n\n");
}
