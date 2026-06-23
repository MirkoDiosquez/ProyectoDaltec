import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificacionProvider } from "./context/NotificacionContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <NotificacionProvider>
        <App />
      </NotificacionProvider>
    </AuthProvider>
  </React.StrictMode>
);
