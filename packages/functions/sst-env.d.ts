/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    AdjustSharedAccountAccountBalanceQueue: {
      type: "sst.aws.Queue"
      url: string
    }
    DatabaseUrl: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}