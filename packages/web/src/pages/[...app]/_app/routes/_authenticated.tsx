import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthenticatedLayout } from '~/app/layouts/authenticated'
import { queryFactory } from '~/app/lib/hooks/data'
import { initialLoginSearchParams } from '~/app/lib/schemas'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    const actor = context.auth.authenticateRoute(location.href)

    if (context.replicache.status !== 'ready')
      throw redirect({
        to: '/login',
        search: { redirect: location.href, ...initialLoginSearchParams },
      })

    return { actor, replicache: context.replicache.client }
  },
  loader: async ({ context }) => {
    const initialTenant = await context.replicache.query(queryFactory.tenant())
    const initialRooms = await context.replicache.query(queryFactory.rooms())

    return { initialTenant, initialRooms }
  },
  component: AuthenticatedLayout,
})
