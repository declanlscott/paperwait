// import { vValidator } from "@hono/valibot-validator";
// import { useAuthenticated } from "@printworks/core/auth/context";
// import { mutationRbac } from "@printworks/core/auth/rbac";
// import { buildSsmParameterPath, putSsmParameter } from "@printworks/core/aws";
// import { PAPERCUT_PARAMETER_NAME } from "@printworks/core/utils/constants";
// import { serializable } from "@printworks/core/orm";
// import { healthCheck, syncPapercutAccounts } from "@printworks/core/papercut";
// import { formatChannel } from "@printworks/core/realtime";
// import { poke } from "@printworks/core/replicache";
import { Hono } from "hono";

// import { authorization } from "~/api/middleware";

export default new Hono();
// .put(
//   "/accounts",
//   authorization(mutationRbac.syncPapercutAccounts),
//   async (c) => {
//     const { tenant } = useAuthenticated();

//     await serializable(() => syncPapercutAccounts());

//     await poke([formatChannel("tenant", tenant.id)]);

//     return c.body(null, 204);
//   },
// )
// .put(
//   "/credentials",
//   authorization(["administrator"]),
//   vValidator("json", PapercutParameter),
//   async (c) => {
//     const { tenant } = useAuthenticated();

//     await putSsmParameter({
//       Name: buildSsmParameterPath(tenant.id, PAPERCUT_PARAMETER_NAME),
//       Value: JSON.stringify(c.req.valid("json")),
//       Type: "SecureString",
//       Overwrite: true,
//     });

//     return c.body(null, 204);
//   },
// )
// .post("/health-check", authorization(["administrator"]), async (c) => {
//   const { tenant } = useAuthenticated();

//   await healthCheck({
//     tenantId: tenant.id,
//     input: { authorized: true },
//   });

//   return c.body(null, 204);
// });
