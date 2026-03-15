import { Routes, Route } from 'react-router-dom'
import MarketingLayout from './components/layouts/MarketingLayout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Configure from './pages/Configure'
import Exam from './pages/Exam'
import Analysis from './pages/Analysis'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingLayout><Home /></MarketingLayout>} />
      <Route path="/test" element={<MarketingLayout><Dashboard /></MarketingLayout>} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/configure/:examId" element={<Configure />} />
      <Route path="/exam/:sessionId" element={<Exam />} />
      <Route path="/analysis/:sessionId" element={<Analysis />} />
    </Routes>
  )
}

export default App
