import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import HomePage from '@/pages/HomePage'
import ChatPage from '@/pages/ChatPage'
import AdminPage from '@/pages/AdminPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
