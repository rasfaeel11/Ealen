import "dotenv/config";
import express from "express";
import cors from "cors";
import combatRouter from "./routes/combat";
import charactersRouter from "./routes/characters";
import mapRouter from "./routes/map";

const app = express();
const PORT = process.env.PORT ?? 3001;

const DEFAULT_CLIENT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
  : DEFAULT_CLIENT_ORIGINS;

app.use(
  cors({
    origin(origin, callback) {
      // Sem header Origin (curl, apps nativos) ou origem conhecida: libera.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
  }),
);
app.use(express.json());

app.use("/api/combat", combatRouter);
app.use("/api/characters", charactersRouter);
app.use("/api/map", mapRouter);

app.listen(PORT, () => {
  console.log(`[ealen-server] rodando em http://localhost:${PORT}`);
});
