import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/products')({
  component: () => <div>Hello /_authenticated/products!</div>
})