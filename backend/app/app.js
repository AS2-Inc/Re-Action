import { readFileSync } from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import yaml from "js-yaml";
import swagger_ui from "swagger-ui-express";
import error_handler from "./middleware/error_handler.js";
import neighborhood from "./routers/neighborhood.js";
import tasks from "./routers/task.js";
import users from "./routers/users.js";
import rewards from "./routers/rewards.js";
import operators from "./routers/operators.js";

const app = express();

// Determine __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

// Load OpenAPI (Swagger) document
const swagger_document = yaml.load(
  readFileSync(Path.join(__dirname, "..", "oas3.yml"), "utf8"),
);

// Middleware Configuration
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Allow Cross-Origin requests from Vue Frontend

// Serve Static Frontend (If deployed together)
const FRONTEND =
  process.env.FRONTEND || Path.join(__dirname, "..", "..", "frontend", "dist");
app.use("/", express.static(FRONTEND));
console.log(
  "Vue FRONTEND from",
  FRONTEND,
  `at http://localhost:${process.env.PORT}` || `${8080}/`,
);

// Serve API Documentation
app.use("/api-docs", swagger_ui.serve, swagger_ui.setup(swagger_document));

// --- Route Mounting ---
app.use("/api/v1/users", users);
app.use("/api/v1/neighborhood", neighborhood);
app.use("/api/v1/tasks", tasks);
app.use("/api/v1/rewards", rewards);
app.use("/api/v1/operators", operators);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint Not Found" });
});

app.use(error_handler);

export default app;
