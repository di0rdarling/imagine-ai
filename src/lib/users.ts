import { ObjectId, type Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";

export type UserDocument = {
  _id: ObjectId;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
};

const USERS_COLLECTION = "users";
let indexesEnsured = false;

async function usersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  const collection = db.collection<UserDocument>(USERS_COLLECTION);

  if (!indexesEnsured) {
    await collection.createIndex({ email: 1 }, { unique: true });
    indexesEnsured = true;
  }

  return collection;
}

export async function getUserByEmail(
  email: string,
): Promise<UserDocument | null> {
  const normalizedEmail = email.trim().toLowerCase();
  return usersCollection().then((collection) =>
    collection.findOne({ email: normalizedEmail }),
  );
}

export async function createUser(input: {
  email: string;
  name?: string;
  passwordHash: string;
}): Promise<UserDocument> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const now = new Date();

  const collection = await usersCollection();

  try {
    const result = await collection.insertOne({
      _id: new ObjectId(),
      email,
      name,
      passwordHash: input.passwordHash,
      createdAt: now,
    });

    return {
      _id: result.insertedId,
      email,
      name,
      passwordHash: input.passwordHash,
      createdAt: now,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new Error("An account with this email already exists.");
    }
    throw error;
  }
}
