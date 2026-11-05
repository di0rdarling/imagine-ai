import { describe, expect, it } from "vitest";

import { buildSystemInstruction, type CharacterPersona } from "./gemini";

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
});
