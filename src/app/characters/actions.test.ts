import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/characters", () => ({
  createCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { createCharacter, deleteCharacter } from "@/lib/characters";
import { createCharacterAction, deleteCharacterAction } from "./actions";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedCreateCharacter = vi.mocked(createCharacter);
const mockedDeleteCharacter = vi.mocked(deleteCharacter);

describe("createCharacterAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error if user is not authenticated", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const formData = new FormData();
    const result = await createCharacterAction({}, formData);

    expect(result.error).toBe("You must be signed in to create a character.");
  });

  it("returns validation errors if input is invalid", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: new ObjectId().toString() },
      expires: "1",
    });

    const formData = new FormData();
    formData.set("name", "");

    const result = await createCharacterAction({}, formData);

    expect(result.error).toBe("Please review the highlighted fields.");
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it("successfully creates character when valid and logged in", async () => {
    const userId = new ObjectId().toString();
    const characterId = new ObjectId();

    mockedGetServerSession.mockResolvedValue({
      user: { id: userId },
      expires: "1",
    });

    mockedCreateCharacter.mockResolvedValue({
      _id: characterId,
      userId: new ObjectId(userId),
      name: "Elina",
      avatarUrl: null,
      height: "165",
      age: "23",
      gender: "Female",
      occupation: "Alchemist",
      tags: ["Fantasy"],
      profile: "A brilliant potions master.",
      greeting: "Be careful with that vial!",
      background: null,
      visibility: "public",
      copyrightConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const formData = new FormData();
    formData.set("name", "Elina");
    formData.set("height", "165");
    formData.set("age", "23");
    formData.set("gender", "Female");
    formData.set("occupation", "Alchemist");
    formData.set("tags", "Fantasy");
    formData.set("profile", "A brilliant potions master.");
    formData.set("greeting", "Be careful with that vial!");
    formData.set("visibility", "public");
    formData.set("copyrightConfirmed", "on");

    const result = await createCharacterAction({}, formData);

    expect(result.success).toBe(true);
    expect(result.characterId).toBe(characterId.toString());
  });
});

describe("deleteCharacterAction", () => {
  it("rejects unauthenticated request", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const result = await deleteCharacterAction("123");
    expect(result.success).toBe(false);
    expect(result.error).toBe("You must be signed in.");
  });

  it("deletes character if authorized", async () => {
    const userId = new ObjectId().toString();
    mockedGetServerSession.mockResolvedValue({
      user: { id: userId },
      expires: "1",
    });
    mockedDeleteCharacter.mockResolvedValue(true);

    const result = await deleteCharacterAction("123");
    expect(result.success).toBe(true);
  });
});
