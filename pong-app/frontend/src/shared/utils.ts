// frontend/src/shared/utils.ts
import { Avatar, AvatarData } from './types';

// Use the same validation regex as backend
export const validatePlayerName = (name: string): boolean => {
  if (!name || name.length === 0 || name.length > 20) {
    return false;
  }
  
  const validNameRegex = /^[A-Za-z0-9 _-]+$/;
  return validNameRegex.test(name.trim());
};

// Avatar management utilities
export const getStoredAvatarData = (key: string): AvatarData | null => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(`Failed to parse ${key} from localStorage:`, e);
      return null;
    }
  }
  return null;
};

export const saveAvatarData = (key: string, avatar: AvatarData | null): void => {
  if (avatar) {
    localStorage.setItem(key, JSON.stringify(avatar));
  } else {
    localStorage.removeItem(key);
  }
};

// Cleanup localStorage on mount
export const cleanupGameStorage = (): void => {
  localStorage.removeItem("points1");
  localStorage.removeItem("points2");
  localStorage.removeItem("points3");
  localStorage.removeItem("tournamentGuests");
  localStorage.removeItem("guestCount");
};
