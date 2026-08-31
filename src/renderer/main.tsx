import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import { DesignSystemProvider } from "@/components/design-system-provider";
import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Open Learning renderer root is missing.");

createRoot(root).render(
  <StrictMode>
    <DesignSystemProvider>
      <App />
    </DesignSystemProvider>
  </StrictMode>
);
