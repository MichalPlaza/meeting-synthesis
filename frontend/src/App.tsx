import { Navigate, Route, Routes } from 'react-router-dom'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PublicLayout from './layouts/PublicLayout'

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('access_token') !== null;
  };

  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={isAuthenticated() ? <Navigate to="/home" replace /> : <HomePage />}/>
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route path="*" element={<div className="text-center mt-10 text-xl">404 Not Found</div>} />
      </Routes>
    </>
  )
}

export default App
