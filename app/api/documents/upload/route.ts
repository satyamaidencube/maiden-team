import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const clientId = formData.get('client_id') as string
    const category = formData.get('category') as string
    const financialYear = formData.get('financial_year') as string
    const name = formData.get('name') as string

    if (!file || !clientId) {
      return NextResponse.json({ error: 'File and client_id are required' }, { status: 400 })
    }

    // Upload to Vercel Blob with private access
    const blob = await put(`documents/${clientId}/${Date.now()}-${file.name}`, file, {
      access: 'private',
    })

    // Save document record to Supabase
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        client_id: clientId,
        name: name || file.name,
        file_path: blob.pathname,
        file_type: file.type,
        file_size: file.size,
        category: category || null,
        financial_year: financialYear || null,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    return NextResponse.json({ document, pathname: blob.pathname })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
