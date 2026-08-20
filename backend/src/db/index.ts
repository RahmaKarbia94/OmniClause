import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Deliberately a warning, not a thrown error: the server must still
  // start even if the database isn't reachable yet (see server.ts /
  // health route, which surface the failure per-request instead).
  console.warn(
    "[db] DATABASE_URL is not set. Database-dependent routes will fail until it is configured."
  );
}

export const pool = new Pool({ connectionString });

// node-postgres emits 'error' on an idle client when its underlying
// connection drops (DB restart, network blip, etc). Without this
// listener, that event is unhandled and crashes the whole process --
// this is what keeps the server alive through a lost DB connection.
pool.on("error", (error) => {
  console.error("[db] Unexpected error on idle client:", error.message);
});
