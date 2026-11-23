import { useSyncExternalStore } from "react";

let isOpen = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function openSearch() {
  isOpen = true;
  emitChange();
}

export function closeSearch() {
  isOpen = false;
  emitChange();
}

export function toggleSearch() {
  isOpen = !isOpen;
  emitChange();
}

export function useSearchModal() {
  const open = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => isOpen,
    () => false,
  );

  return {
    isOpen: open,
    openSearch,
    closeSearch,
    toggleSearch,
  };
}
