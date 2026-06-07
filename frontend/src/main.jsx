import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PinProvider } from './contexts/PinContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PinProvider>
      <App />
    </PinProvider>
  </StrictMode>,
)
