import { ObjectId, type Collection, type Db } from "mongodb";
import { withDb } from "@/lib/mongodb";
import type { StoryModeId } from "@/lib/story-modes";
import type { SupportingCharacter } from "@/lib/character-validation";
import type { StoryMemory } from "@/lib/story-memory";

export type StoredChatMessage = {
  id: string;
  sender: "character" | "user";
  text: string;
  createdAt: Date;
};

export type StoryConversationDocument = {
  _id: ObjectId;
  characterId: ObjectId;
  userId: ObjectId;
  mode?: StoryModeId;
  supportingCast?: SupportingCharacter[];
  storyMemory?: StoryMemory;
  messages: StoredChatMessage[];
  createdAt: Date;
  updatedAt: Date;
};

const CONVERSATIONS_COLLECTION = "story_conversations";
let indexesEnsured = false;

function parseObjectId(id: string | ObjectId): ObjectId | null {
  if (id instanceof ObjectId) return id;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function conversationsCollection(
  db: Db,
): Promise<Collection<StoryConversationDocument>> {
  const collection = db.collection<StoryConversationDocument>(
    CONVERSATIONS_COLLECTION,
  );

  if (!indexesEnsured) {
    await collection.createIndex(
      { characterId: 1, userId: 1 },
      { unique: true },
    );
    indexesEnsured = true;
  }

  return collection;
}

export async function getConversation(
  characterId: string | ObjectId,
  userId: string | ObjectId,
): Promise<StoryConversationDocument | null> {
  const charObjectId = parseObjectId(characterId);
  const userObjectId = parseObjectId(userId);
  if (!charObjectId || !userObjectId) return null;

  return withDb(async (db) => {
    const collection = await conversationsCollection(db);
    return collection.findOne({
      characterId: charObjectId,
      userId: userObjectId,
    });
  });
}

export async function saveConversationMessages(
  characterId: string | ObjectId,
  userId: string | ObjectId,
  messages: Array<{
    id: string;
    sender: "character" | "user";
    text: string;
  }>,
  mode?: StoryModeId,
  supportingCast?: SupportingCharacter[],
  storyMemory?: StoryMemory,
): Promise<boolean> {
  const charObjectId = parseObjectId(characterId);
  const userObjectId = parseObjectId(userId);
  if (!charObjectId || !userObjectId) return false;

  const now = new Date();
  const storedMessages: StoredChatMessage[] = messages.map((m) => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    createdAt: now,
  }));

  const updateFields: Record<string, unknown> = {
    messages: storedMessages,
    updatedAt: now,
  };
  if (mode) {
    updateFields.mode = mode;
  }
  if (supportingCast !== undefined) {
    updateFields.supportingCast = supportingCast;
  }
  if (storyMemory !== undefined) {
    updateFields.storyMemory = storyMemory;
  }

  await withDb(async (db) => {
    const collection = await conversationsCollection(db);
    await collection.updateOne(
      { characterId: charObjectId, userId: userObjectId },
      {
        $set: updateFields,
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true },
    );
  });
  return true;
}

export async function updateConversationSupportingCast(
  characterId: string | ObjectId,
  userId: string | ObjectId,
  supportingCast: SupportingCharacter[],
): Promise<boolean> {
  const charObjectId = parseObjectId(characterId);
  const userObjectId = parseObjectId(userId);
  if (!charObjectId || !userObjectId) return false;

  const now = new Date();
  await withDb(async (db) => {
    const collection = await conversationsCollection(db);
    await collection.updateOne(
      { characterId: charObjectId, userId: userObjectId },
      {
        $set: {
          supportingCast,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          messages: [],
          createdAt: now,
        },
      },
      { upsert: true },
    );
  });
  return true;
}

export async function updateConversationMode(
  characterId: string | ObjectId,
  userId: string | ObjectId,
  mode: StoryModeId,
): Promise<boolean> {
  const charObjectId = parseObjectId(characterId);
  const userObjectId = parseObjectId(userId);
  if (!charObjectId || !userObjectId) return false;

  const now = new Date();
  await withDb(async (db) => {
    const collection = await conversationsCollection(db);
    await collection.updateOne(
      { characterId: charObjectId, userId: userObjectId },
      {
        $set: {
          mode,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          messages: [],
          createdAt: now,
        },
      },
      { upsert: true },
    );
  });
  return true;
}

export async function resetConversation(
  characterId: string | ObjectId,
  userId: string | ObjectId,
): Promise<boolean> {
  const charObjectId = parseObjectId(characterId);
  const userObjectId = parseObjectId(userId);
  if (!charObjectId || !userObjectId) return false;

  const now = new Date();
  await withDb(async (db) => {
    const collection = await conversationsCollection(db);
    // Clear story messages and compact memory only.
    // Preserve supportingCast, mode, and other session settings.
    await collection.updateOne(
      { characterId: charObjectId, userId: userObjectId },
      {
        $set: {
          messages: [],
          updatedAt: now,
        },
        $unset: {
          storyMemory: "",
        },
      },
    );
  });
  return true;
}
