import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  Output,
  stepCountIs,
} from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

// Tool to create a task in the database
const createTaskTool = tool({
  description: 'Create a new task in the firm management system. Use this when the user wants to create a task, add a todo, or schedule work.',
  inputSchema: z.object({
    title: z.string().describe('The title of the task'),
    description: z.string().nullable().describe('A detailed description of the task'),
    category: z.enum(['GST', 'Income Tax', 'MCA', 'TDS', 'Other']).describe('The compliance category for this task'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Priority level of the task'),
    due_date: z.string().describe('Due date in YYYY-MM-DD format'),
    client_name: z.string().nullable().describe('Name of the client this task is for (optional)'),
  }),
  execute: async ({ title, description, category, priority, due_date, client_name }) => {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get team member info
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('id', user.id)
      .single()

    // Find client by name if provided
    let clientId: string | null = null
    if (client_name) {
      const { data: client } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', `%${client_name}%`)
        .limit(1)
        .single()
      
      if (client) {
        clientId = client.id
      }
    }

    // If no client found and name was provided, we need a client
    if (!clientId && client_name) {
      // Get first active client as fallback
      const { data: fallbackClient } = await supabase
        .from('clients')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single()
      
      clientId = fallbackClient?.id || null
    }

    // If still no client, get any client
    if (!clientId) {
      const { data: anyClient } = await supabase
        .from('clients')
        .select('id')
        .limit(1)
        .single()
      
      clientId = anyClient?.id || null
    }

    if (!clientId) {
      return { success: false, error: 'No clients found. Please create a client first.' }
    }

    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        category,
        priority,
        due_date,
        client_id: clientId,
        status: 'pending',
        assigned_to: teamMember?.id || user.id,
      })
      .select('id, title, due_date, priority, category')
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      task: {
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        priority: task.priority,
        category: task.category,
      },
      message: `Task "${title}" created successfully with ${priority} priority, due on ${due_date}.`
    }
  },
})

// Tool to list clients for reference
const listClientsTool = tool({
  description: 'List available clients to help the user choose which client to assign a task to.',
  inputSchema: z.object({
    limit: z.number().default(5).describe('Number of clients to return'),
  }),
  execute: async ({ limit }) => {
    const supabase = await createClient()
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, entity_type')
      .eq('status', 'active')
      .order('name')
      .limit(limit)

    if (error) {
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      clients: clients?.map(c => ({ name: c.name, type: c.entity_type })) || []
    }
  },
})

const tools = {
  createTask: createTaskTool,
  listClients: listClientsTool,
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: `You are a helpful assistant for a CA (Chartered Accountant) firm management portal called Maiden Cube. 
Your job is to help users create tasks quickly through natural language.

When a user wants to create a task:
1. Extract the task details from their message
2. If they mention a deadline like "tomorrow", "next week", "by Friday", convert it to a proper date
3. Infer the category based on keywords (GST, ITR, tax, MCA, TDS, etc.)
4. Infer the priority based on urgency words (urgent, ASAP, important = urgent/high, normal = medium, low priority = low)
5. Use the createTask tool to create the task

Today's date is ${new Date().toISOString().split('T')[0]}.

Be concise and helpful. After creating a task, confirm the details briefly.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse()
}
