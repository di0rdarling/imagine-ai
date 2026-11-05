export type SignUpFields = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignUpValidationError = {
  error: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSignUpFormData(formData: FormData): SignUpFields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
}

export function validateSignUpFields(
  fields: SignUpFields,
): SignUpValidationError | null {
  if (!fields.email || !fields.password) {
    return { error: "Email and password are required." };
  }

  if (!EMAIL_PATTERN.test(fields.email)) {
    return { error: "Enter a valid email address." };
  }

  if (fields.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (fields.password !== fields.confirmPassword) {
    return { error: "Passwords do not match." };
  }

  return null;
}
