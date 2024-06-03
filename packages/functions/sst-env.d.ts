/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    AdjustSharedAccountAccountBalanceDeadLetterQueue: {
      type: "sst.aws.Queue"
      url: string
    }
    AdjustSharedAccountAccountBalanceQueue: {
      type: "sst.aws.Queue"
      url: string
    }
    ClientDomain: {
      type: "sst.sst.Secret"
      value: string
    }
    ClientIsDev: {
      type: "sst.sst.Secret"
      value: string
    }
    ClientPartyKitUrl: {
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
    MockPapercutApi: {
      type: "sst.cloudflare.Worker"
      url: string
    }
    PapercutApiGateway: {
      type: "sst.aws.ApiGatewayV2"
      url: string
    }
    Paperwait: {
      type: "sst.aws.Astro"
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