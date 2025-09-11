// frontend/src/pages/general/AvatarPickerPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAvatars, updateLobbyProfile } from "../../utils/lobbyApi";

// Avatar type for TypeScript
interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  color?: string;
}

interface LocationState {
  currentFavAvatar?: string;
  onPick?: (avatarId: string) => void; // Optional callback from parent
}

const AvatarPickerPage: React.FC = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selected, setSelected] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState || {};

  useEffect(() => {
    getAvatars().then((data) => setAvatars(data));
    if (state.currentFavAvatar) setSelected(state.currentFavAvatar);
  }, [state.currentFavAvatar]);

  async function handleSave() {
    // If passed as callback from parent, use it
    if (state.onPick) {
      state.onPick(selected);
      navigate(-1); // Go back
      return;
    }
    // Otherwise update profile and go to /lobby
    await updateLobbyProfile({ favAvatar: selected });
    navigate("/lobby");
  }

  return (
    <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-300">Pick Your Avatar</h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {avatars.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => setSelected(avatar.id)}
            className={`p-4 rounded-xl ${
              avatar.color || "bg-gray-700"
            } ${selected === avatar.id ? "ring-4 ring-white" : ""}`}
            title={avatar.name}
          >
            <img
              src={avatar.imageUrl}
              alt={avatar.name}
              className="w-16 h-16 rounded-full mx-auto object-cover"
            />
            <div className="mt-2 text-sm font-bold text-white">{avatar.name}</div>
          </button>
        ))}
      </div>
      <button
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
        onClick={handleSave}
        disabled={!selected}
      >
        Save Avatar
      </button>
      <button
        className="w-full mt-2 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
        onClick={() => navigate(-1)}
      >
        Cancel
      </button>
    </div>
  );
};

export default AvatarPickerPage;