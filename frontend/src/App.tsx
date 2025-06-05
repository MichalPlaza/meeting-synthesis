import { Navigate, Route, Routes } from 'react-router-dom'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PublicLayout from './layouts/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ProjectListPage from './pages/ProjectListPage'
import { useAuth } from './AuthContext'

function App() {
    const { isAuthenticated } = useAuth();
  
  return (
    <>
    <Routes>
     
      <Route element={<PublicLayout />}>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/projects" replace /> : <HomePage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>  
          <Route path="/projects" element={<ProjectListPage />} />
          {/* <Route path="/projects/new" element={<CreateProjectPage />} /> */}
          {/* <Route path="/projects/:projectId" element={<ProjectDetailsPage />} /> */}
         </Route>
      </Route>

      <Route path="*" element={<div className="text-center mt-10 text-xl">404 Not Found</div>} />

    </Routes>
    </>
  )
}

export default App
