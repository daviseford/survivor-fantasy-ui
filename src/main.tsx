import React from "react";
import ReactDOM from "react-dom/client";

import { AppRoutes } from "./AppRoutes.tsx";
import { installStaleChunkReload } from "./utils/staleChunkReload";

installStaleChunkReload();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>,
);
