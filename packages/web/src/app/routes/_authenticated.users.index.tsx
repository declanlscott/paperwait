import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/users/')({
  component: () => <div>Hello /_authenticated/users/!</div>
})