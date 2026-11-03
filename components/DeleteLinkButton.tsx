'use client'

import { deleteLink } from '@/app/(dashboard)/links/actions'

export default function DeleteLinkButton({ id }: { id: string }) {
  async function handleDelete() {
    if (!confirm('Delete this link permanently? This action cannot be undone.')) return
    await deleteLink(id)
  }

  return (
    <button onClick={handleDelete} className="btn-danger text-xs">
      Delete
    </button>
  )
}
