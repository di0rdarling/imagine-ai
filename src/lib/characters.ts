import { ObjectId, type Collection, type Db } from "mongodb";

import { withDb } from "@/lib/mongodb";
import type { CharacterInput, SupportingCharacter } from "@/lib/character-validation";

export type { SupportingCharacter };

export type CharacterDocument = {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  avatarUrl: string | null;
  height: string | null;
  age: string;
  gender: string;
  occupation: string;
  tags: string[];
  profile: string;
  greeting: string;
  background: string | null;
  visibility: "private" | "public";
  copyrightConfirmed: boolean;
  supportingCast?: SupportingCharacter[];
  createdAt: Date;
  updatedAt: Date;
};

const CHARACTERS_COLLECTION = "characters";
let indexesEnsured = false;

function parseObjectId(id: string | ObjectId): ObjectId | null {
  if (id instanceof ObjectId) return id;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function charactersCollection(db: Db): Promise<Collection<CharacterDocument>> {
  const collection = db.collection<CharacterDocument>(CHARACTERS_COLLECTION);

  if (!indexesEnsured) {
    await Promise.all([
      collection.createIndex({ userId: 1, createdAt: -1 }),
      collection.createIndex({ visibility: 1, createdAt: -1 }),
    ]);
    indexesEnsured = true;
  }

  return collection;
}

export async function createCharacter(
  input: CharacterInput,
  userId: string | ObjectId,
): Promise<CharacterDocument> {
  const userObjectId = parseObjectId(userId);
  if (!userObjectId) {
    throw new Error("A valid user id is required to create a character.");
  }

  const now = new Date();
  const doc: CharacterDocument = {
    _id: new ObjectId(),
    userId: userObjectId,
    name: input.name.trim(),
    avatarUrl: input.avatarUrl?.trim() || null,
    height: input.height?.trim() || null,
    age: input.age.trim(),
    gender: input.gender.trim(),
    occupation: input.occupation.trim(),
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    profile: input.profile.trim(),
    greeting: input.greeting.trim(),
    background: input.background?.trim() || null,
    visibility: input.visibility,
    copyrightConfirmed: input.copyrightConfirmed,
    supportingCast: input.supportingCast ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await withDb(async (db) => {
    const collection = await charactersCollection(db);
    return collection.insertOne(doc);
  });

  return {
    ...doc,
    _id: result.insertedId,
  };
}

export async function getCharacterById(
  id: string | ObjectId,
): Promise<CharacterDocument | null> {
  const objectId = parseObjectId(id);
  if (!objectId) return null;

  return withDb(async (db) => {
    const collection = await charactersCollection(db);
    return collection.findOne({ _id: objectId });
  });
}

export async function getCharactersByUserId(
  userId: string | ObjectId,
): Promise<CharacterDocument[]> {
  const objectId = parseObjectId(userId);
  if (!objectId) return [];

  return withDb(async (db) => {
    const collection = await charactersCollection(db);
    return collection.find({ userId: objectId }).sort({ createdAt: -1 }).toArray();
  });
}

export async function getPublicCharacters(limit = 20): Promise<CharacterDocument[]> {
  return withDb(async (db) => {
    const collection = await charactersCollection(db);
    return collection
      .find({ visibility: "public" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  });
}

export async function updateCharacter(
  characterId: string | ObjectId,
  userId: string | ObjectId,
  input: CharacterInput,
): Promise<CharacterDocument | null> {
  const characterObjectId = parseObjectId(characterId);
  const userObjectId = parseObjectId(userId);
  if (!characterObjectId || !userObjectId) return null;

  return withDb(async (db) => {
    const collection = await charactersCollection(db);
    const now = new Date();

    const result = await collection.updateOne(
      { _id: characterObjectId, userId: userObjectId },
      {
        $set: {
          name: input.name.trim(),
          avatarUrl: input.avatarUrl?.trim() || null,
          height: input.height?.trim() || null,
          age: input.age.trim(),
          gender: input.gender.trim(),
          occupation: input.occupation.trim(),
          tags: input.tags.map((t) => t.trim()).filter(Boolean),
          profile: input.profile.trim(),
          greeting: input.greeting.trim(),
          background: input.background?.trim() || null,
          visibility: input.visibility,
          copyrightConfirmed: input.copyrightConfirmed,
          supportingCast: input.supportingCast ?? [],
          updatedAt: now,
        },
      },
    );

    if (result.matchedCount !== 1) {
      return null;
    }

    return collection.findOne({ _id: characterObjectId });
  });
}

export async function deleteCharacter(
  characterId: string | ObjectId,
  userId: string | ObjectId,
): Promise<boolean> {
  const characterObjectId = parseObjectId(characterId);
  const userObjectId = parseObjectId(userId);
  if (!characterObjectId || !userObjectId) return false;

  return withDb(async (db) => {
    const collection = await charactersCollection(db);
    const result = await collection.deleteOne({
      _id: characterObjectId,
      userId: userObjectId,
    });
    return result.deletedCount === 1;
  });
}
