import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Configure from './pages/Configure'
import Exam from './pages/Exam'
import Analysis from './pages/Analysis'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/configure/:examId" element={<Configure />} />
      <Route path="/exam/:sessionId" element={<Exam />} />
      <Route path="/analysis/:sessionId" element={<Analysis />} />
    </Routes>
  )
}

export default App
