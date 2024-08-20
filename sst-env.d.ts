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
        "credentials": {
          "database": string
          "host": string
          "password": string
          "port": string
          "ssl": string
          "user": string
        }
      }
      "redis": {
        "endpoint": string
        "restToken": string
      }
      "type": "sst.sst.Linkable"
    }
    "DocumentsBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "Domain": {
      "type": "sst.sst.Secret"
      "value": string
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
    "IsDev": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Paperwait": {
      "type": "sst.aws.Astro"
      "url": string
    }
    "PartyKitUrl": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PostgresDatabase": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PostgresHost": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PostgresPassword": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PostgresPort": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PostgresSsl": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PostgresUser": {
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
  }
}
export {}
