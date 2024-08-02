import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/products/')({
  component: () => <div>Hello /_authenticated/products/!</div>
})