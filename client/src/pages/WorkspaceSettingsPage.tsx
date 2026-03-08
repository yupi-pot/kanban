import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useT } from '../store/langStore'
import type { Workspace } from '../types'
import { Button } from '../components/ui/Button'

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const t = useT()

  const [newName, setNewName] = useState('')
  const [renameMode, setRenameMode] = useState(false)
  const [renameOk, setRenameOk] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((r) => r.data.workspace as Workspace),
    enabled: !!workspaceId,
  })

  const isOwner = !!data && !!currentUser && data.ownerId === currentUser.id

  const renameMutation = useMutation({
    mutationFn: () => api.patch(`/workspaces/${workspaceId}`, { name: newName.trim() }),
    onSuccess: (res) => {
      qc.setQueryData(['workspace', workspaceId], res.data.workspace)
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      setRenameMode(false)
      setNewName('')
      setRenameOk(true)
      setTimeout(() => setRenameOk(false), 2000)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId] })
    },
  })

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => api.delete(`/workspaces/${workspaceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      navigate('/')
    },
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C5CFC] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#6B6B80]">Workspace not found</p>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/w/${workspaceId}`)}
            className="text-[#6B6B80] hover:text-[#E8E8F0] transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="text-[20px] font-semibold text-[#E8E8F0]">{t.workspaceSettings}</h1>
        </div>

        {/* Rename */}
        <section className="bg-[#1A1A24] border border-[#2A2A38] rounded-[12px] p-5 mb-4">
          <h2 className="text-[14px] font-semibold text-[#E8E8F0] mb-4">{data.name}</h2>

          {renameOk && (
            <p className="text-[12px] text-[#06D6A0] mb-2">{t.workspaceRenamed} ✓</p>
          )}

          {renameMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newName.trim() && renameMutation.mutate()}
                placeholder={data.name}
                className="flex-1 bg-[#0F0F13] border border-[#2A2A38] rounded-[8px] px-3 py-2 text-[13px] text-[#E8E8F0] placeholder:text-[#6B6B80] outline-none focus:border-[#7C5CFC] transition-colors"
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => renameMutation.mutate()}
                disabled={!newName.trim() || renameMutation.isPending}
              >
                {renameMutation.isPending ? '...' : t.renameWorkspace}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRenameMode(false); setNewName('') }}
              >
                {t.cancel}
              </Button>
            </div>
          ) : (
            isOwner && (
              <Button variant="ghost" size="sm" onClick={() => setRenameMode(true)}>
                {t.renameWorkspace}
              </Button>
            )
          )}
        </section>

        {/* Members */}
        <section className="bg-[#1A1A24] border border-[#2A2A38] rounded-[12px] p-5 mb-4">
          <h2 className="text-[13px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-3">{t.membersTitle}</h2>
          <div className="flex flex-col gap-2">
            {data.members?.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-[#0F0F13] border border-[#2A2A38] rounded-[8px]">
                <div className="w-8 h-8 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC] text-[13px] font-bold shrink-0">
                  {m.user.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#E8E8F0] font-medium">{m.user.name}</p>
                  <p className="text-[12px] text-[#6B6B80]">{m.user.email}</p>
                </div>
                <span className="text-[11px] text-[#6B6B80] bg-[#2A2A38] px-2 py-0.5 rounded-[4px] mr-2">
                  {m.role}
                </span>
                {isOwner && m.role !== 'OWNER' && m.userId !== currentUser?.id && (
                  <button
                    onClick={() => removeMemberMutation.mutate(m.userId)}
                    disabled={removeMemberMutation.isPending}
                    className="text-[11px] text-[#6B6B80] hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10 border border-transparent hover:border-[#FF4D6A]/30 px-2 py-0.5 rounded-[4px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {t.removeMember}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        {isOwner && (
          <section className="bg-[#1A1A24] border border-[#FF4D6A]/30 rounded-[12px] p-5">
            <h2 className="text-[13px] font-semibold text-[#FF4D6A] uppercase tracking-wider mb-3">{t.dangerZone}</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-[#E8E8F0] font-medium">{t.deleteWorkspace}</p>
                <p className="text-[12px] text-[#6B6B80] mt-0.5">This action cannot be undone</p>
              </div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteWorkspaceMutation.mutate()}
                    disabled={deleteWorkspaceMutation.isPending}
                    className="text-[12px] bg-[#FF4D6A] hover:bg-[#FF6B6B] text-white px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deleteWorkspaceMutation.isPending ? '...' : t.deleteWorkspaceConfirm}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[12px] text-[#6B6B80] hover:text-[#E8E8F0] px-2 py-1.5 transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  {t.deleteWorkspace}
                </Button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
