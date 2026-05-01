'use client'

import { useRouter } from 'next/navigation'
import { TaskChat } from './task-chat'

export function DashboardChatWrapper() {
  const router = useRouter()

  const handleTaskCreated = () => {
    // Refresh the page to show the new task
    router.refresh()
  }

  return <TaskChat onTaskCreated={handleTaskCreated} />
}
