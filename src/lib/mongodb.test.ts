import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeClient = {
  uri: string;
  options?: unknown;
  connect: () => Promise<void>;
  close: ReturnType<typeof vi.fn>;
  db: ReturnType<typeof vi.fn>;
};

const mongo = vi.hoisted(() => {
  const instances: FakeClient[] = [];
  const connectImpl = vi.fn(async () => {});

  class MongoNetworkError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "MongoNetworkError";
    }
  }

  class MongoClient implements FakeClient {
    close = vi.fn(async () => {});
    db = vi.fn((name: string) => ({ databaseName: name }));

    constructor(
      public uri: string,
      public options?: unknown,
    ) {
      instances.push(this);
    }

    connect() {
      return connectImpl();
    }
  }

  return { instances, connect: connectImpl, MongoClient, MongoNetworkError };
});

vi.mock("mongodb", () => ({
  MongoClient: mongo.MongoClient,
  MongoNetworkError: mongo.MongoNetworkError,
  MongoNetworkTimeoutError: class MongoNetworkTimeoutError extends Error {},
  MongoServerSelectionError: class MongoServerSelectionError extends Error {},
  MongoNotConnectedError: class MongoNotConnectedError extends Error {},
  MongoTopologyClosedError: class MongoTopologyClosedError extends Error {},
  MongoClientClosedError: class MongoClientClosedError extends Error {},
  MongoServerClosedError: class MongoServerClosedError extends Error {},
  MongoSystemError: class MongoSystemError extends Error {},
}));

import { MongoNetworkError } from "mongodb";
import { getDb, withDb } from "./mongodb";

const originalUri = process.env.MONGODB_URI;
const originalDb = process.env.MONGODB_DB;

function clearCache() {
  delete (globalThis as { __imagineMongo?: unknown }).__imagineMongo;
}

describe("mongodb client", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    clearCache();
    mongo.instances.length = 0;
    mongo.connect.mockReset();
    mongo.connect.mockResolvedValue(undefined);
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    delete process.env.MONGODB_DB;
  });

  afterEach(() => {
    vi.useRealTimers();
    clearCache();
    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;
    if (originalDb === undefined) delete process.env.MONGODB_DB;
    else process.env.MONGODB_DB = originalDb;
  });

  it("reuses one client for later queries", async () => {
    const first = await getDb();
    const second = await getDb();

    expect(first).toEqual({ databaseName: "imagine-ai" });
    expect(second).toEqual(first);
    expect(mongo.instances).toHaveLength(1);
    expect(mongo.instances[0].options).toMatchObject({
      maxIdleTimeMS: 45_000,
      minPoolSize: 0,
    });
  });

  it("replaces a client that has been idle long enough for the server to drop it", async () => {
    await getDb();
    vi.setSystemTime(new Date("2026-01-01T00:01:00Z"));

    await getDb();

    expect(mongo.instances).toHaveLength(2);
    expect(mongo.instances[0].close).toHaveBeenCalledOnce();
    expect(mongo.instances[1].close).not.toHaveBeenCalled();
  });

  it("does not keep a failed connection for the next request", async () => {
    mongo.connect.mockRejectedValueOnce(new Error("server selection timed out"));

    await expect(getDb()).rejects.toThrow("server selection timed out");
    await expect(getDb()).resolves.toEqual({ databaseName: "imagine-ai" });
    expect(mongo.instances).toHaveLength(2);
    expect(mongo.instances[0].close).toHaveBeenCalledOnce();
  });

  it("retries a query once after a dead socket", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new MongoNetworkError("connection closed"))
      .mockResolvedValueOnce("reply");

    await expect(withDb(operation)).resolves.toBe("reply");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mongo.instances[0].close).toHaveBeenCalledOnce();
  });

  it("does not retry a query that failed for a non-network reason", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("duplicate key"));

    await expect(withDb(operation)).rejects.toThrow("duplicate key");
    expect(operation).toHaveBeenCalledOnce();
    expect(mongo.instances[0].close).not.toHaveBeenCalled();
  });

  it("reports a missing connection string", async () => {
    delete process.env.MONGODB_URI;
    await expect(getDb()).rejects.toThrow("Missing MONGODB_URI");
  });
});
