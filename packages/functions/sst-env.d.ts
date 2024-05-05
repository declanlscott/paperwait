/* tslint:disable *//* eslint-disable */import "sst"
declare module "sst" {
  export interface Resource {
    DatabaseUrl: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}