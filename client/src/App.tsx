import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import CharacterCreatePage from "./pages/CharacterCreatePage";
import MapPage from "./pages/MapPage";
import CombatPage from "./pages/CombatPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { GameSessionProvider } from "./hooks/useGameSession";

function App() {
  return (
    <GameSessionProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/character/new"
          element={
            <ProtectedRoute>
              <CharacterCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/combat/:nodeId"
          element={
            <ProtectedRoute>
              <CombatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </GameSessionProvider>
  );
}

export default App;
