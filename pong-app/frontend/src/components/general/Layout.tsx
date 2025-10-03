// frontend/src/components/general/Layout.tsx
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Navbar />
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <footer className="p-4 text-center text-gray-400">
        © {new Date().getFullYear()} Ping Pong Game
      </footer>
    </div>
  );
};
