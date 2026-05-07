
import { useStore } from '@nanostores/preact';
import { counterStore } from '../stores/counter';

export function CounterDisplay () {
  const count = useStore(counterStore);
  return (
    <h2>Counter: {count}</h2>
  )
}