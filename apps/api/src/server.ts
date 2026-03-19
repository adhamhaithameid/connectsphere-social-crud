import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./lib/http.js";
import { feedRouter } from "./routes/feed.js";
import { interactionsRouter } from "./routes/interactions.js";
import { postsRouter } from "./routes/posts.js";
import { profilesRouter } from "./routes/profiles.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/feed", feedRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/posts", postsRouter);
app.use("/api/interactions", interactionsRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
