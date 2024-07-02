import { useState } from "react";
import { mutatorsRoles } from "@paperwait/core/schemas";
import { getUserInitials } from "@paperwait/core/utils";
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
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";

import { Authorize } from "~/app/components/ui/authorize";
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
import { Input } from "~/app/components/ui/primitives/input";
import {
  Menu,
  MenuCheckboxItem,
  MenuHeader,
  MenuItem,
  MenuPopover,
  MenuSection,
  MenuTrigger,
} from "~/app/components/ui/primitives/menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/app/components/ui/primitives/table";
import { fuzzyFilter } from "~/app/lib/fuzzy";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";

import type { User } from "@paperwait/core/user";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

export const Route = createFileRoute("/_authenticated/users/")({
  loader: async ({ context }) => {
    const users = await context.replicache.query(queryFactory.users);

    return { users };
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

const columns: Array<ColumnDef<User>> = [
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
            src={`/api/user/${row.id}/photo`}
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
    cell: ({ row }) => {
      const role = row.getValue<User["role"]>("role");

      return <Badge variant={role}>{role}</Badge>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <UserActionsMenu user={row.original} />,
  },
];

function UsersCard() {
  const { users: defaultData } = Route.useLoaderData();

  const data = useQuery(queryFactory.users, { default: defaultData });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

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
    onRowSelectionChange: setRowSelection,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      rowSelection,
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
        {table.getVisibleFlatColumns().length > 0 && (
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
                      className={row.original.deletedAt ? "opacity-50" : ""}
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

interface UserActionsMenuProps {
  user: User;
}
function UserActionsMenu(props: UserActionsMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { restoreUser } = useMutator();

  async function mutate() {
    await restoreUser({ id: props.user.id });
  }

  return (
    <MenuTrigger>
      <Button size="icon" variant="ghost" aria-label="Open user actions menu">
        <MoreHorizontal className="size-4" />
      </Button>

      <MenuPopover>
        <Menu className="w-32">
          <MenuSection>
            <MenuHeader>Actions</MenuHeader>

            {props.user.deletedAt ? (
              <Authorize roles={mutatorsRoles.restoreUser}>
                <MenuItem onAction={mutate} className="text-green-600">
                  <UserRoundCheck className="mr-2 size-4" />
                  Restore
                </MenuItem>
              </Authorize>
            ) : (
              <Authorize roles={mutatorsRoles.deleteUser}>
                <MenuItem
                  onAction={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <UserRoundX className="mr-2 size-4" />
                  Delete
                </MenuItem>
              </Authorize>
            )}
          </MenuSection>
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
