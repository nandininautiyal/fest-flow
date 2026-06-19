import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/NavBar'
import Login from './pages/Login'
import Register from './pages/Register'
import BrowseEvents from './pages/BrowseEvents'
import EventDetail from './pages/EventDetail'
import MyRegistrations from './pages/MyRegistrations'
import OAuthSuccess from './pages/OAuthSuccess'


function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/events" />} />
        <Route path="/login" element={user ? <Navigate to="/events" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/events" /> : <Register />} />
        <Route path="/events" element={<BrowseEvents />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/my-registrations" element={
          <ProtectedRoute><MyRegistrations /></ProtectedRoute>
        } />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}