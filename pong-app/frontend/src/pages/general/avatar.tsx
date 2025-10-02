// frontend/src/pages/general/avatar.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../utils/api";

interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

interface AvatarPageProps {
  closeForm: () => void;
  target: string;
  setUserAvatar: React.Dispatch<any>
  setGuestAvatar: React.Dispatch<any>
  saveAvatarData: (key: string, avatar: AvatarData | null) => void
}

export const AvatarPage = ({closeForm, target, setUserAvatar, setGuestAvatar, saveAvatarData}: AvatarPageProps) => {
  const location = useLocation();

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // const target = state?.target || "user";
  // const guestIndex = state?.guestIndex ?? -1;
  // const returnTo = state?.returnTo || "/quickmatch";

  // Load avatars from backend
  useEffect(() => {
  const loadAvatars = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/avatars');
      setAvatars(response.data);
    } catch (err) {
      setError("Failed to load avatars");
      console.error("Avatar loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  loadAvatars();
}, []);

  // Track which avatars are already selected
  const selectedAvatars = new Set<string>();

  // Check user avatar
  const userAvatar = JSON.parse(localStorage.getItem("userAvatar") || "null");
  if (userAvatar?.name && !(target === "user")) {
    selectedAvatars.add(userAvatar.name);
  }

  // Check guest avatar (support both quickmatch and regular guest)
  // const guestAvatarKey = state?.fromQuickMatch ? "quickmatch_guestAvatar" : "guestAvatar";
  const guestAvatar = JSON.parse(localStorage.getItem("guestAvatar") || "null");
  if (guestAvatar?.name && !(target === "guest")) {
    selectedAvatars.add(guestAvatar.name);
  }

  // Check tournament guests
  const guests = JSON.parse(
    localStorage.getItem("tournamentGuests") ||
      localStorage.getItem("guests") ||
      "[]"
  );
  guests.forEach((g: any, i: number) => {
    if (g?.avatar?.name && !(target === "guest")) {
      selectedAvatars.add(g.avatar.name);
    }
  });

  const handleSelect = (avatar: Avatar) => {
    const selectedAvatar = { name: avatar.id, image: avatar.imageUrl };
    if (selectedAvatar && target) {
      const avatarData = {
        name: selectedAvatar.name,
        image: selectedAvatar.image
      };
      
      if (target === "user") {
        setUserAvatar(avatarData);
        saveAvatarData("userAvatar", avatarData);
      } else {
        setGuestAvatar(avatarData);
        saveAvatarData("quickmatch_guestAvatar", avatarData);
      }
    }
    closeForm();
    // navigate(returnTo, {
    //   state: {
    //     selectedAvatar,
    //     target,
    //     guestIndex,
    //     fromAvatar: true,
    //     fromQuickMatch: state?.fromQuickMatch,
    //   },
    // });
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-cover bg-center text-white p-8 flex flex-col items-center justify-center"
        style={{ backgroundImage: "url('/background/gray_background.jpg')" }}
      >
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg">Loading avatars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-cover bg-center text-white p-8 flex flex-col items-center justify-center"
        style={{ backgroundImage: "url('/background/gray_background.jpg')" }}
      >
        <p className="text-red-400 text-xl mb-4">{error}</p>
        <button
          onClick={() => closeForm()}
          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center text-white p-8 flex flex-col items-center bg-gray-700 text-white"
     
    >
      <button
        onClick={() => closeForm()}
        className="absolute top-6 left-6 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md"
      >
        Back
      </button>

      <h1 className="text-4xl font-bold text-center mb-6">
        Choose Avatar
      </h1>
      
      <p className="text-lg text-gray-300 mb-8 text-center">
        {target === "user" ? "Choose avatar for Player 1" : "Choose avatar for Player 2 (Guest)"}
      </p>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {avatars.map((avatar) => {
          const isTaken = selectedAvatars.has(avatar.id) || selectedAvatars.has(avatar.name);

          return (
            <div
              key={avatar.id}
              onClick={() => !isTaken && handleSelect(avatar)}
              className={`bg-gray-800 rounded-xl p-4 shadow-lg text-center transition-transform ${
                isTaken
                  ? "opacity-40 pointer-events-none"
                  : "cursor-pointer hover:scale-105 hover:bg-gray-700"
              }`}
            >
              <img
                src={avatar.imageUrl}
                alt={avatar.name}
                className="w-full h-48 object-contain mb-3 rounded-md border-2 border-gray-600"
              />
              <h2 className="text-lg font-bold mb-2">{avatar.name}</h2>
              <p className="text-gray-400 text-sm">{avatar.description}</p>
              {isTaken && (
                <p className="mt-2 text-red-400 text-sm font-semibold">
                  Already Taken
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarPage;