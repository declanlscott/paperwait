import { useState } from "react";
import { userRoles } from "@printworks/core/users/shared";
import { Utils } from "@printworks/core/utils/client";
import { createFileRoute } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Activity,
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";

import {
  EnforceAbac,
  EnforceRouteAbac,
} from "~/app/components/ui/access-control";
import { DeleteUserDialog } from "~/app/components/ui/delete-user-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/app/components/ui/primitives/avatar";
import { Badge } from "~/app/components/ui/primitives/badge";
import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import {
  Menu,
  MenuCheckboxItem,
  MenuHeader,
  MenuItem,
  MenuPopover,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "~/app/components/ui/primitives/menu";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectTrigger,
} from "~/app/components/ui/primitives/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/app/components/ui/primitives/table";
import { Input } from "~/app/components/ui/primitives/text-field";
import { fuzzyFilter } from "~/app/lib/fuzzy";
import { query, useMutator, useQuery } from "~/app/lib/hooks/data";
import { useUser } from "~/app/lib/hooks/user";
import { collectionItem, onSelectionChange } from "~/app/lib/ui";

import type { UserRole } from "@printworks/core/users/shared";
import type { UserWithProfile } from "@printworks/core/users/sql";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { DeepReadonlyObject } from "replicache";

const routeId = "/_authenticated/users/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(tx, context.actor.properties.id, routeId),
    ),
  loader: async ({ context }) => {
    const initialUsers = await context.replicache.query(query.users());

    return { initialUsers };
  },
  component: Component,
});

function Component() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <UsersCard />
      </div>
    </div>
  );
}

