import { ObjectId, type Collection, type Db } from "mongodb";

import { withDb } from "@/lib/mongodb";

export type UserDocument = {
  _id: ObjectId;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
};

const USERS_COLLECTION = "users";
let indexesEnsured = false;

async function usersCollection(db: Db): Promise<Collection<UserDocument>> {
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
  return withDb(async (db) => {
    const collection = await usersCollection(db);
    return collection.findOne({ email: normalizedEmail });
  });
}

export async function createUser(input: {
  email: string;
  name?: string;
  passwordHash: string;
}): Promise<UserDocument> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const now = new Date();

  return withDb(async (db) => {
    const collection = await usersCollection(db);

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
  });
}
