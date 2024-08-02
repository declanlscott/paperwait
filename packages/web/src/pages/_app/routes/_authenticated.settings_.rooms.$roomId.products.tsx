import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/rooms/$roomId/products')({
  component: () => <div>Hello /_authenticated/settings/rooms/$roomId/products!</div>
})