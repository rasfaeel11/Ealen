import express from "express";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

// Rotas serão adicionadas nos próximos passos.

app.listen(PORT, () => {
  console.log(`[ealen-server] rodando em http://localhost:${PORT}`);
});
