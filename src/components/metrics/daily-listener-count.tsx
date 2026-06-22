"use client";

interface Props {
  count: number | null;
}

export function DailyListenerCount({ count }: Props) {
  if (count === null) return null;

  return (
    <div className="font-mono text-[10px] text-subtle/50 tracking-[0.05em] select-none">
      {count} {count === 1 ? "listener has" : "listeners have"} entered the field
    </div>
  );
}
