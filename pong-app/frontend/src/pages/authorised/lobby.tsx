// // frontend/src/pages/authorised/lobby.tsx
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { OverviewTab, MyLockerTab, RallySquadTab, MatchHistoryTab } from "../../components/lobby";
// import { useAuth } from "../../contexts/AuthContext";
// import { getLobbyStats, getLobbyFriends, getLobbyRecentMatches, getLobbyProfile } from "../../utils/lobbyApi";

// const TABS = [
//   { key: "overview", label: "Overview", icon: "🏠" },
//   { key: "my-locker", label: "My Locker", icon: "🧳" },
//   { key: "rally-squad", label: "Rally Squad", icon: "👥" },
//   { key: "match-history", label: "Match History", icon: "📊" },
// ];

// export default function Lobby() {
//   const { user, logout } = useAuth();
//   const [activeTab, setActiveTab] = useState("overview");
//   const navigate = useNavigate();


//   // These are shared state, fetch once for the lobby page
//   const [stats, setStats] = useState(null);
//   const [friends, setFriends] = useState([]);
//   const [recentMatches, setRecentMatches] = useState([]);
//   const [profile, setProfile] = useState(null);

//   useEffect(() => {
//     async function fetchLobbyData() {
//       const [statsRes, friendsRes, matchesRes, profileRes] = await Promise.all([
//         getLobbyStats(), // { totalMatches, winRate, currentWinStreak, monthlyWins, wins, losses, draws }
//         getLobbyFriends(),    // [{id, name, status, rank, lastActive}]
//         getLobbyRecentMatches(), // [{id, opponent, result, score, matchType, date, duration}]
//         getLobbyProfile(),    // { name, email, profilePic, firstName, lastName, dateOfBirth, gender, language, favAvatar, wins, losses }
//       ]);
//       setStats(statsRes);
//       setFriends(friendsRes);
//       setRecentMatches(matchesRes);
//       setProfile(profileRes);
//     }
//     fetchLobbyData();
//   }, []);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#1b1443] to-[#4f1461] text-white">
//       {/* Welcome and buttons */}
//       <div className="flex flex-col items-center mt-1 mb-6">
//         <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mt-1 mb-2">
//           Welcome to the Arena
//         </h2>
//         <p className="text-lg text-gray-300 mb-6">
//           Ready to dominate the table? Choose your game mode below.
//         </p>
//         <div className="flex gap-10 mb-8">
//           <button 
//           onClick={() => navigate("/quick-match")}
//           className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black text-xl font-semibold px-12 py-8 rounded-2xl shadow-lg transition-all">
//             ⚡ Quick Match
//             <div className="text-sm font-normal mt-1">Fast 1v1 game</div>
//           </button>
//           <button 
//           onClick={() => navigate("/championship")}
//           className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-black text-xl font-semibold px-12 py-8 rounded-2xl shadow-lg transition-all">
//             <span role="img" aria-label="Championship">🏆</span> Championship
//             <div className="text-sm font-normal mt-1">Tournament mode</div>
//           </button>
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="flex justify-center mb-8">
//         <div className="flex gap-2 bg-[#20124c] rounded-lg p-2">
//           {TABS.map(tab => (
//             <button
//               key={tab.key}
//               className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition
//                 ${activeTab === tab.key ? "bg-[#7d2ae8] text-white" : "bg-[#181228] text-gray-300 hover:bg-[#2a1740]"}
//               `}
//               onClick={() => setActiveTab(tab.key)}
//             >
//               <span>{tab.icon}</span> {tab.label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Tab Panels */}
//       <div className="max-w-7xl mx-auto px-4 pb-16">
//         {activeTab === "overview" &&
//           <OverviewTab stats={stats} friends={friends} recentMatches={recentMatches} />}
//         {activeTab === "my-locker" &&
//           <MyLockerTab profile={profile} />}
//         {activeTab === "rally-squad" &&
//           <RallySquadTab friends={friends} />}
//         {activeTab === "match-history" &&
//           <MatchHistoryTab stats={stats} recentMatches={recentMatches} />}
//       </div>
//     </div>
//   );
// }



// frontend/src/pages/authorised/lobby.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OverviewTab, MyLockerTab, RallySquadTab, MatchHistoryTab } from "../../components/lobby";
import { useAuth } from "../../contexts/AuthContext";
import { getLobbyStats, getLobbyFriends, getLobbyRecentMatches, getLobbyProfile } from "../../utils/lobbyApi";

const TABS = [
  { key: "overview", label: "Overview", icon: "🏠" },
  { key: "my-locker", label: "My Locker", icon: "🧳" },
  { key: "rally-squad", label: "Rally Squad", icon: "👥" },
  { key: "match-history", label: "Match History", icon: "📊" },
];

export default function Lobby() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();


  // These are shared state, fetch once for the lobby page
  const [stats, setStats] = useState(null);
  const [friends, setFriends] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function fetchLobbyData() {
      const [statsRes, friendsRes, matchesRes, profileRes] = await Promise.all([
        getLobbyStats(), // { totalMatches, winRate, currentWinStreak, monthlyWins, wins, losses, draws }
        getLobbyFriends(),    // [{id, name, status, rank, lastActive}]
        getLobbyRecentMatches(), // [{id, opponent, result, score, matchType, date, duration}]
        getLobbyProfile(),    // { name, email, profilePic, firstName, lastName, dateOfBirth, gender, language, favAvatar, wins, losses }
      ]);
      setStats(statsRes);
      setFriends(friendsRes);
      setRecentMatches(matchesRes);
      setProfile(profileRes);
    }
    fetchLobbyData();
  }, []);

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
        <div className="flex gap-10 mb-8">
          <button 
          onClick={() => navigate("/quick-match")}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black text-xl font-semibold px-12 py-8 rounded-2xl shadow-lg transition-all">
            ⚡ Quick Match
            <div className="text-sm font-normal mt-1">Fast 1v1 game</div>
          </button>
          <button 
          onClick={() => navigate("/championship")}
          className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-black text-xl font-semibold px-12 py-8 rounded-2xl shadow-lg transition-all">
            <span role="img" aria-label="Championship">🏆</span> Championship
            <div className="text-sm font-normal mt-1">Tournament mode</div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-2 bg-[#20124c] rounded-lg p-2">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition
                ${activeTab === tab.key ? "bg-[#7d2ae8] text-white" : "bg-[#181228] text-gray-300 hover:bg-[#2a1740]"}
              `}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {activeTab === "overview" &&
          <OverviewTab stats={stats} friends={friends} recentMatches={recentMatches} />}
        {activeTab === "my-locker" &&
          <MyLockerTab profile={profile} />}
        {activeTab === "rally-squad" &&
          <RallySquadTab />}
        {activeTab === "match-history" &&
          <MatchHistoryTab stats={stats} recentMatches={recentMatches} />}
      </div>
    </div>
  );
}