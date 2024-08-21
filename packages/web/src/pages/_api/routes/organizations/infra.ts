// import * as aws from "@pulumi/aws";
// import * as automation from "@pulumi/pulumi/automation";
// import { Hono } from "hono";

// export default new Hono().put("/", async (c) => {
//   const provisionTenantInfra = async () => {
//     const lambdaAssumeRole = await aws.iam.getPolicyDocument({
//       statements: [
//         {
//           effect: "Allow",
//           principals: [
//             {
//               type: "Service",
//               identifiers: ["lambda.amazonaws.com"],
//             },
//           ],
//           actions: ["sts:AssumeRole"],
//         },
//       ],
//     });

//     const lambdaIamRole = new aws.iam.Role("LambdaIamRole", {
//       name: "lambda-iam-role",
//       assumeRolePolicy: lambdaAssumeRole.json,
//     });

//     const secureXmlRpcForwarder = new aws.lambda.Function(
//       "SecureXmlRpcForwarder",
//       {
//         name: "secure-xml-rpc-forwarder",
//         role: lambdaIamRole.arn,
//         runtime: aws.lambda.Runtime.NodeJS18dX,
//       },
//     );
//   };
// });
