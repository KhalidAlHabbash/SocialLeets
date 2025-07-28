import { HiSpeakerXMark, HiSpeakerWave } from 'react-icons/hi2';
import { useMemo } from 'react';

function getInitials(username: string) {
  return username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
}

function getRandomPastelColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 85%)`;
}

export default function UserBubble({
  username,
  muted,
  onToggleMute,
}: {
  username: string;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const bgColor = useMemo(() => getRandomPastelColor(username), [username]);
  const initials = getInitials(username);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-md text-2xl font-bold transition-transform hover:scale-110 border-2 border-white"
          style={{ background: bgColor }}
          title={username}
        >
          {initials}
        </div>

        <button
          onClick={onToggleMute}
          className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md hover:scale-105 transition-transform"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <HiSpeakerXMark className="text-red-400 w-4 h-4" />
          ) : (
            <HiSpeakerWave className="text-green-400 w-4 h-4" />
          )}
        </button>
      </div>

      <span className="text-xs font-semibold text-gray-700 text-center max-w-[80px] truncate" title={username}>
        {username}
      </span>
    </div>
  );
}
// export default function UserBubble({ username, muted }: { username: string; muted: boolean }) {
//   // Memoize color so it doesn't change on re-render
//   const bgColor = useMemo(() => getRandomPastelColor(username), [username]);
//   const initials = getInitials(username);

//   return (
//     <div className="flex flex-col items-center gap-2">
//       <div
//         className="w-16 h-16 rounded-full flex items-center justify-center shadow-md text-2xl font-bold transition-transform hover:scale-110 border-2 border-white"
//         style={{ background: bgColor }}
//         title={username}
//       >
//         {initials}
//       </div>
//       <span className="text-xs font-semibold text-gray-700 text-center max-w-[80px] truncate" title={username}>
//         {username}
//       </span>
//       <span className="text-xs flex items-center gap-1 text-gray-500">
//         {muted ? (
//           <HiSpeakerXMark className="text-red-400" />
//         ) : (
//           <HiSpeakerWave className="text-green-400" />
//         )}
//         {muted ? 'Muted' : 'Speaking'}
//       </span>
//     </div>
//   );
// } 