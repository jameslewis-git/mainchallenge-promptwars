import { describe, it, expect, beforeEach, vi } from "vitest";

const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value.toString(); },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => {
    for (const key in localStorageStore) {
      delete localStorageStore[key];
    }
  },
};

global.window = {
  localStorage: mockLocalStorage,
} as unknown as Window & typeof globalThis;

import { createThread, upsertThread, getThread, deleteThread, loadThreads, uid } from "./mindspace-store";

describe("MindSpace Thread Store Operations", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("should generate a unique id", () => {
    const id1 = uid();
    const id2 = uid();
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it("should start with an empty thread list", () => {
    expect(loadThreads()).toEqual([]);
  });

  it("should create a new thread with default values", () => {
    const thread = createThread();
    expect(thread.id).toBeDefined();
    expect(thread.title).toBe("New session");
    expect(thread.messages).toEqual([]);
    expect(thread.sessionStarted).toBe(false);
  });

  it("should upsert and load a thread correctly", () => {
    const thread = createThread();
    thread.title = "NEET Prep Anxiety Session";
    thread.examType = "NEET";
    thread.mood = 7;
    thread.sessionStarted = true;

    upsertThread(thread);

    const loaded = loadThreads();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe(thread.id);
    expect(loaded[0].title).toBe("NEET Prep Anxiety Session");
    expect(loaded[0].mood).toBe(7);

    const fetched = getThread(thread.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("NEET Prep Anxiety Session");
  });

  it("should delete a thread correctly", () => {
    const thread1 = createThread();
    const thread2 = createThread();
    upsertThread(thread1);
    upsertThread(thread2);

    expect(loadThreads().length).toBe(2);

    deleteThread(thread1.id);

    const remaining = loadThreads();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(thread2.id);
    expect(getThread(thread1.id)).toBeNull();
  });
});
