import { useStore } from '@nanostores/preact';
import type { SetRecord } from '@/types/archiveData'
import { useState, useEffect } from 'preact/hooks'
import { $sets, setSets } from '@/stores/storage-sets';

export default function SetsSelect({initialSets, activeSetNumber}: Readonly<{initialSets: SetRecord[], activeSetNumber: string}> ) {
  const sets = useStore($sets);
  const [isOpen, setIsOpen] = useState(false);

  const selectedSet = sets.find((set) => set.setNumber === activeSetNumber) ?? null;

  const handleClick = () => {
    setIsOpen(!isOpen);
  }

  useEffect(() => {
    setSets(initialSets);
  }, [])

  return (
    <section className="text-left rounded-xl px-6 mb-6  w-1/2">
      <div className='relative'>

        {/* <!-- Botón del dropdown --> */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-secondary">
            Select Set{" "}
            <button
              type="button"
              className="inline-flex w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 mt-4 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none justify-between items-center"
              id="options-menu"
              aria-haspopup="true"
              aria-expanded="true"
              onClick={handleClick}
            >
              { selectedSet ? (
                <>
                  {selectedSet.setNumber} — {selectedSet.name}
                </>
              ) : (
                "Select a valid set from the dropdown"
              )}
              {/* <!-- Icono de flecha hacia abajo --> */}
              <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </label>
        </div>

        {/* <!-- Menú del dropdown --> */}
        {
          isOpen && (
            <div 
              className="origin-top-right absolute right-0 mt-1 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="options-menu"
            >
              <div role="none">
                {sets.map((set) => (
                  set.setNumber !== activeSetNumber && (
                    <a href={`/sets/${set.setNumber}`} className="block px-4 py-2 rounded-lg text-sm bg-white text-secondary hover:bg-secondary hover:text-white" role="menuitem" key={set.setNumber}>{set.setNumber} — {set.name}</a>
                  )
                ))}
              </div>
            </div>
          )
        }
        
      </div>
    </section>
  )
}