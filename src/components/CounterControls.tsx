import { increment, decrement } from '@stores/counter';

export function CounterControls () {
  return (
    <div>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  )
}