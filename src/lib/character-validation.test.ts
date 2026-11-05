import { describe, expect, it } from "vitest";
import {
  parseCharacterFormData,
  validateCharacterInput,
  type CharacterInput,
} from "./character-validation";

describe("validateCharacterInput", () => {
  const validPayload: CharacterInput = {
    name: "Aria Shadowalker",
    avatarUrl: "data:image/png;base64,sample",
    height: "172",
    age: "24",
    gender: "Female",
    occupation: "Rogue Spy",
    tags: ["Fantasy", "Action"],
    profile: "An elite operative in the hidden alleys of the citadel.",
    greeting: "Watch your back. The shadows aren't empty tonight.",
    background: "Born in the subterranean reaches of the ancient metropolis.",
    visibility: "public",
    copyrightConfirmed: true,
  };

  it("passes with complete valid input", () => {
    const result = validateCharacterInput(validPayload);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("fails if required fields are missing", () => {
    const result = validateCharacterInput({
      name: "",
      age: "",
      gender: "",
      occupation: "",
      tags: [],
      profile: "",
      greeting: "",
      visibility: "public",
      copyrightConfirmed: false,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe("Character name is required.");
    expect(result.errors.age).toBe("Age is required.");
    expect(result.errors.gender).toBe("Gender is required.");
    expect(result.errors.occupation).toBe("Occupation is required.");
    expect(result.errors.tags).toBe("Please select or add at least one tag.");
    expect(result.errors.profile).toBe("Profile is required.");
    expect(result.errors.greeting).toBe("Greeting is required.");
    expect(result.errors.copyrightConfirmed).toBe(
      "You must confirm that this content does not infringe copyrights or violate laws.",
    );
  });

  it("enforces length constraints", () => {
    const result = validateCharacterInput({
      ...validPayload,
      name: "a".repeat(21),
      height: "123456",
      age: "123456",
      occupation: "o".repeat(51),
      profile: "p".repeat(2001),
      greeting: "g".repeat(501),
      background: "b".repeat(3001),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe("Name must be 20 characters or fewer.");
    expect(result.errors.height).toBe("Height must be 5 characters or fewer.");
    expect(result.errors.age).toBe("Age must be 5 characters or fewer.");
    expect(result.errors.occupation).toBe("Occupation must be 50 characters or fewer.");
    expect(result.errors.profile).toBe("Profile must be 2000 characters or fewer.");
    expect(result.errors.greeting).toBe("Greeting must be 500 characters or fewer.");
    expect(result.errors.background).toBe("Background must be 3000 characters or fewer.");
  });

  it("validates visibility enum", () => {
    const result = validateCharacterInput({
      ...validPayload,
      visibility: "unlisted" as never,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.visibility).toBe("Visibility must be either private or public.");
  });
});

describe("parseCharacterFormData", () => {
  it("parses form data accurately", () => {
    const formData = new FormData();
    formData.set("name", "  Kael  ");
    formData.set("age", "  28  ");
    formData.set("gender", "Male");
    formData.set("occupation", "Cyber Hacker");
    formData.set("tags", "Cyberpunk, Sci-Fi");
    formData.set("profile", "A netrunner on the run.");
    formData.set("greeting", "System breach detected.");
    formData.set("visibility", "private");
    formData.set("copyrightConfirmed", "on");

    const parsed = parseCharacterFormData(formData);

    expect(parsed.name).toBe("Kael");
    expect(parsed.age).toBe("28");
    expect(parsed.gender).toBe("Male");
    expect(parsed.occupation).toBe("Cyber Hacker");
    expect(parsed.tags).toEqual(["Cyberpunk", "Sci-Fi"]);
    expect(parsed.profile).toBe("A netrunner on the run.");
    expect(parsed.greeting).toBe("System breach detected.");
    expect(parsed.visibility).toBe("private");
    expect(parsed.copyrightConfirmed).toBe(true);
  });
});
