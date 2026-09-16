import "dotenv/config";
import express from "express";
import cors from "cors";
import combatRouter from "./routes/combat";
import charactersRouter from "./routes/characters";
import mapRouter from "./routes/map";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.use("/api/combat", combatRouter);
app.use("/api/characters", charactersRouter);
app.use("/api/map", mapRouter);

app.listen(PORT, () => {
  console.log(`[ealen-server] rodando em http://localhost:${PORT}`);
});
