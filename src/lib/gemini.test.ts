import { describe, expect, it } from "vitest";

import { buildSystemInstruction, limitEnhancedLength, type CharacterPersona } from "./gemini";

describe("buildSystemInstruction", () => {
  const sampleCharacter: CharacterPersona = {
    name: "Astra Vance",
    occupation: "Starship Navigator",
    age: "28",
    gender: "Female",
    height: "172",
    tags: ["Sci-Fi", "Explorer", "Pilot"],
    profile: "Sharp-witted navigator who charts uncharted space sectors.",
    greeting: "All systems nominal. Where are we heading next?",
    background: "She knows the coordinates of a lost wormhole.",
  };

  it("includes all relevant character traits in system instructions", () => {
    const prompt = buildSystemInstruction(sampleCharacter);

    expect(prompt).toContain("Name: Astra Vance");
    expect(prompt).toContain("Starship Navigator");
    expect(prompt).toContain("Age: 28");
    expect(prompt).toContain("Height: 172 cm");
    expect(prompt).toContain("Sci-Fi, Explorer, Pilot");
    expect(prompt).toContain("Sharp-witted navigator");
    expect(prompt).toContain("She knows the coordinates of a lost wormhole.");
    expect(prompt).toContain("All systems nominal. Where are we heading next?");
    expect(prompt).toContain("STAY COMPLETELY IN CHARACTER");
    expect(prompt).toContain("UNDERSTANDING USER INPUT");
    expect(prompt).toContain("CURRENT ACTIVE MODE: STORY MODE");
  });

  it("applies specific mode instructions when provided", () => {
    const prompt = buildSystemInstruction(sampleCharacter, "casual");
    expect(prompt).toContain("CURRENT ACTIVE MODE: CASUAL MODE");
    expect(prompt).toContain("Keep responses concise, playful, snappy");
  });

  it("handles characters without optional fields gracefully", () => {
    const minimalCharacter: CharacterPersona = {
      name: "Sol",
      occupation: "Wanderer",
      age: "24",
      gender: "Non-binary",
      profile: "A quiet traveler of few words.",
    };

    const prompt = buildSystemInstruction(minimalCharacter);

    expect(prompt).toContain("Name: Sol");
    expect(prompt).toContain("Wanderer");
    expect(prompt).not.toContain("Height:");
    expect(prompt).not.toContain("BACKSTORY");
  });

  it("includes supporting cast and multi-character scene directions when cast is present", () => {
    const characterWithCast: CharacterPersona = {
      ...sampleCharacter,
      supportingCast: [
        {
          id: "cast-1",
          name: "Vance Senior",
          role: "Veteran Commander",
          description: "Gruff mentor who doubts Astra's navigational instincts",
          inScene: true,
        },
        {
          id: "cast-2",
          name: "Circuit",
          role: "Ship Maintenance Bot",
          description: "Anxious droid",
          inScene: false,
        },
      ],
    };

    const prompt = buildSystemInstruction(characterWithCast);
    expect(prompt).toContain("=== SUPPORTING CAST & RELATIONSHIPS ===");
    expect(prompt).toContain("Vance Senior (Veteran Commander)");
    expect(prompt).toContain("PRESENT IN SCENE / ROOM");
    expect(prompt).toContain("Circuit (Ship Maintenance Bot)");
    expect(prompt).toContain("OFF-SCREEN / NOT CURRENTLY PRESENT");
    expect(prompt).toContain("=== MULTI-CHARACTER SCENE DIRECTING (CRUCIAL) ===");
    expect(prompt).toContain("Vance Senior");
  });

  it("injects mandatory exit and entrance directives when scene transitions are provided", () => {
    const prompt = buildSystemInstruction(
      sampleCharacter,
      "story",
      [
        {
          id: "cast-1",
          name: "Sarah",
          role: "Detective",
          inScene: false,
        },
        {
          id: "cast-2",
          name: "Toby",
          role: "Forensics Tech",
          inScene: true,
        },
      ],
      [
        {
          characterName: "Sarah",
          type: "exit",
          reason: "Received an urgent radio call from precinct",
        },
        {
          characterName: "Toby",
          type: "entrance",
          reason: "Knocks and rushes in with lab results",
        },
      ],
    );

    expect(prompt).toContain("=== IMMEDIATE SCENE TRANSITION DIRECTIVE (EXECUTE THIS TURN) ===");
    expect(prompt).toContain("Sarah has just stepped away or left the scene");
    expect(prompt).toContain("Received an urgent radio call from precinct");
    expect(prompt).toContain("Do NOT let them vanish without explanation");
    expect(prompt).toContain("narrate a smooth, in-character departure or exit for Sarah");
    expect(prompt).toContain("Toby has just arrived or entered the scene");
    expect(prompt).toContain("Knocks and rushes in with lab results");
    expect(prompt).toContain("Narrate Toby's entrance naturally");
  });

  it("includes compact story memory when a recap is provided", () => {
    const prompt = buildSystemInstruction(
      sampleCharacter,
      "story",
      undefined,
      undefined,
      "They escaped the station and promised to meet at dawn.",
    );

    expect(prompt).toContain("=== STORY SO FAR (COMPACT CONTINUITY MEMORY) ===");
    expect(prompt).toContain("They escaped the station and promised to meet at dawn.");
    expect(prompt).toContain("chat transcript for this turn only includes recent messages");
    expect(prompt).toContain("If compact continuity memory is present");
  });

  it("exports enhanceUserDraft function", async () => {
    const { enhanceUserDraft } = await import("./gemini");
    expect(typeof enhanceUserDraft).toBe("function");
  });
});

describe("limitEnhancedLength", () => {
  it("keeps a rewrite that is already within twice the draft", () => {
    const draft = "I told him we should leave.";
    const enhanced = "I told him, quietly, that we should leave.";
    expect(limitEnhancedLength(draft, enhanced)).toBe(enhanced);
  });

  it("cuts an overlong rewrite to at most twice the draft", () => {
    const draft = "I look at him and say we should leave now, before the road floods.";
    const enhanced =
      "I look at him and say we should leave now, before the road floods. Then I describe the whole valley, the horses waiting in the dark, and a plan he never agreed to.";
    const limited = limitEnhancedLength(draft, enhanced);

    expect(limited.length).toBeLessThanOrEqual(draft.length * 2);
    expect(limited.endsWith(".")).toBe(true);
    expect(limited).not.toContain("whole valley");
  });
});
