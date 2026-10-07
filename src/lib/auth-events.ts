import { toast } from "sonner";

export const AUTH_MODAL_EVENT = "tracklist:open-auth-modal";

export function promptSignIn(message = "Sign in to bookmark titles") {
  if (typeof window !== "undefined") {
    toast.error(message);
    window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT));
  }
}

export function openAuthModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT));
  }
}
