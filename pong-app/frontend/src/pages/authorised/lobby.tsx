// frontend/src/pages/authorised/lobby.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  OverviewTab,
  MyLockerTab,
  RallySquadTab,
  MatchHistoryTab,
} from "../../components/lobby";

const TABS = [
  { key: "overview", label: "Overview", icon: "🏠" },
  { key: "my-locker", label: "My Locker", icon: "🧳" },
  { key: "rally-squad", label: "Rally Squad", icon: "👥" },
  { key: "match-history", label: "Match History", icon: "📊" },
];

export default function LobbyPage() {
  const [activeTab, setActiveTab] = useState("overview" || null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1b1443] to-[#4f1461] text-white">
      {/* Welcome and buttons */}
      <div className="flex flex-col items-center mt-1 mb-6">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mt-1 mb-2">
          Welcome to the Arena
        </h2>
        <p className="text-lg text-gray-300 mb-6">
          Ready to dominate the table? Choose your game mode below.
        </p>
        <div className="flex gap-8 mb-8">
          {/* Quick Match Card with Local and Remote buttons */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-black font-semibold p-6 rounded-2xl shadow-lg w-80">
            <div className="text-center mb-5">
              <div className="text-xl font-bold mt-1">
                <span className="text-3xl">⚡</span>Quick Match
              </div>
              <div className="text-sm font-normal opacity-90">
                Fast 1v1 game
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/quickmatch")}
                className="bg-white hover:bg-gray-100 text-emerald-700 font-medium py-3 rounded-lg transition-all shadow-md text-lg"
              >
                🎯 Join 1v1 lobby
              </button>
            </div>
          </div>

          {/* Tournament Card with options */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-semibold p-6 rounded-2xl shadow-lg w-80">
            <div className="text-center mb-5">
              <div className="text-xl font-bold mt-1">
                <span className="text-3xl">🏆</span>Tournament
              </div>
              <div className="text-sm font-normal opacity-90">
                Compete in brackets
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/tournament")}
                className="bg-white hover:bg-gray-100 text-orange-700 font-medium py-3 rounded-lg transition-all shadow-md text-lg"
              >
                🎯 Join Tournament lobby
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-2 bg-[#20124c] rounded-lg p-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition
                ${
                  activeTab === tab.key
                    ? "bg-[#7d2ae8] text-white"
                    : "bg-[#181228] text-gray-300 hover:bg-[#2a1740]"
                }
              `}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels - Each component fetches its own data */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "my-locker" && <MyLockerTab />}
        {activeTab === "rally-squad" && <RallySquadTab />}
        {activeTab === "match-history" && <MatchHistoryTab />}
      </div>
    </div>
  );
}
