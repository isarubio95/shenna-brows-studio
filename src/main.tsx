import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import { waitForSiteContent } from "@/hooks/use-site-content";
import "@fontsource/lato/300.css";    // Light
import "@fontsource/lato/400.css";    // Regular
import "@fontsource/lato/700.css";    // Bold
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "./index.css";

// El primer render ya lleva lo guardado en el panel: nada de pintar los valores
// por defecto y cambiarlos al llegar la base de datos.
void waitForSiteContent().then(() => {
  createRoot(document.getElementById("root")!).render(
    <>
      <App />
      <Analytics />
    </>
  );
});
