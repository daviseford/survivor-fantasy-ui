import { doc, DocumentData, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

interface CacheEntry {
  data: DocumentData | undefined;
  loaded: boolean;
  unsub: () => void;
  refCount: number;
  listeners: Set<(data: DocumentData | undefined) => void>;
}

const cache = new Map<string, CacheEntry>();

/**
 * Shared Firestore document snapshot hook.
 *
 * Multiple components calling this with the same `collection/docId` path
 * share a single `onSnapshot` listener. The subscription is ref-counted
 * and closed when all subscribers unmount.
 *
 * Returns raw `snap.data()` result — `undefined` until the first snapshot
 * arrives, then the document data (or `undefined` if the document doesn't
 * exist). Callers apply their own default values.
 */
export function useSharedSnapshot(
  collection: string,
  docId: string | undefined,
): { data: DocumentData | undefined } {
  const path = docId ? `${collection}/${docId}` : undefined;

  const [data, setData] = useState<DocumentData | undefined>(() => {
    if (!path) return undefined;
    const entry = cache.get(path);
    return entry?.loaded ? entry.data : undefined;
  });

  useEffect(() => {
    if (!path) return;

    const existing = cache.get(path);

    if (existing) {
      existing.refCount++;
      existing.listeners.add(setData);
      if (existing.loaded) {
        setData(existing.data);
      }
      return () => {
        existing.listeners.delete(setData);
        existing.refCount--;
        if (existing.refCount <= 0) {
          existing.unsub();
          cache.delete(path);
        }
      };
    }

    const entry: CacheEntry = {
      data: undefined,
      loaded: false,
      unsub: () => {},
      refCount: 1,
      listeners: new Set([setData]),
    };
    cache.set(path, entry);

    const ref = doc(db, collection, docId!);
    entry.unsub = onSnapshot(
      ref,
      (snap) => {
        const snapData = snap.data();
        entry.data = snapData;
        entry.loaded = true;
        for (const listener of entry.listeners) {
          listener(snapData);
        }
      },
      (error) => {
        console.error(`useSharedSnapshot(${path}): onSnapshot error`, error);
        entry.loaded = true;
        for (const listener of entry.listeners) {
          listener(entry.data);
        }
      },
    );

    return () => {
      entry.listeners.delete(setData);
      entry.refCount--;
      if (entry.refCount <= 0) {
        entry.unsub();
        cache.delete(path);
      }
    };
  }, [path, collection, docId]);

  return { data };
}
