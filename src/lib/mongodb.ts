import {
  MongoClient,
  MongoClientClosedError,
  MongoNetworkError,
  MongoNetworkTimeoutError,
  MongoNotConnectedError,
  MongoServerClosedError,
  MongoServerSelectionError,
  MongoSystemError,
  MongoTopologyClosedError,
  type Db,
  type MongoClientOptions,
} from "mongodb";

/** Drop sockets that have sat unused long enough for the server to close them. */
const IDLE_RECYCLE_MS = 45_000;

const CLIENT_OPTIONS: MongoClientOptions = {
  maxIdleTimeMS: IDLE_RECYCLE_MS,
  minPoolSize: 0,
};

type MongoCache = {
  clientPromise?: Promise<MongoClient>;
  /** Wall-clock time of the last checkout. Stays 0 until a client has connected. */
  lastUsedAt: number;
  /** Queries in progress. A live query must not have its client closed underneath it. */
  inFlight: number;
};

const globalForMongo = globalThis as typeof globalThis & {
  __imagineMongo?: MongoCache;
};

function cache(): MongoCache {
  if (!globalForMongo.__imagineMongo) {
    globalForMongo.__imagineMongo = { lastUsedAt: 0, inFlight: 0 };
  }
  return globalForMongo.__imagineMongo;
}

function dbName(): string {
  return process.env.MONGODB_DB?.trim() || "imagine-ai";
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error("Missing MONGODB_URI environment variable."));
  }

  const state = cache();
  if (!state.clientPromise) {
    const client = new MongoClient(uri, CLIENT_OPTIONS);
    const connecting = client.connect().then(
      () => client,
      async (error: unknown) => {
        if (state.clientPromise === connecting) {
          state.clientPromise = undefined;
        }
        await client.close().catch(() => {});
        throw error;
      },
    );
    state.clientPromise = connecting;
  }

  return state.clientPromise;
}

async function discardClient(): Promise<void> {
  const state = cache();
  const pending = state.clientPromise;
  state.clientPromise = undefined;
  state.lastUsedAt = 0;
  if (!pending) return;

  try {
    const client = await pending;
    await client.close();
  } catch {
    // The connection is already unusable.
  }
}

function isIdle(state: MongoCache): boolean {
  return Boolean(
    state.clientPromise &&
      state.lastUsedAt > 0 &&
      Date.now() - state.lastUsedAt > IDLE_RECYCLE_MS,
  );
}

/**
 * A frozen or sleeping process stops driver heartbeats, so Atlas (or a load
 * balancer) closes the socket while this process still holds it. After a gap,
 * replace that client before issuing another command.
 */
async function acquireDb(callerHoldsSlot: boolean): Promise<Db> {
  const state = cache();
  const alone = callerHoldsSlot ? state.inFlight === 1 : state.inFlight === 0;
  if (alone && isIdle(state)) {
    await discardClient();
  }

  const client = await connect();
  cache().lastUsedAt = Date.now();
  return client.db(dbName());
}

export function isTransientMongoError(error: unknown, depth = 0): boolean {
  if (depth > 5 || !error || typeof error !== "object") return false;
  if (
    error instanceof MongoNetworkError ||
    error instanceof MongoNetworkTimeoutError ||
    error instanceof MongoServerSelectionError ||
    error instanceof MongoNotConnectedError ||
    error instanceof MongoTopologyClosedError ||
    error instanceof MongoClientClosedError ||
    error instanceof MongoServerClosedError ||
    error instanceof MongoSystemError
  ) {
    return true;
  }

  const code = "code" in error ? error.code : undefined;
  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    code === "EAI_AGAIN" ||
    code === "ENOTFOUND"
  ) {
    return true;
  }

  const cause = "cause" in error ? error.cause : undefined;
  return cause != null && cause !== error && isTransientMongoError(cause, depth + 1);
}

export async function getDb(): Promise<Db> {
  return acquireDb(false);
}

/**
 * Runs a database operation. A dead idle connection is replaced first, and a
 * single connectivity failure is retried on a new client.
 */
export async function withDb<T>(operation: (db: Db) => Promise<T>): Promise<T> {
  const state = cache();
  state.inFlight += 1;
  try {
    try {
      return await operation(await acquireDb(true));
    } catch (error) {
      if (!isTransientMongoError(error)) throw error;
      await discardClient();
      return await operation(await acquireDb(true));
    }
  } finally {
    state.inFlight -= 1;
    state.lastUsedAt = Date.now();
  }
}
