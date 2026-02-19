import { readFileSync } from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import yaml from "js-yaml";
import swagger_ui from "swagger-ui-express";
import error_handler from "./middleware/error_handler.js";
import api_routes from "./routers/index.js";

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
app.use(
  cors({
    origin: [
      process.env.BACKEND_BASE_URL,
      process.env.FRONTEND_BASE_URL,
    ].filter(Boolean),
  }),
); // Allow Cross-Origin requests from Vue Frontend

// Serve Static Frontend (If deployed together)
const FRONTEND =
  process.env.FRONTEND || Path.join(__dirname, "..", "..", "frontend", "dist");

app.use("/", express.static(FRONTEND));
app.use("/uploads", express.static(Path.join(__dirname, "..", "uploads")));

console.log(
  "Vue FRONTEND from",
  FRONTEND,
  `at http://localhost:${process.env.PORT}` || `${8080}/`,
);

// Serve API Documentation
app.use("/api-docs", swagger_ui.serve, swagger_ui.setup(swagger_document));

// --- Route Mounting ---
app.use("/api/v1", api_routes);

// SPA Fallback: serve index.html for any non-API route so Vue Router
// can handle client-side routes like /login, /dashboard, etc.
app.get("*path", (req, res, next) => {
  // Don't intercept API or api-docs requests
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(Path.join(FRONTEND, "index.html"));
});

// 404 Handler (only reached by unmatched API routes)
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint Not Found" });
});

app.use(error_handler);

export default app;
