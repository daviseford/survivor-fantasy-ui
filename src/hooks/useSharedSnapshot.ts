import { doc, DocumentData, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";

interface CacheEntry {
  data: DocumentData | undefined;
  loaded: boolean;
  unsub: () => void;
  refCount: number;
  listeners: Set<(data: DocumentData | undefined, loaded: boolean) => void>;
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
 * exist). `loaded` becomes `true` after the first snapshot or error.
 */
export function useSharedSnapshot(
  collection: string,
  docId: string | undefined,
): { data: DocumentData | undefined; loaded: boolean } {
  const path = docId ? `${collection}/${docId}` : undefined;

  const [state, setState] = useState<{
    data: DocumentData | undefined;
    loaded: boolean;
  }>(() => {
    if (!path) return { data: undefined, loaded: false };
    const entry = cache.get(path);
    return entry?.loaded
      ? { data: entry.data, loaded: true }
      : { data: undefined, loaded: false };
  });

  // Stable listener identity per component instance
  const listener = useMemo(
    () => (d: DocumentData | undefined, l: boolean) => {
      setState({ data: d, loaded: l });
    },
    [],
  );

  useEffect(() => {
    if (!path) return;

    const existing = cache.get(path);

    if (existing) {
      existing.refCount++;
      existing.listeners.add(listener);
      if (existing.loaded) {
        listener(existing.data, true);
      }
      return () => {
        existing.listeners.delete(listener);
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
      listeners: new Set([listener]),
    };
    cache.set(path, entry);

    const ref = doc(db, collection, docId!);
    entry.unsub = onSnapshot(
      ref,
      (snap) => {
        const snapData = snap.data();
        entry.data = snapData;
        entry.loaded = true;
        for (const l of entry.listeners) {
          try {
            l(snapData, true);
          } catch (e) {
            console.error(`useSharedSnapshot(${path}): listener error`, e);
          }
        }
      },
      (error) => {
        console.error(`useSharedSnapshot(${path}): onSnapshot error`, error);
        entry.loaded = true;
        for (const l of entry.listeners) {
          try {
            l(entry.data, true);
          } catch (e) {
            console.error(`useSharedSnapshot(${path}): listener error`, e);
          }
        }
      },
    );

    return () => {
      entry.listeners.delete(listener);
      entry.refCount--;
      if (entry.refCount <= 0) {
        entry.unsub();
        cache.delete(path);
      }
    };
  }, [path, collection, docId, listener]);

  return state;
}
