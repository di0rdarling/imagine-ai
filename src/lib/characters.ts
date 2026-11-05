import { ObjectId, type Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
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

export async function charactersCollection(): Promise<Collection<CharacterDocument>> {
  const db = await getDb();
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
  const collection = await charactersCollection();
  const now = new Date();
  const userObjectId = typeof userId === "string" ? new ObjectId(userId) : userId;

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

  const result = await collection.insertOne(doc);

  return {
    ...doc,
    _id: result.insertedId,
  };
}

export async function getCharacterById(
  id: string | ObjectId,
): Promise<CharacterDocument | null> {
  try {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    const collection = await charactersCollection();
    return await collection.findOne({ _id: objectId });
  } catch {
    return null;
  }
}

export async function getCharactersByUserId(
  userId: string | ObjectId,
): Promise<CharacterDocument[]> {
  try {
    const objectId = typeof userId === "string" ? new ObjectId(userId) : userId;
    const collection = await charactersCollection();
    return await collection.find({ userId: objectId }).sort({ createdAt: -1 }).toArray();
  } catch {
    return [];
  }
}

export async function getPublicCharacters(limit = 20): Promise<CharacterDocument[]> {
  const collection = await charactersCollection();
  return await collection
    .find({ visibility: "public" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function updateCharacter(
  characterId: string | ObjectId,
  userId: string | ObjectId,
  input: CharacterInput,
): Promise<CharacterDocument | null> {
  try {
    const characterObjectId =
      typeof characterId === "string" ? new ObjectId(characterId) : characterId;
    const userObjectId = typeof userId === "string" ? new ObjectId(userId) : userId;
    const collection = await charactersCollection();
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

    return await collection.findOne({ _id: characterObjectId });
  } catch {
    return null;
  }
}

export async function deleteCharacter(
  characterId: string | ObjectId,
  userId: string | ObjectId,
): Promise<boolean> {
  try {
    const characterObjectId =
      typeof characterId === "string" ? new ObjectId(characterId) : characterId;
    const userObjectId = typeof userId === "string" ? new ObjectId(userId) : userId;
    const collection = await charactersCollection();
    const result = await collection.deleteOne({
      _id: characterObjectId,
      userId: userObjectId,
    });
    return result.deletedCount === 1;
  } catch {
    return false;
  }
}
