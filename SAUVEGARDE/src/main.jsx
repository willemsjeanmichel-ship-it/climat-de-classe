import React from "react";
import ReactDOM from "react-dom/client";

import Router from "./router.jsx";

import "./styles/globals.css";
import "./styles/admin.css";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);