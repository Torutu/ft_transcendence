import { useParams } from "react-router";
import PlayLAN from "./playLAN";

export default function GameRoom() {
  const { gameId } = useParams();

  if (!gameId) {
    return <div>Invalid game ID</div>;
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PlayLAN />
    </div>
  );
}
