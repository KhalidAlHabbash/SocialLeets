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
  isSpeaking,
  onToggleMute,
  onToggleLocalMute,
}: {
  username: string;
  muted: boolean;
  isLocallyMuted: boolean;
  isCurrentUser: boolean;
  isSpeaking: boolean;
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

  // Speaking animation classes
  const speakingClasses = isSpeaking && !isEffectivelyMuted 
    ? 'animate-pulse scale-105 shadow-lg' 
    : '';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* "You" label for current user */}
        {isCurrentUser && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-xl px-3 py-0.3 shadow-md border">
            <span className="text-xs font-bold text-gray-700">You</span>
          </div>
        )}

        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md text-2xl font-bold transition-all duration-200 hover:scale-110 border-2 border-white ${speakingClasses}`}
          style={{ background: bgColor }}
          title={username}
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

      <span className="text-xs font-semibold text-gray-700 text-center max-w-[80px] truncate" title={username}>
        {username}
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
            {isSpeaking ? 'Speaking' : 'Silent'}
          </>
        )}
      </span>
    </div>
  );
} 