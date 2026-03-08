import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from './api/client'
import { useAuthStore } from './store/authStore'
import { AuthPage } from './components/auth/AuthPage'
import { Sidebar } from './components/layout/Sidebar'
import { WorkspacePage } from './pages/WorkspacePage'
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage'
import { KanbanBoard } from './components/board/KanbanBoard'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return (
    <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#7C5CFC] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AuthInit() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInit />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }>
            <Route index element={<Navigate to="/w" replace />} />
            <Route path="w" element={
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#6B6B80] text-[14px]">Select or create a workspace</p>
              </div>
            } />
            <Route path="w/:workspaceId" element={<WorkspacePage />} />
            <Route path="w/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
            <Route path="w/:workspaceId/b/:boardId" element={<KanbanBoard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
