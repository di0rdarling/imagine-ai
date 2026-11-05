import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";
import {
  getConversation,
  resetConversation,
  saveConversationMessages,
} from "./story-conversations";

const mockedGetDb = vi.mocked(getDb);

describe("story-conversations repository", () => {
  const findOne = vi.fn();
  const updateOne = vi.fn();
  const deleteOne = vi.fn();
  const createIndex = vi.fn().mockResolvedValue("index");

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetDb.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne,
        updateOne,
        deleteOne,
        createIndex,
      }),
    } as never);
  });

  it("persists conversation messages with upsert", async () => {
    const characterId = new ObjectId();
    const userId = new ObjectId();
    updateOne.mockResolvedValue({ acknowledged: true });

    const success = await saveConversationMessages(characterId, userId, [
      { id: "1", sender: "user", text: "Hello" },
      { id: "2", sender: "character", text: "Hi!" },
    ]);

    expect(success).toBe(true);
    expect(updateOne).toHaveBeenCalledWith(
      { characterId, userId },
      expect.objectContaining({
        $set: expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ id: "1", sender: "user", text: "Hello" }),
            expect.objectContaining({ id: "2", sender: "character", text: "Hi!" }),
          ]),
        }),
      }),
      { upsert: true },
    );
  });

  it("retrieves a saved conversation", async () => {
    const characterId = new ObjectId();
    const userId = new ObjectId();
    const doc = {
      _id: new ObjectId(),
      characterId,
      userId,
      messages: [{ id: "1", sender: "user", text: "Hello" }],
    };
    findOne.mockResolvedValue(doc);

    const result = await getConversation(characterId, userId);
    expect(findOne).toHaveBeenCalledWith({ characterId, userId });
    expect(result).toEqual(doc);
  });

  it("resets conversation by clearing messages while preserving supporting cast", async () => {
    const characterId = new ObjectId();
    const userId = new ObjectId();
    updateOne.mockResolvedValue({ acknowledged: true });

    const success = await resetConversation(characterId, userId);
    expect(success).toBe(true);
    expect(deleteOne).not.toHaveBeenCalled();
    expect(updateOne).toHaveBeenCalledWith(
      { characterId, userId },
      expect.objectContaining({
        $set: expect.objectContaining({
          messages: [],
        }),
      }),
    );
    const updatePayload = updateOne.mock.calls[0][1];
    expect(updatePayload.$set).not.toHaveProperty("supportingCast");
    expect(updatePayload.$set).not.toHaveProperty("mode");
    expect(updatePayload.$unset).toEqual({ storyMemory: "" });
  });
});
