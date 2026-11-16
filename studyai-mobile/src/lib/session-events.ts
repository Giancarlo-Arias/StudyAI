import * as SecureStore from "expo-secure-store";

const listeners = new Set<() => void>();
let expired = false;
let cleanup = Promise.resolve();

export const subscribeToSession = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getSessionExpired = () => expired;
export const waitForSessionCleanup = () => cleanup;

export function restoreSession() {
  expired = false;
  listeners.forEach((listener) => listener());
}

export function expireSession(): Error {
  if (!expired) {
    expired = true;
    listeners.forEach((listener) => listener());
    cleanup = SecureStore.deleteItemAsync("studyai_access_token").catch(() => {});
  }
  return new Error("Tu sesión ha expirado.");
}
