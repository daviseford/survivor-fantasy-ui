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
 * @param emptyValue - value to use when the document has no data (default: `{}`)
 */
export function useSharedSnapshot<T>(
  collection: string,
  docId: string | undefined,
  emptyValue?: T,
): { data: T } {
  const path = docId ? `${collection}/${docId}` : undefined;

  const [data, setData] = useState<T>(() => {
    if (!path) return (emptyValue ?? {}) as T;
    const entry = cache.get(path);
    if (entry?.loaded) return (entry.data ?? emptyValue ?? {}) as T;
    return (emptyValue ?? {}) as T;
  });

  useEffect(() => {
    if (!path) return;

    const existing = cache.get(path);

    if (existing) {
      existing.refCount++;
      existing.listeners.add(
        setData as (data: DocumentData | undefined) => void,
      );
      if (existing.loaded) {
        setData((existing.data ?? emptyValue ?? {}) as T);
      }
      return () => {
        existing.listeners.delete(
          setData as (data: DocumentData | undefined) => void,
        );
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
      listeners: new Set([setData as (data: DocumentData | undefined) => void]),
    };
    cache.set(path, entry);

    const ref = doc(db, collection, docId!);
    entry.unsub = onSnapshot(
      ref,
      (snap) => {
        const snapData = snap.data();
        entry.data = snapData;
        entry.loaded = true;
        const value = (snapData ?? emptyValue ?? {}) as T;
        for (const listener of entry.listeners) {
          listener(value as DocumentData | undefined);
        }
      },
      (error) => {
        console.error(`useSharedSnapshot(${path}): onSnapshot error`, error);
      },
    );

    return () => {
      entry.listeners.delete(
        setData as (data: DocumentData | undefined) => void,
      );
      entry.refCount--;
      if (entry.refCount <= 0) {
        entry.unsub();
        cache.delete(path);
      }
    };
  }, [path, collection, docId, emptyValue]);

  return { data };
}
