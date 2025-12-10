import dotenv from "dotenv";
import { mongoose } from "mongoose";
import app from "./app/app.js";

dotenv.config();

const port = process.env.PORT || 8080;

app.locals.db = mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log("Connected to Database");

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to database", err);
  });
