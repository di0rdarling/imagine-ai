import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

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
  messages: StoredChatMessage[];
  createdAt: Date;
  updatedAt: Date;
};

const CONVERSATIONS_COLLECTION = "story_conversations";
let indexesEnsured = false;

export async function conversationsCollection(): Promise<
  Collection<StoryConversationDocument>
> {
  const db = await getDb();
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
  try {
    const charObjectId =
      typeof characterId === "string" ? new ObjectId(characterId) : characterId;
    const userObjectId =
      typeof userId === "string" ? new ObjectId(userId) : userId;
    const collection = await conversationsCollection();
    return await collection.findOne({
      characterId: charObjectId,
      userId: userObjectId,
    });
  } catch {
    return null;
  }
}

export async function saveConversationMessages(
  characterId: string | ObjectId,
  userId: string | ObjectId,
  messages: Array<{
    id: string;
    sender: "character" | "user";
    text: string;
  }>,
): Promise<boolean> {
  try {
    const charObjectId =
      typeof characterId === "string" ? new ObjectId(characterId) : characterId;
    const userObjectId =
      typeof userId === "string" ? new ObjectId(userId) : userId;
    const collection = await conversationsCollection();
    const now = new Date();

    const storedMessages: StoredChatMessage[] = messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      createdAt: now,
    }));

    await collection.updateOne(
      { characterId: charObjectId, userId: userObjectId },
      {
        $set: {
          messages: storedMessages,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true },
    );
    return true;
  } catch {
    return false;
  }
}

export async function resetConversation(
  characterId: string | ObjectId,
  userId: string | ObjectId,
): Promise<boolean> {
  try {
    const charObjectId =
      typeof characterId === "string" ? new ObjectId(characterId) : characterId;
    const userObjectId =
      typeof userId === "string" ? new ObjectId(userId) : userId;
    const collection = await conversationsCollection();
    await collection.deleteOne({
      characterId: charObjectId,
      userId: userObjectId,
    });
    return true;
  } catch {
    return false;
  }
}
