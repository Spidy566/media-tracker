export const SEARCH_MODAL_EVENT = "tracklist:open-search-modal";

export function openSearchModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SEARCH_MODAL_EVENT));
  }
}
