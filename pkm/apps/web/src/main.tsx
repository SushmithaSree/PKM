import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/lora/400.css";
import "@pkm/core-ui/src/tokens.css";
import "@xyflow/react/dist/style.css";
import Capture from "./routes/Capture";
import Inbox from "./routes/Inbox";
import Boards from "./routes/Boards";
import Board from "./routes/Board";
import Settings from "./routes/Settings";
import Nav from "./components/Nav";

function Layout() {
  return (
    <>
      <Outlet />
      <Nav />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Navigate to="/capture" replace /> },
      { path: "/capture", element: <Capture /> },
      { path: "/inbox", element: <Inbox /> },
      { path: "/boards", element: <Boards /> },
      { path: "/board/:id", element: <Board /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
