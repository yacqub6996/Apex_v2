import { createFileRoute } from '@tanstack/react-router'
import { ComponentShowcase } from '@/pages/component-showcase'

export const Route = createFileRoute('/component-showcase')({
  component: ComponentShowcase,
})
