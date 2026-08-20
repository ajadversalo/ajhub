import { createClient } from "@libsql/client/web";
import { env } from "cloudflare:workers";

type RuntimeEnv = {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
};

export function getTurso() {
  const runtimeEnv = env as unknown as RuntimeEnv;
  const url = runtimeEnv.TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  const authToken = runtimeEnv.TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.");
  }

  return createClient({ url, authToken });
}
