'use client'

import { deleteLink } from '@/app/(dashboard)/links/actions'

export default function DeleteLinkButton({ id }: { id: string }) {
  async function handleDelete() {
    if (!confirm('Excluir este link permanentemente? Esta ação não pode ser desfeita.')) return
    await deleteLink(id)
  }

  return (
    <button onClick={handleDelete} className="btn-danger text-xs">
      Excluir
    </button>
  )
}
