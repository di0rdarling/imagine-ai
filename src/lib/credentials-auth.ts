import bcrypt from "bcryptjs";

import { getUserByEmail } from "@/lib/users";

export type VerifiedUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function verifyUserCredentials(
  email: string | undefined,
  password: string | undefined,
): Promise<VerifiedUser | null> {
  if (!email || !password) {
    return null;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}
