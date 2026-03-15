import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/clerk-react'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { AuthInterceptor } from './components/AuthInterceptor'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY env variable')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#7c68f0',
          colorBackground: '#0a0a0f',
          colorInputBackground: '#111118',
          colorInputText: '#f0eeff',
          colorText: '#f0eeff',
          colorTextSecondary: '#9490b0',
          borderRadius: '0.5rem',
          fontFamily: 'Inter, sans-serif',
        },
        elements: {
          card: 'shadow-2xl shadow-black/50 border border-white/10',
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthInterceptor>
              <App />
              <Toaster position="top-right" />
            </AuthInterceptor>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
