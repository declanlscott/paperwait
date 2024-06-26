import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/users')({
  component: () => <div>Hello /_authed/users!</div>
})