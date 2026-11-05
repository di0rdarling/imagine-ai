import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  const client = new MongoClient(uri);

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  return client.connect();
}

const clientPromise = uri ? createClientPromise() : null;

export async function getDb(): Promise<Db> {
  if (!clientPromise) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB?.trim() || "imagine-ai";
  return client.db(dbName);
}
