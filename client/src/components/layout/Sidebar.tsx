import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { useLangStore, useT } from '../../store/langStore'
import type { Workspace, Board } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'

export function Sidebar() {
  const { user } = useAuthStore()
  const { workspaceId, boardId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { lang, toggle } = useLangStore()
  const t = useT()

  const [createWs, setCreateWs] = useState(false)
  const [createBoard, setCreateBoard] = useState(false)
  const [wsName, setWsName] = useState('')
  const [boardName, setBoardName] = useState('')

  const { data: wsData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then((r) => r.data.workspaces as Workspace[]),
  })

  const { data: wsDetail } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((r) => r.data.workspace as Workspace),
    enabled: !!workspaceId,
  })

  const createWsMutation = useMutation({
    mutationFn: (name: string) => api.post('/workspaces', { name }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      setCreateWs(false); setWsName('')
      navigate(`/w/${res.data.workspace.id}`)
    },
  })

  const createBoardMutation = useMutation({
    mutationFn: (name: string) => api.post('/boards', { name, workspaceId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      setCreateBoard(false); setBoardName('')
      navigate(`/w/${workspaceId}/b/${res.data.board.id}`)
    },
  })

  async function logout() {
    await api.post('/auth/logout')
    useAuthStore.getState().setUser(null)
    navigate('/login')
  }

  return (
    <aside className="w-56 h-full bg-[#1A1A24] border-r border-[#2A2A38] flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[#2A2A38]">
        <div className="w-7 h-7 bg-[#7C5CFC] rounded-[6px] flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="9" rx="1.5" fill="white" fillOpacity="0.9"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.4"/>
          </svg>
        </div>
        <span className="text-[14px] font-semibold text-[#E8E8F0] flex-1">Kanban</span>
        <button
          onClick={toggle}
          className="text-[11px] text-[#6B6B80] hover:text-[#E8E8F0] transition-colors cursor-pointer"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </div>

      {/* Workspaces */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <div className="px-2 mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider">{t.workspaces}</span>
          <button onClick={() => setCreateWs(true)} className="text-[#6B6B80] hover:text-[#E8E8F0] transition-colors text-lg leading-none cursor-pointer">+</button>
        </div>

        {wsData?.map((ws) => (
          <div key={ws.id}>
            <button
              onClick={() => navigate(`/w/${ws.id}`)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[13px] transition-colors text-left cursor-pointer ${workspaceId === ws.id ? 'bg-[#2A2A38] text-[#E8E8F0]' : 'text-[#6B6B80] hover:bg-[#2A2A38]/50 hover:text-[#E8E8F0]'}`}
            >
              <div className="w-5 h-5 rounded-[4px] bg-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC] text-[10px] font-bold shrink-0">
                {ws.name[0].toUpperCase()}
              </div>
              <span className="truncate">{ws.name}</span>
            </button>

            {workspaceId === ws.id && wsDetail?.boards?.map((board: Board) => (
              <button
                key={board.id}
                onClick={() => navigate(`/w/${ws.id}/b/${board.id}`)}
                className={`w-full flex items-center gap-2 pl-7 pr-2 py-1 rounded-[6px] text-[13px] transition-colors text-left cursor-pointer ${boardId === board.id ? 'text-[#7C5CFC]' : 'text-[#6B6B80] hover:text-[#E8E8F0]'}`}
              >
                <span className="text-[#2A2A38]">—</span>
                <span className="truncate">{board.name}</span>
              </button>
            ))}
          </div>
        ))}

        {workspaceId && (
          <button
            onClick={() => setCreateBoard(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-[6px] text-[13px] text-[#6B6B80] hover:text-[#7C5CFC] transition-colors cursor-pointer"
          >
            <span>+</span><span>{t.newBoard}</span>
          </button>
        )}
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#2A2A38] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC] text-[12px] font-bold shrink-0">
            {user?.name[0].toUpperCase()}
          </div>
          <span className="text-[13px] text-[#6B6B80] truncate">{user?.name}</span>
        </div>
        <button onClick={logout} className="text-[#6B6B80] hover:text-[#FF4D6A] transition-colors text-[12px] cursor-pointer shrink-0">{t.out}</button>
      </div>

      <Modal open={createWs} onClose={() => setCreateWs(false)} title={t.newWorkspace}>
        <form onSubmit={(e) => { e.preventDefault(); createWsMutation.mutate(wsName) }} className="flex flex-col gap-4">
          <Input label={t.workspaceName} placeholder={t.myWorkspace} value={wsName} onChange={(e) => setWsName(e.target.value)} autoFocus />
          <Button type="submit" disabled={!wsName || createWsMutation.isPending} className="w-full justify-center">
            {createWsMutation.isPending ? t.creating : t.create}
          </Button>
        </form>
      </Modal>

      <Modal open={createBoard} onClose={() => setCreateBoard(false)} title={t.newBoard}>
        <form onSubmit={(e) => { e.preventDefault(); createBoardMutation.mutate(boardName) }} className="flex flex-col gap-4">
          <Input label={t.boardName} placeholder="Sprint 1" value={boardName} onChange={(e) => setBoardName(e.target.value)} autoFocus />
          <Button type="submit" disabled={!boardName || createBoardMutation.isPending} className="w-full justify-center">
            {createBoardMutation.isPending ? t.creating : t.create}
          </Button>
        </form>
      </Modal>
    </aside>
  )
}
