import "dotenv/config";
import express from "express";
import combatRouter from "./routes/combat";
import charactersRouter from "./routes/characters";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.use("/api/combat", combatRouter);
app.use("/api/characters", charactersRouter);

app.listen(PORT, () => {
  console.log(`[ealen-server] rodando em http://localhost:${PORT}`);
});
