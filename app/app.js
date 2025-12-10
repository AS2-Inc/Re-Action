import { readFileSync } from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";
import tasks from "./task.js";
import users from "./users.js";

const app = express();

// Determine __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

// Load OpenAPI (Swagger) document
const swaggerDocument = yaml.load(
  readFileSync(Path.join(__dirname, "..", "oas3.yml"), "utf8"),
);

// Middleware Configuration
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Allow Cross-Origin requests from Vue Frontend

// Serve Static Frontend (If deployed together)
app.use("/", express.static(process.env.FRONTEND || "static"));

// Serve API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- Route Mounting ---

// Public Routes
app.use("/api/v1/users", users); // Public routes (Login, Registration)

// Protected Routes (Tasks) - Note: GET could be public, but logic is handled inside
app.use("/api/v1/tasks", tasks);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export default app;
