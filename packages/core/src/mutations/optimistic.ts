import { generate } from "@rocicorp/rails";
import { createSelectSchema } from "drizzle-valibot";
import { parse } from "valibot";

import { Order } from "../order/order.sql";
import { User } from "../user/user.sql";

const {
  init: createUser,
  get: readUser,
  set: updateUser,
  delete: deleteUser,
} = generate("user", (user) => parse(createSelectSchema(User), user));

const {
  init: createOrder,
  get: readOrder,
  set: updateOrder,
  delete: deleteOrder,
} = generate("order", (order) => parse(createSelectSchema(Order), order));

/**
 * Optimistic CRUD mutations
 */
export const optimistic = {
  // User
  createUser,
  readUser,
  updateUser,
  deleteUser,

  // Order
  createOrder,
  readOrder,
  updateOrder,
  deleteOrder,
};
