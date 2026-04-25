import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TRPCProvider } from '@/providers/trpc'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  const fallback = document.createElement('div')
  fallback.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;padding:20px;">
      <div>
        <h1 style="color:#F97316;font-size:24px;margin-bottom:12px;">Anglotec AI Master Class</h1>
        <p style="color:#666;font-size:16px;">Something went wrong. Please refresh the page.</p>
        <button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;background:#F97316;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">
          Refresh Page
        </button>
      </div>
    </div>
  `
  document.body.appendChild(fallback)
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </StrictMode>,
  )
}
