import { createContext, useContext, useState, useEffect } from 'react'

const PinContext = createContext(null)

export function PinProvider({ children }) {
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const session = sessionStorage.getItem('gibstock_unlocked')
    if (session === 'true') setUnlocked(true)
  }, [])

  const unlock = (pin) => {
    const correctPin = import.meta.env.VITE_OWNER_PIN || '1234'
    if (pin === correctPin) {
      sessionStorage.setItem('gibstock_unlocked', 'true')
      setUnlocked(true)
      return true
    }
    return false
  }

  const lock = () => {
    sessionStorage.removeItem('gibstock_unlocked')
    setUnlocked(false)
  }

  return (
    <PinContext.Provider value={{ unlocked, unlock, lock }}>
      {children}
    </PinContext.Provider>
  )
}

export function usePin() {
  return useContext(PinContext)
}