const columns = [
  {
    accessorKey: "name",
    enableHiding: false,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onPress={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-4">
        <Avatar className="size-8">
          <AvatarImage
            src={`/api/users/${row.id}/photo`}
            alt={row.getValue("name")}
          />

          <AvatarFallback className="text-foreground bg-muted border-primary border-2">
            {Utils.getUserInitials(row.getValue("name"))}
          </AvatarFallback>
        </Avatar>

        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onPress={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="lowercase">{row.getValue("email")}</span>
    ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onPress={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Role
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => <UserRoleCell user={row.original} />,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <UserActionsMenu user={row.original} />,
  },
] satisfies Array<ColumnDef<DeepReadonlyObject<UserWithProfile>>>;

function UsersCard() {
  const { initialUsers } = Route.useLoaderData();

  const data = useQuery(query.users(), { defaultData: initialUsers });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(() => "");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "fuzzy",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>

        <div className="flex gap-2">
          <Input
            placeholder="Filter users..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-44"
          />

          <MenuTrigger>
            <Button variant="outline">
              Columns
              <ChevronDown className="ml-2 size-4" />
            </Button>

            <MenuPopover placement="bottom" className="w-28">
              <Menu
                selectionMode="multiple"
                defaultSelectedKeys={
                  new Set(
                    table.getVisibleFlatColumns().map((column) => column.id),
                  )
                }
              >
                <MenuSection>
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <MenuCheckboxItem
                        key={column.id}
                        id={column.id}
                        className="capitalize"
                        onAction={() => column.toggleVisibility()}
                      >
                        {column.id}
                      </MenuCheckboxItem>
                    ))}
                </MenuSection>
              </Menu>
            </MenuPopover>
          </MenuTrigger>
        </div>
      </CardHeader>

      <CardContent>
        {table.getVisibleFlatColumns().length && (
          <div className="bg-background rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={
                        row.original.deletedAt ? "opacity-50" : "opacity-100"
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-end">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onPress={() => table.previousPage()}
            isDisabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onPress={() => table.nextPage()}
            isDisabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface UserRoleCellProps {
  user: DeepReadonlyObject<UserWithProfile>;
}
function UserRoleCell(props: UserRoleCellProps) {
  const role = props.user.profile.role;

  const { updateUserProfileRole } = useMutator();

  const isSelf = useUser().id === props.user.id;

  const mutate = async (role: UserRole) =>
    await updateUserProfileRole({
      id: props.user.id,
      role,
      updatedAt: new Date(),
    });

  return (
    <>
      {isSelf ? (
        <Badge variant={role}>{role}</Badge>
      ) : (
        <EnforceAbac
          resource="users"
          action="update"
          input={[]}
          unauthorized={<Badge variant={role}>{role}</Badge>}
        >
          <Select
            aria-label="role"
            selectedKey={role}
            onSelectionChange={onSelectionChange(userRoles, mutate)}
          >
            <SelectTrigger className="w-fit gap-2">
              <Badge variant={role}>{role}</Badge>
            </SelectTrigger>

            <SelectPopover className="w-fit">
              <SelectListBox items={userRoles.map(collectionItem)}>
                {(item) => (
                  <SelectItem id={item.name} textValue={item.name}>
                    <Badge variant={item.name as UserRole}>{item.name}</Badge>
                  </SelectItem>
                )}
              </SelectListBox>
            </SelectPopover>
          </Select>
        </EnforceAbac>
      )}
    </>
  );
}

interface UserActionsMenuProps {
  user: DeepReadonlyObject<UserWithProfile>;
}
function UserActionsMenu(props: UserActionsMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(() => false);

  const { restoreUserProfile } = useMutator();

  return (
    <MenuTrigger>
      <Button size="icon" variant="ghost" aria-label="Open user actions menu">
        <MoreHorizontal className="size-4" />
      </Button>

      <MenuPopover>
        <Menu className="w-32">
          <MenuSection>
            <MenuHeader>Actions</MenuHeader>

            <EnforceRouteAbac
              routeId="/_authenticated/users/$userId"
              input={[props.user.id]}
              unauthorized={
                <MenuItem isDisabled>
                  <Activity className="mr-2 size-4" />
                  Activity
                </MenuItem>
              }
            >
              <MenuItem
                href={{
                  to: "/users/$userId",
                  params: { userId: props.user.id },
                }}
              >
                <Activity className="mr-2 size-4" />
                Activity
              </MenuItem>
            </EnforceRouteAbac>
          </MenuSection>

          {props.user.deletedAt ? (
            <EnforceAbac
              resource="users"
              action="update"
              input={[]}
              unauthorized={
                <>
                  <MenuSeparator />

                  <MenuSection>
                    <MenuItem className="text-green-600" isDisabled>
                      <UserRoundCheck className="mr-2 size-4" />
                      Restore
                    </MenuItem>
                  </MenuSection>
                </>
              }
            >
              <MenuSeparator />

              <MenuSection>
                <MenuItem
                  onAction={() => restoreUserProfile({ id: props.user.id })}
                  className="text-green-600"
                >
                  <UserRoundCheck className="mr-2 size-4" />
                  Restore
                </MenuItem>
              </MenuSection>
            </EnforceAbac>
          ) : (
            <EnforceAbac
              resource="users"
              action="delete"
              input={[props.user.id]}
              unauthorized={
                <>
                  <MenuSeparator />

                  <MenuSection>
                    <MenuItem className="text-destructive" isDisabled>
                      <UserRoundX className="mr-2 size-4" />
                      Delete
                    </MenuItem>
                  </MenuSection>
                </>
              }
            >
              <MenuSeparator />

              <MenuSection>
                <MenuItem
                  onAction={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <UserRoundX className="mr-2 size-4" />
                  Delete
                </MenuItem>
              </MenuSection>
            </EnforceAbac>
          )}
        </Menu>
      </MenuPopover>

      <EnforceAbac resource="users" action="delete" input={[props.user.id]}>
        <DeleteUserDialog
          userId={props.user.id}
          dialogOverlayProps={{
            isOpen: isDeleteDialogOpen,
            onOpenChange: setIsDeleteDialogOpen,
          }}
        />
      </EnforceAbac>
    </MenuTrigger>
  );
}
