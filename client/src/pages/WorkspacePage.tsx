import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useT } from '../store/langStore'
import type { Workspace, Board } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { useState } from 'react'
import { motion } from 'framer-motion'

export function WorkspacePage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const t = useT()
  const [createBoard, setCreateBoard] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const { data } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((r) => r.data.workspace as Workspace),
    enabled: !!workspaceId,
  })

  const createBoardMutation = useMutation({
    mutationFn: (name: string) => api.post('/boards', { name, workspaceId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      setCreateBoard(false)
      setBoardName('')
      navigate(`/w/${workspaceId}/b/${res.data.board.id}`)
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(`/workspaces/${workspaceId}/invite`, { email }),
    onSuccess: () => { setInviteOpen(false); setInviteEmail(''); qc.invalidateQueries({ queryKey: ['workspace', workspaceId] }) },
    onError: (e: any) => setInviteError(e.response?.data?.error || 'Error'),
  })

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-semibold text-[#E8E8F0]">{data?.name}</h1>
            <p className="text-[13px] text-[#6B6B80] mt-0.5">{data?.members?.length} {t.members}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(true)}>
              {t.inviteMember}
            </Button>
            <Button size="sm" onClick={() => setCreateBoard(true)}>
              + {t.newBoard}
            </Button>
          </div>
        </div>

        {/* Boards grid */}
        <div className="grid grid-cols-2 gap-3">
          {data?.boards?.map((board: Board, i) => (
            <motion.button
              key={board.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/w/${workspaceId}/b/${board.id}`)}
              className="bg-[#1A1A24] border border-[#2A2A38] hover:border-[#7C5CFC]/40 hover:shadow-[0_0_16px_rgba(124,92,252,0.15)] rounded-[12px] p-5 text-left transition-all duration-200 cursor-pointer group"
            >
              <div className="w-8 h-8 bg-[#7C5CFC]/20 rounded-[8px] flex items-center justify-center mb-3 group-hover:bg-[#7C5CFC]/30 transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="9" rx="1.5" fill="#7C5CFC" fillOpacity="0.8"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#7C5CFC" fillOpacity="0.8"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#7C5CFC" fillOpacity="0.3"/>
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-[#E8E8F0]">{board.name}</p>
            </motion.button>
          ))}

          {/* Empty state */}
          {data?.boards?.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-[#2A2A38] rounded-[12px] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="9" rx="1.5" fill="#6B6B80" fillOpacity="0.8"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#6B6B80" fillOpacity="0.8"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#6B6B80" fillOpacity="0.3"/>
                </svg>
              </div>
              <p className="text-[14px] text-[#6B6B80] mb-4">{t.noBoards}</p>
              <Button size="sm" onClick={() => setCreateBoard(true)}>{t.createFirstBoard}</Button>
            </div>
          )}
        </div>

        {/* Members */}
        {data?.members && data.members.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[13px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-3">{t.membersTitle}</h2>
            <div className="flex flex-col gap-2">
              {data.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-[#1A1A24] border border-[#2A2A38] rounded-[8px]">
                  <div className="w-8 h-8 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC] text-[13px] font-bold">
                    {m.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#E8E8F0] font-medium">{m.user.name}</p>
                    <p className="text-[12px] text-[#6B6B80]">{m.user.email}</p>
                  </div>
                  <span className="text-[11px] text-[#6B6B80] bg-[#2A2A38] px-2 py-0.5 rounded-[4px]">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={createBoard} onClose={() => setCreateBoard(false)} title={t.newBoard}>
        <form onSubmit={(e) => { e.preventDefault(); createBoardMutation.mutate(boardName) }} className="flex flex-col gap-4">
          <Input label={t.boardName} placeholder="Sprint 1" value={boardName} onChange={(e) => setBoardName(e.target.value)} autoFocus />
          <Button type="submit" disabled={!boardName || createBoardMutation.isPending} className="w-full justify-center">
            {createBoardMutation.isPending ? t.creating : t.create}
          </Button>
        </form>
      </Modal>

      <Modal open={inviteOpen} onClose={() => { setInviteOpen(false); setInviteError('') }} title={t.inviteMember}>
        <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(inviteEmail) }} className="flex flex-col gap-4">
          <Input label={t.email} type="email" placeholder={t.inviteEmail} value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }} error={inviteError} autoFocus />
          <Button type="submit" disabled={!inviteEmail || inviteMutation.isPending} className="w-full justify-center">
            {inviteMutation.isPending ? t.inviting : t.sendInvite}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
