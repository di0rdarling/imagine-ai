import { describe, expect, it } from "vitest";

import {
  parseSignUpFormData,
  validateSignUpFields,
} from "@/lib/sign-up-validation";

function formDataFrom(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseSignUpFormData", () => {
  it("trims string fields from form data", () => {
    const parsed = parseSignUpFormData(
      formDataFrom({
        name: "  Ada  ",
        email: "  ada@example.com  ",
        password: "password123",
        confirmPassword: "password123",
      }),
    );

    expect(parsed).toEqual({
      name: "Ada",
      email: "ada@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
  });
});

describe("validateSignUpFields", () => {
  it("requires email and password", () => {
    expect(
      validateSignUpFields({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      }),
    ).toEqual({ error: "Email and password are required." });
  });

  it("rejects invalid email addresses", () => {
    expect(
      validateSignUpFields({
        name: "",
        email: "not-an-email",
        password: "password123",
        confirmPassword: "password123",
      }),
    ).toEqual({ error: "Enter a valid email address." });
  });

  it("requires passwords to be at least 8 characters", () => {
    expect(
      validateSignUpFields({
        name: "",
        email: "user@example.com",
        password: "short",
        confirmPassword: "short",
      }),
    ).toEqual({ error: "Password must be at least 8 characters." });
  });

  it("requires password confirmation to match", () => {
    expect(
      validateSignUpFields({
        name: "",
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password456",
      }),
    ).toEqual({ error: "Passwords do not match." });
  });

  it("returns null when fields are valid", () => {
    expect(
      validateSignUpFields({
        name: "User",
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
      }),
    ).toBeNull();
  });
});
