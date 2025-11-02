import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import CreateRecipe from "@/pages/CreateRecipe";
import RecipeDetail from "@/pages/RecipeDetail";

function RouteContainer({ children }: { children: React.ReactNode }) {
  // Subtle page transition
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/create"
          element={
            <RouteContainer>
              <CreateRecipe />
            </RouteContainer>
          }
        />
        <Route
          path="/recipe/:id"
          element={
            <RouteContainer>
              <RecipeDetail />
            </RouteContainer>
          }
        />
        <Route
          path="/login"
          element={
            <RouteContainer>
              <Login />
            </RouteContainer>
          }
        />
        <Route
          path="/"
          element={
            <RouteContainer>
              <Home />
            </RouteContainer>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
