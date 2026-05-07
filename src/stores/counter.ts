import { atom } from 'nanostores';

export const counterStore = atom(0);

export function increment() {
  counterStore.set(counterStore.get() + 1);
}

export function decrement() {
  counterStore.set(counterStore.get() - 1);
}