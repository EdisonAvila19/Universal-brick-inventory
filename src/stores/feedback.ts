import { atom } from 'nanostores';

export const feedbackStore = atom("");
export const feedbackToneStore = atom<"error" | "info">("info");

export function updateFeedback(message: string, tone: "error" | "info") {
  feedbackStore.set(message);
  feedbackToneStore.set(tone);

  setTimeout(() => {
    feedbackStore.set("");
  }, 3000);
}