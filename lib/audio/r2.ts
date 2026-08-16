import { AwsClient } from "aws4fetch";

const DEFAULT_BUCKET = "slova";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

type R2Environment = {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_PUBLIC_URL?: string;
  R2_BUCKET?: string;
  [name: string]: string | undefined;
};

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  bucket: string;
};

type R2Client = {
  fetch: typeof globalThis.fetch;
};

type R2ClientFactory = (config: R2Config) => R2Client;

export function readR2Config(
  environment: R2Environment = process.env,
): R2Config {
  const accountId = environment.R2_ACCOUNT_ID;
  const accessKeyId = environment.R2_ACCESS_KEY_ID;
  const secretAccessKey = environment.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set.",
    );
  }

  const publicBaseUrl = environment.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (!publicBaseUrl) {
    throw new Error(
      "R2_PUBLIC_URL is not set — enable public access on the bucket and use its URL.",
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    bucket: environment.R2_BUCKET || DEFAULT_BUCKET,
  };
}

function defaultClientFactory(config: R2Config): R2Client {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

export function createR2Storage(
  environment: R2Environment = process.env,
  clientFactory: R2ClientFactory = defaultClientFactory,
) {
  const config = readR2Config(environment);
  const client = clientFactory(config);

  return {
    publicUrl(path: string): string {
      return `${config.publicBaseUrl}/${path}`;
    },

    async putAudio(path: string, audio: Uint8Array): Promise<string> {
      const response = await client.fetch(
        `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${path}`,
        {
          method: "PUT",
          body: new Uint8Array(audio),
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": IMMUTABLE_CACHE_CONTROL,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `upload ${response.status} ${(await response.text()).slice(0, 120)}`,
        );
      }

      return `${config.publicBaseUrl}/${path}`;
    },
  };
}
