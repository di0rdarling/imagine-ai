import { describe, expect, it } from "vitest";
import {
  parseStoryMessage,
  parseStoryParagraphs,
  tokenizeParagraph,
} from "./story-formatter";

describe("parseStoryMessage", () => {
  it("correctly splits alternating actions and dialogues", () => {
    const input = `*Another voice message comes in, and you can practically hear the affectionate smirk through her voice.*

"Oh God, you're so right. What was I thinking? You are catastrophic at lying." 

*She giggles, the sound echoing slightly in the empty hallway.* 

"Remember ninth grade when you tried to tell Mr. Henderson that your dog ate your poster board?"`;

    const segments = parseStoryMessage(input);

    expect(segments).toEqual([
      {
        type: "action",
        text: "Another voice message comes in, and you can practically hear the affectionate smirk through her voice.",
      },
      {
        type: "dialogue",
        text: "Oh God, you're so right. What was I thinking? You are catastrophic at lying.",
      },
      {
        type: "action",
        text: "She giggles, the sound echoing slightly in the empty hallway.",
      },
      {
        type: "dialogue",
        text: "Remember ninth grade when you tried to tell Mr. Henderson that your dog ate your poster board?",
      },
    ]);
  });

  it("handles curly quotes gracefully", () => {
    const input = `*Shakes head* “Let’s get moving.”`;
    const segments = parseStoryMessage(input);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: "action", text: "Shakes head" });
    expect(segments[1]).toEqual({ type: "dialogue", text: "Let’s get moving." });
  });

  it("classifies untagged sentences as narration", () => {
    const input = `The clock strikes midnight. "Are you ready?"`;
    const segments = parseStoryMessage(input);

    expect(segments).toEqual([
      { type: "narration", text: "The clock strikes midnight." },
      { type: "dialogue", text: "Are you ready?" },
    ]);
  });

  it("handles message with only plain dialogue", () => {
    const input = `"Hello, friend!"`;
    const segments = parseStoryMessage(input);

    expect(segments).toEqual([
      { type: "dialogue", text: "Hello, friend!" },
    ]);
  });
});

describe("tokenizeParagraph", () => {
  it("preserves inline spacing for novel-style input with dialogue tags", () => {
    const input = `I pick up my phone and laugh, "I'm awake!" I type.`;
    const tokens = tokenizeParagraph(input);

    expect(tokens).toEqual([
      { type: "narration", text: "I pick up my phone and laugh, " },
      { type: "dialogue", text: "I'm awake!" },
      { type: "narration", text: " I type." },
    ]);
  });
});

describe("parseStoryParagraphs", () => {
  it("classifies novel-style mixed sentences as mixed_paragraph", () => {
    const input = `I pick up my phone and laugh, "I'm awake!" I type.`;
    const blocks = parseStoryParagraphs(input);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("mixed_paragraph");
    expect(blocks[0].tokens).toHaveLength(3);
    expect(blocks[0].tokens[1]).toEqual({ type: "dialogue", text: "I'm awake!" });
  });

  it("classifies standalone action, standalone dialogue, and mixed paragraphs accurately", () => {
    const input = `*Another voice message comes in.*

"Oh God, you're so right."

I pick up my phone and laugh, "I'm awake!" I type.`;

    const blocks = parseStoryParagraphs(input);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].kind).toBe("standalone_action");
    expect(blocks[1].kind).toBe("standalone_dialogue");
    expect(blocks[2].kind).toBe("mixed_paragraph");
  });

  it("handles prose with dialogue and narration like screenshot", () => {
    const input = `She lets out a dramatic groan. "And for the record, yes." She looks over.`;
    const blocks = parseStoryParagraphs(input);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("mixed_paragraph");
    expect(blocks[0].tokens[0].type).toBe("narration");
    expect(blocks[0].tokens[1].type).toBe("dialogue");
    expect(blocks[0].tokens[2].type).toBe("narration");
  });

  it("handles asterisk-wrapped quotes without breaking dialogue classification", () => {
    const input = `*"If you were asleep, I'd be calling you,"* her next text arrives.`;
    const blocks = parseStoryParagraphs(input);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("mixed_paragraph");
    expect(blocks[0].tokens.some((t) => t.type === "dialogue")).toBe(true);
  });
});
