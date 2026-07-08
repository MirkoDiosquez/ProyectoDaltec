import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CatalogoProvider } from "./context/CatalogoContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <CatalogoProvider>
        <App />
      </CatalogoProvider>
    </AuthProvider>
  </React.StrictMode>
);
