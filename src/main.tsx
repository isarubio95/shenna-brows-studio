import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/lato/300.css";    // Light
import "@fontsource/lato/400.css";    // Regular
import "@fontsource/lato/700.css";    // Bold
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
