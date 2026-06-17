"use client";

import { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface FieldSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function FieldSlider({
  label, value, min = 0, max = 100, step = 1, onChange, disabled,
}: FieldSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = max !== min ? ((value - min) / (max - min)) * 100 : 0;

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  const valueFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const p = (clientX - rect.left) / rect.width;
    return clamp(Math.round((min + p * (max - min)) / step) * step);
  }, [min, max, step, clamp]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    onChange(valueFromClientX(e.clientX));
  }, [disabled, valueFromClientX, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    onChange(valueFromClientX(e.clientX));
  }, [isDragging, valueFromClientX, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    const stepSize = e.shiftKey ? step * 5 : step;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(clamp(value + stepSize));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clamp(value - stepSize));
    }
  }, [disabled, value, step, onChange, clamp]);

  return (
    <div
      className={cn(
        "group relative h-[40px] flex flex-col justify-center rounded-lg px-1.5",
        "select-none cursor-pointer",
        "transition-[background] duration-[140ms]",
        (isHovering || isDragging) && !disabled && "bg-white/[0.025]",
        isFocused && "outline outline-1 outline-cyan/45 outline-offset-[2px]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => { setIsHovering(false); if (!isDragging) setIsDragging(false); }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-between w-full pointer-events-none mb-0.5">
        <span
          className={cn(
            "font-mono text-[10px] transition-colors duration-[140ms]",
            disabled
              ? "text-subtle/60"
              : isDragging || isHovering
                ? "text-[rgba(244,246,250,0.78)]"
                : "text-subtle",
          )}
        >
          {label}
        </span>
        {(isHovering || isDragging) && (
          <span className="font-mono text-[10px] text-frost/70 pointer-events-none">
            {value}
          </span>
        )}
      </div>

      <div
        ref={trackRef}
        className={cn(
          "relative h-[2px] w-full rounded-full transition-colors duration-[140ms] pointer-events-none",
          disabled
            ? "bg-white/[0.04]"
            : isDragging
              ? "bg-white/[0.22]"
              : isHovering
                ? "bg-white/[0.22]"
                : "bg-white/[0.08]",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-[140ms]",
            disabled
              ? "bg-frost/20"
              : isDragging
                ? "bg-gradient-to-r from-[rgba(120,223,255,0.75)] to-[rgba(167,139,250,0.65)]"
                : isHovering
                  ? "bg-frost/60"
                  : "bg-frost/40",
          )}
          style={{ width: `${pct}%` }}
        />
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-[8px] h-[8px] rounded-full transition-all duration-[140ms] pointer-events-none",
            disabled && "bg-frost/30",
            !disabled && isDragging && "bg-frost w-[10px] h-[10px] shadow-[0_0_18px_rgba(120,223,255,0.42)]",
            !disabled && isHovering && !isDragging && "scale-125 bg-frost/90 shadow-[0_0_14px_rgba(120,223,255,0.28)]",
            !disabled && !isHovering && !isDragging && "bg-frost/80",
            isDragging && "cursor-grabbing",
          )}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
