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
  isLocallyMuted,
  isCurrentUser,
  onToggleMute,
  onToggleLocalMute,
}: {
  username: string;
  muted: boolean;
  isLocallyMuted: boolean;
  isCurrentUser: boolean;
  onToggleMute: () => void;
  onToggleLocalMute: () => void;
}) {
  const bgColor = useMemo(() => getRandomPastelColor(username), [username]);
  const initials = getInitials(username);

  // Determine the effective mute state for display
  const isEffectivelyMuted = isCurrentUser ? muted : (muted || isLocallyMuted);
  
  // Determine which action to take when clicking the mute button
  const handleMuteClick = () => {
    if (isCurrentUser) {
      onToggleMute(); // Global mute for current user
    } else {
      onToggleLocalMute(); // Local mute for other users
    }
  };

  // Display name with "Me" indicator for current user
  const displayName = isCurrentUser ? `${username} (Me) ⭐` : username;
  
  // Size classes based on whether it's current user
  const bubbleSize = isCurrentUser ? 'w-20 h-20' : 'w-16 h-16';
  const textSize = isCurrentUser ? 'text-3xl' : 'text-2xl';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div
          className={`${bubbleSize} rounded-full flex items-center justify-center shadow-md ${textSize} font-bold transition-transform hover:scale-110 border-2 border-white`}
          style={{ background: bgColor }}
          title={displayName}
        >
          {initials}
        </div>

        <button
          onClick={handleMuteClick}
          className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md hover:scale-105 transition-transform"
          title={
            isCurrentUser 
              ? (muted ? 'Unmute' : 'Mute') 
              : (isLocallyMuted ? 'Unmute locally' : 'Mute locally')
          }
        >
          {isEffectivelyMuted ? (
            <HiSpeakerXMark className={`w-4 h-4 ${isLocallyMuted && !isCurrentUser ? 'text-orange-400' : 'text-red-400'}`} />
          ) : (
            <HiSpeakerWave className="text-green-400 w-4 h-4" />
          )}
        </button>
      </div>

      <span className={`text-xs font-semibold text-gray-700 text-center ${isCurrentUser ? 'max-w-[100px]' : 'max-w-[80px]'} truncate`} title={displayName}>
        {displayName}
      </span>
      
      {/* Show mute status */}
      <span className="text-xs flex items-center gap-1 text-gray-500">
        {isEffectivelyMuted ? (
          <>
            <HiSpeakerXMark className={`${isLocallyMuted && !isCurrentUser ? 'text-orange-400' : 'text-red-400'}`} />
            {isLocallyMuted && !isCurrentUser ? 'Locally muted' : 'Muted'}
          </>
        ) : (
          <>
            <HiSpeakerWave className="text-green-400" />
            Speaking
          </>
        )}
      </span>
    </div>
  );
} 