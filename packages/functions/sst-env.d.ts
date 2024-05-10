/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    AdjustSharedAccountAccountBalanceQueue: {
      type: "sst.aws.Queue"
      url: string
    }
    PostgresDatabase: {
      type: "sst.sst.Secret"
      value: string
    }
    PostgresHost: {
      type: "sst.sst.Secret"
      value: string
    }
    PostgresPassword: {
      type: "sst.sst.Secret"
      value: string
    }
    PostgresPort: {
      type: "sst.sst.Secret"
      value: string
    }
    PostgresSsl: {
      type: "sst.sst.Secret"
      value: string
    }
    PostgresUser: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}