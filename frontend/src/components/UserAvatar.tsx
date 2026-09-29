export function UserAvatar({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal text-white"
      style={{ width: size, height: size }}
      title={name || undefined}
    >
      {src ? (
        <img src={src} alt={name || 'avatar'} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.45 }}>{initial}</span>
      )}
    </div>
  );
}
