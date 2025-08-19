import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WagmiAppProvider from './providers/WagmiProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiAppProvider>
      <App />
    </WagmiAppProvider>
  </StrictMode>,
)
