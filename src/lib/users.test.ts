import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";
import { createUser, getUserByEmail } from "@/lib/users";

const mockedGetDb = vi.mocked(getDb);

describe("users", () => {
  const findOne = vi.fn();
  const insertOne = vi.fn();
  const createIndex = vi.fn().mockResolvedValue("email_1");

  beforeEach(() => {
    vi.clearAllMocks();
    createIndex.mockResolvedValue("email_1");

    mockedGetDb.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne,
        insertOne,
        createIndex,
      }),
    } as never);
  });

  it("looks up users by normalized email", async () => {
    findOne.mockResolvedValue(null);

    await getUserByEmail("  User@Example.com  ");

    expect(findOne).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("stores normalized email and optional name on create", async () => {
    const insertedId = new ObjectId();
    insertOne.mockResolvedValue({ insertedId });

    const created = await createUser({
      email: "  User@Example.com  ",
      name: "  Ada  ",
      passwordHash: "hashed-password",
    });

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        name: "Ada",
        passwordHash: "hashed-password",
      }),
    );
    expect(created.email).toBe("user@example.com");
    expect(created.name).toBe("Ada");
  });

  it("maps duplicate key errors to a friendly message", async () => {
    insertOne.mockRejectedValue(Object.assign(new Error("duplicate"), { code: 11000 }));

    await expect(
      createUser({
        email: "user@example.com",
        passwordHash: "hashed-password",
      }),
    ).rejects.toThrow("An account with this email already exists.");
  });
});
