/* tslint:disable */
/* eslint-disable */
import "sst"
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
    EntraIdApplication: {
      clientId: string
      type: "azuread.index/application.Application"
    }
    EntraIdClientSecret: {
      type: "azuread.index/applicationPassword.ApplicationPassword"
      value: string
    }
    GoogleClientId: {
      type: "sst.sst.Secret"
      value: string
    }
    GoogleClientSecret: {
      type: "sst.sst.Secret"
      value: string
    }
    PapercutApiGateway: {
      type: "sst.aws.ApiGatewayV2"
      url: string
    }
    PartyKitApiKey: {
      type: "sst.sst.Secret"
      value: string
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