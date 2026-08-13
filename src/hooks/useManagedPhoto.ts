import { useEffect, useRef, useState } from 'react';
import { persistPickedMedia, removeManagedMedia } from '../utils/media';

/**
 * Keeps photo edits transactional:
 * - the currently persisted/original photo is not deleted before Save
 * - newly picked managed files are deleted if the screen is abandoned
 * - replaced originals are deleted only after the domain record is committed
 */
export function useManagedPhoto(initialUri?: string) {
  const [photoUri, setPhotoUri] = useState<string | undefined>(initialUri);
  const originalRef = useRef<string | undefined>(initialUri);
  const pendingRef = useRef<string | undefined>();
  const committedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!committedRef.current && pendingRef.current && pendingRef.current !== originalRef.current) {
        void removeManagedMedia(pendingRef.current);
      }
    };
  }, []);

  function loadOriginal(uri?: string) {
    originalRef.current = uri;
    pendingRef.current = undefined;
    setPhotoUri(uri);
  }

  async function selectPickedUri(uri: string) {
    const next = await persistPickedMedia(uri);
    if (!next) return;

    const previousPending = pendingRef.current;
    pendingRef.current = next;
    setPhotoUri(next);

    if (previousPending && previousPending !== originalRef.current && previousPending !== next) {
      await removeManagedMedia(previousPending);
    }
  }

  async function clearSelection() {
    const pending = pendingRef.current;
    pendingRef.current = undefined;
    setPhotoUri(undefined);
    if (pending && pending !== originalRef.current) {
      await removeManagedMedia(pending);
    }
  }

  async function commit() {
    committedRef.current = true;
    const original = originalRef.current;
    if (original && original !== photoUri) {
      await removeManagedMedia(original);
    }
    originalRef.current = photoUri;
    pendingRef.current = undefined;
  }

  async function deleteAll() {
    committedRef.current = true;
    const original = originalRef.current;
    const pending = pendingRef.current;
    if (original) await removeManagedMedia(original);
    if (pending && pending !== original) await removeManagedMedia(pending);
    originalRef.current = undefined;
    pendingRef.current = undefined;
    setPhotoUri(undefined);
  }

  return {
    photoUri,
    loadOriginal,
    selectPickedUri,
    clearSelection,
    commit,
    deleteAll,
  };
}
