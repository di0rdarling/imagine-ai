import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/users", () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";

import { signUp } from "@/app/sign-up/actions";
import { createUser, getUserByEmail } from "@/lib/users";

const mockedGetUserByEmail = vi.mocked(getUserByEmail);
const mockedCreateUser = vi.mocked(createUser);
const mockedHash = vi.mocked(bcrypt.hash);

function signUpForm(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return signUp({}, formData);
}

describe("signUp server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation errors without touching the database", async () => {
    const result = await signUpForm({
      email: "bad-email",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result).toEqual({ error: "Enter a valid email address." });
    expect(mockedGetUserByEmail).not.toHaveBeenCalled();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it("returns an error when the email is already registered", async () => {
    mockedGetUserByEmail.mockResolvedValue({
      _id: "existing" as never,
      email: "user@example.com",
      name: null,
      passwordHash: "hash",
      createdAt: new Date(),
    });

    const result = await signUpForm({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result).toEqual({ error: "An account with this email already exists." });
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it("creates a user with a bcrypt hash when input is valid", async () => {
    mockedGetUserByEmail.mockResolvedValue(null);
    mockedHash.mockResolvedValue("hashed-password" as never);
    mockedCreateUser.mockResolvedValue({
      _id: "new-user" as never,
      email: "user@example.com",
      name: "User",
      passwordHash: "hashed-password",
      createdAt: new Date(),
    });

    const result = await signUpForm({
      name: "User",
      email: "User@Example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result).toEqual({ success: true });
    expect(mockedHash).toHaveBeenCalledWith("password123", 12);
    expect(mockedCreateUser).toHaveBeenCalledWith({
      email: "User@Example.com",
      name: "User",
      passwordHash: "hashed-password",
    });
  });
});
