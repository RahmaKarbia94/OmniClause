import "dotenv/config";
import express, { Application } from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);

// Top-level handler for startup failures (e.g. port already in use).
// This is intentionally minimal -- no routes or business logic belong
// in this sprint's scaffold.
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
