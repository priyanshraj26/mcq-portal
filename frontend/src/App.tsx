import { Routes, Route } from 'react-router-dom'
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react'
import MarketingLayout from './components/layouts/MarketingLayout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Configure from './pages/Configure'
import Exam from './pages/Exam'
import Analysis from './pages/Analysis'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--t-bg)' }}>
      <div className="w-6 h-6 border-2 border-violet-core border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!isSignedIn) return <RedirectToSignIn />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingLayout><Home /></MarketingLayout>} />
      <Route path="/test" element={<ProtectedRoute><MarketingLayout><Dashboard /></MarketingLayout></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
      <Route path="/configure/:examId" element={<ProtectedRoute><Configure /></ProtectedRoute>} />
      <Route path="/exam/:sessionId" element={<ProtectedRoute><Exam /></ProtectedRoute>} />
      <Route path="/analysis/:sessionId" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
    </Routes>
  )
}

export default App
