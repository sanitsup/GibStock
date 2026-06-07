import { useState } from 'react'
import { usePin } from '../contexts/PinContext'

export default function PinGate({ children }) {
  const { unlocked, unlock, lock } = usePin()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleUnlock = () => {
    const success = unlock(pin)
    if (!success) {
      setError(true)
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUnlock()
  }

  if (unlocked) {
    return (
      <div className="relative">
        <button
          onClick={lock}
          className="fixed bottom-6 right-6 z-50 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
        >
          🔒 ล็อคหน้าจอ
        </button>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className={`bg-white rounded-3xl shadow-lg border border-slate-100 p-8 w-full max-w-sm text-center ${shake ? 'animate-bounce' : ''}`}>
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-slate-700 mb-1">เฉพาะเจ้าของ</h2>
        <p className="text-sm text-slate-400 mb-8">กรุณาใส่ PIN เพื่อเข้าดูข้อมูล</p>

        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < pin.length ? 'bg-sky-500 scale-110' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => {
            setError(false)
            setPin(e.target.value.replace(/\D/g, ''))
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-300 mb-3"
          placeholder="ใส่ PIN"
        />

        {error && (
          <p className="text-red-400 text-sm mb-3">❌ PIN ไม่ถูกต้อง กรุณาลองใหม่</p>
        )}

        <button
          onClick={handleUnlock}
          disabled={pin.length < 4}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🔓 ปลดล็อค
        </button>
      </div>
    </div>
  )
}
