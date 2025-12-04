import { createFileRoute } from '@tanstack/react-router'
import Landing from "@/pages/landing"

// Alias legacy /home to the main landing page to avoid stale route references
export const Route = createFileRoute('/home')({
  component: Landing,
  // alternatively, redirect to '/'
  // beforeLoad: () => { throw redirect({ to: '/' }) },
})
