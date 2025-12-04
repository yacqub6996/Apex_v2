import { createFileRoute } from '@tanstack/react-router'
import { ExecutionFeedPage } from '@/pages/dashboard/executions'

export const Route = createFileRoute('/dashboard/executions')({
  component: ExecutionFeedPage,
})
