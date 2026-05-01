import { del } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, filePath } = await request.json()

    if (!documentId || !filePath) {
      return NextResponse.json({ error: 'Missing documentId or filePath' }, { status: 400 })
    }

    // Delete from Vercel Blob
    try {
      await del(filePath)
    } catch (blobError) {
      console.error('Blob delete error:', blobError)
      // Continue to delete database record even if blob deletion fails
    }

    // Delete from database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
