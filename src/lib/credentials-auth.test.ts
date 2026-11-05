import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyUserCredentials } from "@/lib/credentials-auth";
import type { UserDocument } from "@/lib/users";

vi.mock("@/lib/users", () => ({
  getUserByEmail: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { getUserByEmail } from "@/lib/users";

const mockedGetUserByEmail = vi.mocked(getUserByEmail);
const mockedCompare = vi.mocked(bcrypt.compare);

describe("verifyUserCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when email or password is missing", async () => {
    await expect(verifyUserCredentials(undefined, "secret123")).resolves.toBeNull();
    await expect(verifyUserCredentials("a@b.com", undefined)).resolves.toBeNull();
    expect(mockedGetUserByEmail).not.toHaveBeenCalled();
  });

  it("returns null when no user exists for the email", async () => {
    mockedGetUserByEmail.mockResolvedValue(null);

    await expect(
      verifyUserCredentials("missing@example.com", "password123"),
    ).resolves.toBeNull();

    expect(mockedGetUserByEmail).toHaveBeenCalledWith("missing@example.com");
    expect(mockedCompare).not.toHaveBeenCalled();
  });

  it("returns null when the password does not match", async () => {
    const user: UserDocument = {
      _id: new ObjectId(),
      email: "user@example.com",
      name: "Test User",
      passwordHash: "hashed-password",
      createdAt: new Date(),
    };
    mockedGetUserByEmail.mockResolvedValue(user);
    mockedCompare.mockResolvedValue(false as never);

    await expect(
      verifyUserCredentials("user@example.com", "wrong-password"),
    ).resolves.toBeNull();

    expect(mockedCompare).toHaveBeenCalledWith("wrong-password", "hashed-password");
  });

  it("returns the verified user when credentials are valid", async () => {
    const id = new ObjectId();
    const user: UserDocument = {
      _id: id,
      email: "user@example.com",
      name: "Test User",
      passwordHash: "hashed-password",
      createdAt: new Date(),
    };
    mockedGetUserByEmail.mockResolvedValue(user);
    mockedCompare.mockResolvedValue(true as never);

    await expect(
      verifyUserCredentials("user@example.com", "correct-password"),
    ).resolves.toEqual({
      id: id.toString(),
      email: "user@example.com",
      name: "Test User",
    });
  });
});
