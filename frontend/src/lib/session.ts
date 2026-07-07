export type SessionUser = {
  role: "student" | "teacher";
  id: string;
  name: string;
};

const USER_KEY = "ucms_user";

export function setCurrentUser(user: SessionUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {}
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch (error) {
    return null;
  }
}

export function clearCurrentUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {}
}
