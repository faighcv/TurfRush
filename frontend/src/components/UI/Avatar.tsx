interface AvatarProps {
  username: string;
  color: string;
  size?: number;
  className?: string;
}

export default function Avatar({ username, color, size = 40, className }: AvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        border: `2px solid ${color}60`,
        fontSize: size * 0.38,
        boxShadow: `0 0 12px ${color}40`,
      }}
    >
      {username[0].toUpperCase()}
    </div>
  );
}
