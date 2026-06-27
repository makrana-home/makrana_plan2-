const DEV_ADMIN_STORAGE_KEY = "makrana:dev-admin";

function isDevAdminEnabled() {
  return (
    import.meta.env.DEV === true &&
    import.meta.env.PROD !== true &&
    import.meta.env.VITE_ENABLE_DEV_ADMIN === "true" &&
    Boolean(import.meta.env.VITE_DEV_ADMIN_EMAIL) &&
    Boolean(import.meta.env.VITE_DEV_ADMIN_PASSWORD)
  );
}

export function getDevAdminEmail() {
  return isDevAdminEnabled() ? import.meta.env.VITE_DEV_ADMIN_EMAIL : undefined;
}

export function isDevAdminLogin(email: string, password: string) {
  if (!isDevAdminEnabled()) return false;
  return (
    email.toLowerCase() === import.meta.env.VITE_DEV_ADMIN_EMAIL?.toLowerCase() &&
    password === import.meta.env.VITE_DEV_ADMIN_PASSWORD
  );
}

export function enableDevAdminSession() {
  if (!isDevAdminEnabled() || typeof window === "undefined") return;
  window.localStorage.setItem(DEV_ADMIN_STORAGE_KEY, "true");
}

export function clearDevAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEV_ADMIN_STORAGE_KEY);
}

export function hasDevAdminSession() {
  return (
    isDevAdminEnabled() &&
    typeof window !== "undefined" &&
    window.localStorage.getItem(DEV_ADMIN_STORAGE_KEY) === "true"
  );
}
