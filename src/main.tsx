import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { I18nProvider } from '@/i18n'
import { AuthProvider } from '@/hooks/useAuth'
import { SelfProtectingProvider } from '@/components/SelfProtectingProvider'
import { SelfSavingProvider } from '@/components/SelfSavingProvider'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <I18nProvider>
        <AuthProvider>
          <SelfProtectingProvider>
            <SelfSavingProvider>
              <App />
              <Toaster position="top-center" richColors />
            </SelfSavingProvider>
          </SelfProtectingProvider>
        </AuthProvider>
      </I18nProvider>
    </HashRouter>
  </StrictMode>,
)
