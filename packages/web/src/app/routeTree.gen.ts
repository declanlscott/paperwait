/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as LoginImport } from './routes/login'
import { Route as AuthenticatedImport } from './routes/_authenticated'
import { Route as AuthenticatedDashboardImport } from './routes/_authenticated.dashboard'
import { Route as AuthenticatedUsersIndexImport } from './routes/_authenticated.users.index'
import { Route as AuthenticatedSettingsIndexImport } from './routes/_authenticated.settings.index'
import { Route as AuthenticatedSettingsIntegrationsImport } from './routes/_authenticated.settings.integrations'

// Create Virtual Routes

const AuthenticatedUsersLazyImport = createFileRoute('/_authenticated/users')()
const AuthenticatedSettingsLazyImport = createFileRoute(
  '/_authenticated/settings',
)()

// Create/Update Routes

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedRoute = AuthenticatedImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedUsersLazyRoute = AuthenticatedUsersLazyImport.update({
  path: '/users',
  getParentRoute: () => AuthenticatedRoute,
} as any).lazy(() =>
  import('./routes/_authenticated.users.lazy').then((d) => d.Route),
)

const AuthenticatedSettingsLazyRoute = AuthenticatedSettingsLazyImport.update({
  path: '/settings',
  getParentRoute: () => AuthenticatedRoute,
} as any).lazy(() =>
  import('./routes/_authenticated.settings.lazy').then((d) => d.Route),
)

const AuthenticatedDashboardRoute = AuthenticatedDashboardImport.update({
  path: '/dashboard',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedUsersIndexRoute = AuthenticatedUsersIndexImport.update({
  path: '/',
  getParentRoute: () => AuthenticatedUsersLazyRoute,
} as any)

const AuthenticatedSettingsIndexRoute = AuthenticatedSettingsIndexImport.update(
  {
    path: '/',
    getParentRoute: () => AuthenticatedSettingsLazyRoute,
  } as any,
)

const AuthenticatedSettingsIntegrationsRoute =
  AuthenticatedSettingsIntegrationsImport.update({
    path: '/integrations',
    getParentRoute: () => AuthenticatedSettingsLazyRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AuthenticatedImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/_authenticated/dashboard': {
      id: '/_authenticated/dashboard'
      path: '/dashboard'
      fullPath: '/dashboard'
      preLoaderRoute: typeof AuthenticatedDashboardImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/settings': {
      id: '/_authenticated/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof AuthenticatedSettingsLazyImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/users': {
      id: '/_authenticated/users'
      path: '/users'
      fullPath: '/users'
      preLoaderRoute: typeof AuthenticatedUsersLazyImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/settings/integrations': {
      id: '/_authenticated/settings/integrations'
      path: '/integrations'
      fullPath: '/settings/integrations'
      preLoaderRoute: typeof AuthenticatedSettingsIntegrationsImport
      parentRoute: typeof AuthenticatedSettingsLazyImport
    }
    '/_authenticated/settings/': {
      id: '/_authenticated/settings/'
      path: '/'
      fullPath: '/settings/'
      preLoaderRoute: typeof AuthenticatedSettingsIndexImport
      parentRoute: typeof AuthenticatedSettingsLazyImport
    }
    '/_authenticated/users/': {
      id: '/_authenticated/users/'
      path: '/'
      fullPath: '/users/'
      preLoaderRoute: typeof AuthenticatedUsersIndexImport
      parentRoute: typeof AuthenticatedUsersLazyImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  AuthenticatedRoute: AuthenticatedRoute.addChildren({
    AuthenticatedDashboardRoute,
    AuthenticatedSettingsLazyRoute: AuthenticatedSettingsLazyRoute.addChildren({
      AuthenticatedSettingsIntegrationsRoute,
      AuthenticatedSettingsIndexRoute,
    }),
    AuthenticatedUsersLazyRoute: AuthenticatedUsersLazyRoute.addChildren({
      AuthenticatedUsersIndexRoute,
    }),
  }),
  LoginRoute,
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/_authenticated",
        "/login"
      ]
    },
    "/_authenticated": {
      "filePath": "_authenticated.tsx",
      "children": [
        "/_authenticated/dashboard",
        "/_authenticated/settings",
        "/_authenticated/users"
      ]
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/_authenticated/dashboard": {
      "filePath": "_authenticated.dashboard.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/settings": {
      "filePath": "_authenticated.settings.lazy.tsx",
      "parent": "/_authenticated",
      "children": [
        "/_authenticated/settings/integrations",
        "/_authenticated/settings/"
      ]
    },
    "/_authenticated/users": {
      "filePath": "_authenticated.users.lazy.tsx",
      "parent": "/_authenticated",
      "children": [
        "/_authenticated/users/"
      ]
    },
    "/_authenticated/settings/integrations": {
      "filePath": "_authenticated.settings.integrations.tsx",
      "parent": "/_authenticated/settings"
    },
    "/_authenticated/settings/": {
      "filePath": "_authenticated.settings.index.tsx",
      "parent": "/_authenticated/settings"
    },
    "/_authenticated/users/": {
      "filePath": "_authenticated.users.index.tsx",
      "parent": "/_authenticated/users"
    }
  }
}
ROUTE_MANIFEST_END */
