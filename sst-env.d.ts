/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "AssetsBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "Auth": {
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
    "Client": {
      "domain": string
      "isDev": string
      "realtimeUrl": string
      "replicacheLicenseKey": string
      "type": "sst.sst.Linkable"
    }
    "Db": {
      "postgres": {
        "url": string
      }
      "type": "sst.sst.Linkable"
    }
    "DocumentsBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "GoogleClientId": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "GoogleClientSecret": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "InfraBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "Meta": {
      "app": {
        "name": string
        "stage": string
      }
      "domain": string
      "isDev": string
      "type": "sst.sst.Linkable"
    }
    "PartyKitUrl": {
      "type": "sst.sst.Secret"
      "value": string
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
    "ReverseProxy": {
      "type": "sst.cloudflare.Worker"
      "url": string
    }
    "Storage": {
      "assets": {
        "bucket": string
        "distribution": {
          "domain": string
          "privateKey": string
          "publicKey": {
            "id": string
          }
        }
      }
      "documents": {
        "bucket": string
      }
      "infra": {
        "bucket": string
      }
      "type": "sst.sst.Linkable"
    }
    "Web": {
      "type": "sst.aws.Astro"
      "url": string
    }
  }
}
export {}
