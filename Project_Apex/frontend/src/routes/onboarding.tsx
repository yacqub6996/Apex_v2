import { createFileRoute } from '@tanstack/react-router'
import { SignupOnboarding } from '@/pages/signup-onboarding'

export const Route = createFileRoute('/onboarding')({
  component: SignupOnboarding,
})
