"use server";

import bcrypt from "bcryptjs";

import {
  parseSignUpFormData,
  validateSignUpFields,
} from "@/lib/sign-up-validation";
import { createUser, getUserByEmail } from "@/lib/users";

export type SignUpState = {
  error?: string;
  success?: boolean;
};

export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const fields = parseSignUpFormData(formData);
  const validationError = validateSignUpFields(fields);
  if (validationError) {
    return validationError;
  }

  const { name, email, password } = fields;

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await createUser({
      email,
      name: name || undefined,
      passwordHash,
    });
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Could not create your account. Please try again." };
  }

  return { success: true };
}
