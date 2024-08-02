import { useCallback, useState } from "react";
import { mutatorRbac } from "@paperwait/core/schemas";
import { UserRole } from "@paperwait/core/user";
import { enforceRbac, getUserInitials } from "@paperwait/core/utils";
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

import { DeleteUserDialog } from "~/app/components/ui/delete-user-dialog";
import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
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
import { Input } from "~/app/components/ui/primitives/input";
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
import { fuzzyFilter } from "~/app/lib/fuzzy";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { useManager } from "~/app/lib/hooks/manager";
import { collectionItem, onSelectionChange } from "~/app/lib/ui";

import type { User } from "@paperwait/core/user";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

export const Route = createFileRoute("/_authenticated/users/")({
  loader: async ({ context }) => {
    const initialUsers = await context.replicache.query(queryFactory.users());

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
            {getUserInitials(row.getValue("name"))}
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
] satisfies Array<ColumnDef<User>>;

function UsersCard() {
  const { initialUsers } = Route.useLoaderData();

  const data = useQuery(queryFactory.users(), { defaultData: initialUsers });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
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

  const { user } = useAuthenticated();

  const shouldShowColumn = useCallback(
    (columnId: string) => {
      if (columnId === "actions")
        return enforceRbac(user, ["administrator", "operator", "manager"]);

      return true;
    },
    [user],
  );

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
                    {headerGroup.headers.map((header) =>
                      shouldShowColumn(header.id) ? (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ) : null,
                    )}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.original.deletedAt ? "opacity-50" : ""}
                    >
                      {row
                        .getVisibleCells()
                        .map((cell) =>
                          shouldShowColumn(cell.column.id) ? (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ) : null,
                        )}
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
  user: User;
}
function UserRoleCell(props: UserRoleCellProps) {
  const role = props.user.role;

  const { updateUserRole } = useMutator();

  const { user } = useAuthenticated();
  const isSelf = user.id === props.user.id;

  const mutate = async (role: User["role"]) =>
    await updateUserRole({
      id: props.user.id,
      role,
      updatedAt: new Date().toISOString(),
    });

  return (
    <>
      <EnforceRbac roles={["administrator"]}>
        {isSelf ? (
          <Badge variant={role}>{role}</Badge>
        ) : (
          <Select
            aria-label="role"
            selectedKey={role}
            onSelectionChange={onSelectionChange(UserRole.enumValues, mutate)}
          >
            <SelectTrigger className="w-fit gap-2">
              <Badge variant={role}>{role}</Badge>
            </SelectTrigger>

            <SelectPopover className="w-fit">
              <SelectListBox items={UserRole.enumValues.map(collectionItem)}>
                {(item) => (
                  <SelectItem id={item.name} textValue={item.name}>
                    <Badge variant={item.name as UserRole}>{item.name}</Badge>
                  </SelectItem>
                )}
              </SelectListBox>
            </SelectPopover>
          </Select>
        )}
      </EnforceRbac>

      <EnforceRbac roles={["operator", "manager", "customer"]}>
        <Badge variant={role}>{role}</Badge>
      </EnforceRbac>
    </>
  );
}

interface UserActionsMenuProps {
  user: User;
}
function UserActionsMenu(props: UserActionsMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { restoreUser } = useMutator();

  return (
    <MenuTrigger>
      <Button size="icon" variant="ghost" aria-label="Open user actions menu">
        <MoreHorizontal className="size-4" />
      </Button>

      <MenuPopover>
        <Menu className="w-32">
          <MenuSection>
            <MenuHeader>Actions</MenuHeader>

            <EnforceRbac roles={["administrator", "operator"]}>
              <MenuItem
                href={{
                  to: "/users/$userId",
                  params: { userId: props.user.id },
                }}
              >
                <Activity className="mr-2 size-4" />
                Activity
              </MenuItem>
            </EnforceRbac>

            <EnforceRbac roles={["manager"]}>
              <ManagerUserActionItems user={props.user} />
            </EnforceRbac>
          </MenuSection>

          {props.user.deletedAt ? (
            <EnforceRbac roles={mutatorRbac.restoreUser}>
              <MenuSeparator />

              <MenuSection>
                <MenuItem
                  onAction={() => restoreUser({ id: props.user.id })}
                  className="text-green-600"
                >
                  <UserRoundCheck className="mr-2 size-4" />
                  Restore
                </MenuItem>
              </MenuSection>
            </EnforceRbac>
          ) : (
            <EnforceRbac roles={mutatorRbac.deleteUser}>
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
            </EnforceRbac>
          )}
        </Menu>
      </MenuPopover>

      <DeleteUserDialog
        userId={props.user.id}
        dialogOverlayProps={{
          isOpen: isDeleteDialogOpen,
          onOpenChange: setIsDeleteDialogOpen,
        }}
      />
    </MenuTrigger>
  );
}

interface ManagerUserActionItemsProps {
  user: User;
}
function ManagerUserActionItems(props: ManagerUserActionItemsProps) {
  const { customerIds } = useManager();

  if (!customerIds.includes(props.user.id)) return null;

  return (
    <>
      <UserActivityItem user={props.user} />
    </>
  );
}

interface UserActivityItemProps {
  user: User;
}
function UserActivityItem(props: UserActivityItemProps) {
  return (
    <MenuItem
      href={{ to: "/users/$userId", params: { userId: props.user.id } }}
    >
      <Activity className="mr-2 size-4" />
      Activity
    </MenuItem>
  );
}
