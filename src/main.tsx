import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import "@fontsource/lato/300.css";    // Light
import "@fontsource/lato/400.css";    // Regular
import "@fontsource/lato/700.css";    // Bold
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>
);
