/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
import "sst"
export {}
import "sst"
declare module "sst" {
  export interface Resource {
    "AppData": {
      "domain": string
      "isDev": boolean
      "name": string
      "stage": string
      "type": "sst.sst.Linkable"
    }
    "AwsOrgRootEmail": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Client": {
      "domain": string
      "isDev": boolean
      "realtimeUrl": string
      "replicacheLicenseKey": string
      "type": "sst.sst.Linkable"
    }
    "Cloud": {
      "aws": {
        "identity": {
          "accountId": string
          "arn": string
          "id": string
          "userId": string
        }
        "manageTenantInfraRoleArn": string
        "orgRootEmail": string
        "region": string
        "tenantsOrganizationalUnitId": string
      }
      "cloudflare": {
        "apiToken": string
      }
      "type": "sst.sst.Linkable"
    }
    "Db": {
      "postgres": {
        "url": string
      }
      "type": "sst.sst.Linkable"
    }
    "GoogleClientId": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "GoogleClientSecret": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "ManageTenantInfraRoleArn": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Oauth2": {
      "entraId": {
        "clientId": string
        "clientSecret": string
      }
      "google": {
        "clientId": string
        "clientSecret": string
      }
      "type": "sst.sst.Linkable"
    }
    "PartyKitUrl": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PulumiBackendBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "Realtime": {
      "apiKey": string
      "type": "sst.sst.Linkable"
      "url": string
    }
    "ReplicacheLicenseKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Storage": {
      "pulumiBackend": {
        "bucket": string
      }
      "tenantInfraQueue": string
      "type": "sst.sst.Linkable"
    }
    "TenantInfraDlq": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "TenantInfraQueue": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "TenantsOrganizationalUnitId": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Web": {
      "type": "sst.aws.Astro"
      "url": string
    }
    "WebOutputs": {
      "server": {
        "roleArn": string
      }
      "type": "sst.sst.Linkable"
    }
    "WebPassword": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "WebUsername": {
      "type": "sst.sst.Secret"
      "value": string
    }
  }
}
// cloudflare 
import * as cloudflare from "@cloudflare/workers-types";
declare module "sst" {
  export interface Resource {
    "ReverseProxy": cloudflare.Service
  }
}
