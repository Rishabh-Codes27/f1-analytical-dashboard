export const DEMO_USERNAME = "user";
export const DEMO_PASSWORD = "password123";
export const DEMO_AUTH_KEY = "f1-demo-authenticated";

export function isDemoAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(DEMO_AUTH_KEY) === "true";
}

export function setDemoAuthenticated(isAuthenticated: boolean) {
  window.localStorage.setItem(DEMO_AUTH_KEY, isAuthenticated ? "true" : "false");
}

export function clearDemoAuthentication() {
  window.localStorage.removeItem(DEMO_AUTH_KEY);
}