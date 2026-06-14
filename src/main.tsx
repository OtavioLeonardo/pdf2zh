import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import App from "./App";

const theme = createTheme({
  primaryColor: "appleBlue",
  colors: {
    appleBlue: [
      "#eef7ff",
      "#d9edff",
      "#add8ff",
      "#7dbfff",
      "#54a8ff",
      "#2997ff",
      "#0071e3",
      "#0066cc",
      "#0057ad",
      "#004889",
    ],
  },
  fontFamily: '"SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: '"SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: "600",
  },
  defaultRadius: "lg",
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
