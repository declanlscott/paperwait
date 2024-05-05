/* tslint:disable *//* eslint-disable */import "sst"
declare module "sst" {
  export interface Resource {
    ClientIsDev: {
      type: "sst.sst.Secret"
      value: string
    }
    ClientReplicacheLicenseKey: {
      type: "sst.sst.Secret"
      value: string
    }
    DatabaseUrl: {
      type: "sst.sst.Secret"
      value: string
    }
    EntraIdApplication: {
      clientId: string
      type: "azuread.index/application.Application"
    }
    EntraIdClientSecret: {
      type: "azuread.index/applicationPassword.ApplicationPassword"
      value: string
    }
    XmlRpcApi: {
      name: string
      type: "sst.aws.Function"
    }
  }
}
export {}