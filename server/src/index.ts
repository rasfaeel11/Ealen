import express from "express";
import combatRouter from "./routes/combat";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.use("/api/combat", combatRouter);

app.listen(PORT, () => {
  console.log(`[ealen-server] rodando em http://localhost:${PORT}`);
});
