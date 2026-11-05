import { describe, expect, it } from "vitest";

import {
  assembleTurnMessages,
  COMPACTION_SLACK,
  prepareModelContext,
  recapLooksIncomplete,
  RECENT_MESSAGE_LIMIT,
  serializeStoryMemory,
  type StoryTurnMessage,
} from "./story-memory";

function msg(
  id: string,
  sender: "character" | "user",
  text = `text-${id}`,
): StoryTurnMessage {
  return { id, sender, text };
}

function buildTranscript(count: number): StoryTurnMessage[] {
  return Array.from({ length: count }, (_, i) =>
    msg(`m${i}`, i % 2 === 0 ? "character" : "user"),
  );
}

describe("assembleTurnMessages", () => {
  it("uses the greeting and appends the latest user message when nothing is stored", () => {
    const assembled = assembleTurnMessages(
      [],
      [{ id: "user-1", sender: "user", text: "Let's go." }],
      "All systems nominal.",
    );

    expect(assembled).toEqual([
      { id: "greeting", sender: "character", text: "All systems nominal." },
      { id: "user-1", sender: "user", text: "Let's go." },
    ]);
  });

  it("appends the new user turn onto stored history instead of trusting the full client transcript", () => {
    const stored = [
      msg("greeting", "character", "Hi."),
      msg("user-1", "user", "Hello."),
      msg("char-1", "character", "Welcome back."),
    ];

    const assembled = assembleTurnMessages(stored, [
      { id: "user-2", sender: "user", text: "What now?" },
    ]);

    expect(assembled).toHaveLength(4);
    expect(assembled[3]).toEqual({
      id: "user-2",
      sender: "user",
      text: "What now?",
    });
  });

  it("does not duplicate the user message if it is already the last stored turn", () => {
    const stored = [
      msg("greeting", "character", "Hi."),
      msg("user-1", "user", "Hello."),
    ];

    const assembled = assembleTurnMessages(stored, [
      { id: "user-1", sender: "user", text: "Hello." },
    ]);

    expect(assembled).toHaveLength(2);
  });
});

describe("prepareModelContext", () => {
  it("sends the full transcript while the story is still short", () => {
    const messages = buildTranscript(10);
    const prepared = prepareModelContext(messages, null);

    expect(prepared.needsSummarization).toBe(false);
    expect(prepared.recentMessages).toEqual(messages);
    expect(prepared.recap).toBeNull();
    expect(prepared.messagesToFold).toEqual([]);
  });

  it("keeps using the existing recap until enough new turns accumulate", () => {
    const messages = buildTranscript(20);
    const prepared = prepareModelContext(messages, {
      recap: "They left the station together.",
      coveredThroughMessageId: "m3",
      updatedAt: new Date().toISOString(),
    });

    expect(prepared.needsSummarization).toBe(false);
    expect(prepared.recap).toBe("They left the station together.");
    expect(prepared.recentMessages[0].id).toBe("m4");
    expect(prepared.recentMessages).toHaveLength(16);
  });

  it("folds older unsummarized turns once the slack window is exceeded", () => {
    const overflow = RECENT_MESSAGE_LIMIT + COMPACTION_SLACK + 3;
    const messages = buildTranscript(overflow);
    const prepared = prepareModelContext(messages, null);

    expect(prepared.needsSummarization).toBe(true);
    expect(prepared.recentMessages).toHaveLength(RECENT_MESSAGE_LIMIT);
    expect(prepared.messagesToFold).toHaveLength(COMPACTION_SLACK + 3);
    expect(prepared.coverThroughId).toBe(prepared.messagesToFold.at(-1)?.id);
    expect(prepared.recentMessages[0].id).toBe(`m${COMPACTION_SLACK + 3}`);
  });

  it("rebuilds memory when the stored recap is cut off mid-sentence", () => {
    const messages = buildTranscript(20);
    const prepared = prepareModelContext(messages, {
      recap: "The following morning, while the protagonist prepared to work",
      coveredThroughMessageId: "m3",
      updatedAt: new Date().toISOString(),
    });

    expect(prepared.needsSummarization).toBe(true);
    expect(prepared.messagesToFold.length).toBeGreaterThan(0);
    expect(prepared.recentMessages).toHaveLength(RECENT_MESSAGE_LIMIT);
  });
});

describe("recapLooksIncomplete", () => {
  it("detects recaps that end mid-sentence", () => {
    expect(
      recapLooksIncomplete(
        "The following morning, while the protagonist prepared to work",
      ),
    ).toBe(true);
    expect(recapLooksIncomplete("They left the station together.")).toBe(false);
  });
});

describe("serializeStoryMemory", () => {
  it("returns null when there is no recap yet", () => {
    expect(serializeStoryMemory(null)).toBeNull();
    expect(serializeStoryMemory({ recap: "  ", coveredThroughMessageId: "m1", updatedAt: new Date() })).toBeNull();
  });

  it("exposes the recap and timestamp for the UI", () => {
    const updatedAt = new Date("2026-11-05T21:00:00.000Z");
    expect(
      serializeStoryMemory({
        recap: "They left the station together.",
        coveredThroughMessageId: "m8",
        updatedAt,
      }),
    ).toEqual({
      recap: "They left the station together.",
      updatedAt: "2026-11-05T21:00:00.000Z",
    });
  });
});
