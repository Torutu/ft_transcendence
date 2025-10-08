// frontend/src/components/general/Layout.tsx
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export const Layout = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1b1443] to-[#4f1461] text-white">
      <Navbar />
      <main className="flex-1 p-0">
        <Outlet />
      </main>
      <footer className="p-4 text-center text-gray-400">
        © {new Date().getFullYear()} Ping Pong Game
      </footer>
    </div>
  );
};
