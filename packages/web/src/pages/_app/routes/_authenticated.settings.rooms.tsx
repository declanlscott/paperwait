import { useMemo, useState } from "react";
import { mutationRbac } from "@paperwait/core/auth/rbac";
import { roomStatuses } from "@paperwait/core/rooms/shared";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
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
  Delete,
  HousePlus,
  MoreHorizontal,
  Pencil,
  View,
} from "lucide-react";

import { DeleteRoomDialog } from "~/app/components/ui/delete-room-dialog";
import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
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
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { collectionItem, onSelectionChange } from "~/app/lib/ui";

import type { Product } from "@paperwait/core/products/sql";
import type { Room } from "@paperwait/core/rooms/sql";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { DeepReadonlyObject } from "replicache";

export const Route = createFileRoute("/_authenticated/settings/rooms")({
  beforeLoad: ({ context }) =>
    context.authStore.actions.authorizeRoute(context.user, [
      "administrator",
      "operator",
    ]),
  loader: async ({ context }) => {
    const initialProducts = await context.replicache.query(
      queryFactory.products(),
    );

    return { initialProducts };
  },
  component: Component,
});

const authenticatedRouteApi = getRouteApi("/_authenticated");

function Component() {
  return <RoomsCard />;
}

function RoomsCard() {
  const { initialRooms } = authenticatedRouteApi.useLoaderData();
  const { initialProducts } = Route.useLoaderData();

  const rooms = useQuery(queryFactory.rooms(), { defaultData: initialRooms });
  const products = useQuery(queryFactory.products(), {
    defaultData: initialProducts,
  });

  const [sorting, setSorting] = useState<SortingState>(() => []);
  const [globalFilter, setGlobalFilter] = useState(() => "");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => ({}),
  );

  const columns = useMemo(
    () =>
      [
        {
          accessorKey: "name",
          header: ({ column }) => (
            <Button
              variant="ghost"
              onPress={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Name
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="font-medium">{row.getValue("name")}</span>
          ),
        },
        {
          id: "products",
          header: "Products",
          accessorFn: (room) => {
            const published = products.filter(
              (product) =>
                product.roomId === room.id && product.status === "published",
            );

            const drafts = products.filter(
              (product) =>
                product.roomId === room.id && product.status === "draft",
            );

            return { published, drafts };
          },
          cell: (data) => {
            const { published, drafts } = data.getValue<{
              published: Array<Product>;
              drafts: Array<Product>;
            }>();

            return (
              <div className="flex gap-2">
                <Badge className="whitespace-nowrap">
                  {published.length} Published
                </Badge>

                <Badge className="whitespace-nowrap" variant="outline">
                  {drafts.length} Draft
                </Badge>
              </div>
            );
          },
        },
        {
          accessorKey: "status",
          header: ({ column }) => (
            <Button
              variant="ghost"
              onPress={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Status
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          ),
          cell: ({ row }) => <RoomStatusSelect room={row.original} />,
        },
        {
          id: "actions",
          cell: ({ row }) => <RoomActionsMenu room={row.original} />,
        },
      ] satisfies Array<ColumnDef<DeepReadonlyObject<Room>>>,
    [products],
  );

  const table = useReactTable({
    data: rooms,
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
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Rooms</CardTitle>
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

interface RoomStatusSelectProps {
  room: DeepReadonlyObject<Room>;
}
function RoomStatusSelect(props: RoomStatusSelectProps) {
  const status = props.room.status;

  const { updateRoom } = useMutator();

  const mutate = async (status: Room["status"]) =>
    await updateRoom({
      id: props.room.id,
      status,
      updatedAt: new Date().toISOString(),
    });

  return (
    <Select
      aria-label="status"
      selectedKey={status}
      onSelectionChange={onSelectionChange(roomStatuses, mutate)}
    >
      <SelectTrigger
        className="w-fit gap-2"
        isDisabled={!!props.room.deletedAt}
      >
        <Badge variant={status === "published" ? "default" : "outline"}>
          {status}
        </Badge>
      </SelectTrigger>

      <SelectPopover className="w-fit">
        <SelectListBox items={roomStatuses.map(collectionItem)}>
          {(item) => (
            <SelectItem id={item.name} textValue={item.name}>
              <Badge
                variant={item.name === "published" ? "default" : "outline"}
              >
                {item.name}
              </Badge>
            </SelectItem>
          )}
        </SelectListBox>
      </SelectPopover>
    </Select>
  );
}

interface RoomActionsMenuProps {
  room: DeepReadonlyObject<Room>;
}
function RoomActionsMenu(props: RoomActionsMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(() => false);

  const { restoreRoom } = useMutator();

  return (
    <MenuTrigger>
      <Button size="icon" variant="ghost" aria-label="Open room actions menu">
        <MoreHorizontal className="size-4" />
      </Button>

      <MenuPopover>
        <Menu className="w-32">
          <MenuSection>
            <MenuHeader>Actions</MenuHeader>

            <MenuItem
              href={{
                to: "/settings/rooms/$roomId",
                params: { roomId: props.room.id },
              }}
            >
              {props.room.deletedAt ? (
                <>
                  <View className="mr-2 size-4" />
                  View
                </>
              ) : (
                <>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </>
              )}
            </MenuItem>

            {props.room.deletedAt ? (
              <EnforceRbac roles={mutationRbac.restoreRoom}>
                <MenuSeparator />

                <MenuSection>
                  <MenuItem
                    onAction={() => restoreRoom({ id: props.room.id })}
                    className="text-green-600"
                  >
                    <HousePlus className="mr-2 size-4" />
                    Restore
                  </MenuItem>
                </MenuSection>
              </EnforceRbac>
            ) : (
              <EnforceRbac roles={mutationRbac.deleteRoom}>
                <MenuSeparator />

                <MenuSection>
                  <MenuItem
                    onAction={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Delete className="mr-2 size-4" />
                    Delete
                  </MenuItem>
                </MenuSection>
              </EnforceRbac>
            )}
          </MenuSection>
        </Menu>
      </MenuPopover>

      <DeleteRoomDialog
        roomId={props.room.id}
        dialogOverlayProps={{
          isOpen: isDeleteDialogOpen,
          onOpenChange: setIsDeleteDialogOpen,
        }}
      />
    </MenuTrigger>
  );
}
