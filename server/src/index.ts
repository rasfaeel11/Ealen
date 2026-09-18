import "dotenv/config";
import express from "express";
import cors from "cors";
import combatRouter from "./routes/combat";
import charactersRouter from "./routes/characters";
import mapRouter from "./routes/map";

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = process.env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim());

// O Vite muda de porta sozinho quando a 5173 já está ocupada (5174, 5175...)
// — comum em dev quando sobra processo travado de uma sessão anterior. Em
// vez de fixar uma porta, aceita qualquer localhost/127.0.0.1 em dev.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      // Sem header Origin (curl, apps nativos) ou origem conhecida: libera.
      if (!origin || allowedOrigins?.includes(origin) || (!allowedOrigins && LOCALHOST_ORIGIN.test(origin))) {
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
