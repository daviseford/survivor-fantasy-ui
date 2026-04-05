import { doc, DocumentData, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

interface CacheEntry {
  data: DocumentData;
  unsub: () => void;
  refCount: number;
  listeners: Set<(data: DocumentData) => void>;
}

const cache = new Map<string, CacheEntry>();

/**
 * Shared Firestore document snapshot hook.
 *
 * Multiple components calling this with the same `collection/docId` path
 * share a single `onSnapshot` listener. The subscription is ref-counted
 * and closed when all subscribers unmount.
 */
export function useSharedSnapshot<T = DocumentData>(
  collection: string,
  docId: string | undefined,
): { data: T } {
  const path = docId ? `${collection}/${docId}` : undefined;

  const [data, setData] = useState<T>(() => {
    if (!path) return {} as T;
    const entry = cache.get(path);
    return (entry?.data as T) ?? ({} as T);
  });

  useEffect(() => {
    if (!path) return;

    const existing = cache.get(path);

    if (existing) {
      // Reuse existing subscription
      existing.refCount++;
      existing.listeners.add(setData as (data: DocumentData) => void);
      // Sync current data immediately
      setData(existing.data as T);
      return () => {
        existing.listeners.delete(setData as (data: DocumentData) => void);
        existing.refCount--;
        if (existing.refCount <= 0) {
          existing.unsub();
          cache.delete(path);
        }
      };
    }

    // Create new subscription
    const listeners = new Set<(data: DocumentData) => void>();
    listeners.add(setData as (data: DocumentData) => void);

    const ref = doc(db, collection, docId!);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const snapData = snap.data() ?? {};
        entry.data = snapData;
        for (const listener of entry.listeners) {
          listener(snapData);
        }
      },
      (error) => {
        console.error(`useSharedSnapshot(${path}): onSnapshot error`, error);
      },
    );

    const entry: CacheEntry = {
      data: {} as DocumentData,
      unsub,
      refCount: 1,
      listeners,
    };
    cache.set(path, entry);

    return () => {
      entry.listeners.delete(setData as (data: DocumentData) => void);
      entry.refCount--;
      if (entry.refCount <= 0) {
        entry.unsub();
        cache.delete(path);
      }
    };
  }, [path, collection, docId]);

  return { data };
}
