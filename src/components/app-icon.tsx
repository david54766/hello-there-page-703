export function AppIcon({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <img
      src="/app-icon.svg"
      alt=""
      className={`rounded-xl shadow-[0_10px_26px_rgba(23,23,23,0.16)] ${className}`}
      aria-hidden="true"
    />
  );
}
