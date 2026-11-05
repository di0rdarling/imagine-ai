import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";
import {
  createCharacter,
  getCharacterById,
  getCharactersByUserId,
  getPublicCharacters,
  deleteCharacter,
} from "./characters";

const mockedGetDb = vi.mocked(getDb);

describe("characters repository", () => {
  const findOne = vi.fn();
  const insertOne = vi.fn();
  const deleteOne = vi.fn();
  const createIndex = vi.fn().mockResolvedValue("index");
  const toArray = vi.fn();
  const limitMock = vi.fn().mockReturnValue({ toArray });
  const sortMock = vi.fn().mockReturnValue({ toArray, limit: limitMock });
  const find = vi.fn().mockReturnValue({ sort: sortMock });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetDb.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne,
        insertOne,
        deleteOne,
        createIndex,
        find,
      }),
    } as never);
  });

  it("stores a character associated with a user", async () => {
    const insertedId = new ObjectId();
    const userId = new ObjectId();
    insertOne.mockResolvedValue({ insertedId });

    const created = await createCharacter(
      {
        name: "Sylas",
        age: "26",
        gender: "Male",
        occupation: "Mage",
        tags: ["Fantasy"],
        profile: "A powerful sorcerer seeking forbidden knowledge.",
        greeting: "Greetings, traveler.",
        visibility: "public",
        copyrightConfirmed: true,
      },
      userId,
    );

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        name: "Sylas",
        occupation: "Mage",
        visibility: "public",
      }),
    );
    expect(created._id).toEqual(insertedId);
  });

  it("finds a character by ID", async () => {
    const id = new ObjectId();
    const doc = { _id: id, name: "Sylas" };
    findOne.mockResolvedValue(doc);

    const result = await getCharacterById(id.toString());
    expect(findOne).toHaveBeenCalledWith({ _id: id });
    expect(result).toEqual(doc);
  });

  it("retrieves characters by user ID sorted by recency", async () => {
    const userId = new ObjectId();
    const docs = [{ _id: new ObjectId(), name: "Sylas", userId }];
    toArray.mockResolvedValue(docs);

    const result = await getCharactersByUserId(userId.toString());
    expect(find).toHaveBeenCalledWith({ userId });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toEqual(docs);
  });

  it("retrieves public characters", async () => {
    const docs = [{ _id: new ObjectId(), name: "Sylas", visibility: "public" }];
    toArray.mockResolvedValue(docs);

    const result = await getPublicCharacters(10);
    expect(find).toHaveBeenCalledWith({ visibility: "public" });
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(result).toEqual(docs);
  });

  it("deletes a character only for the owning user", async () => {
    const characterId = new ObjectId();
    const userId = new ObjectId();
    deleteOne.mockResolvedValue({ deletedCount: 1 });

    const success = await deleteCharacter(characterId, userId);
    expect(deleteOne).toHaveBeenCalledWith({
      _id: characterId,
      userId,
    });
    expect(success).toBe(true);
  });
});
