import { PhoneCall } from "lucide-react";

export function AppIcon({
  className = "h-8 w-8",
  iconClassName = "h-4 w-4",
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#171717_0%,#2a2720_46%,#d6a84f_100%)] text-white shadow-[0_10px_26px_rgba(23,23,23,0.16)] ${className}`}
      aria-hidden="true"
    >
      <PhoneCall className={iconClassName} />
    </span>
  );
}
