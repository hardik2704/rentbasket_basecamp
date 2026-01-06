import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout';
import {
  LoginPage,
  DashboardPage,
  ProjectsPage,
  ProjectPage,
  ChatPage,
  CalendarPage,
  FilesPage,
  DocumentsPage,
  DocumentEditor,
  SettingsPage
} from './pages';
import './styles/main.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectPage />} />
              <Route path="projects/:projectId/files" element={<FilesPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="documents/new" element={<DocumentEditor />} />
              <Route path="documents/:documentId" element={<DocumentEditor />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
