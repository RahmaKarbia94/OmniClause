import express, { Application } from "express";

const app: Application = express();
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Top-level handler for startup failures (e.g. port already in use).
// This is intentionally minimal — no routes or business logic belong
// in this sprint's scaffold.
server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
