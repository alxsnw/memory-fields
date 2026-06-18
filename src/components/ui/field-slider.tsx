"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface FieldSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  onLiveChange?: (value: number) => void;
  disabled?: boolean;
}

export function FieldSlider({
  label, value, min = 0, max = 100, step = 1, onChange, onLiveChange, disabled,
}: FieldSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const liveValRef = useRef(value);
  const rafRef = useRef<number>(0);
  const [displayVal, setDisplayVal] = useState(value);

  const pct = max !== min ? ((displayVal - min) / (max - min)) * 100 : 0;

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  const valueFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return displayVal;
    const rect = trackRef.current.getBoundingClientRect();
    const p = (clientX - rect.left) / rect.width;
    return clamp(Math.round((min + p * (max - min)) / step) * step);
  }, [min, max, step, clamp, displayVal]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const v = valueFromClientX(e.clientX);
    liveValRef.current = v;
    setDisplayVal(v);
    onLiveChange?.(v);
    setIsDragging(true);
  }, [disabled, valueFromClientX, onLiveChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const v = valueFromClientX(e.clientX);
    liveValRef.current = v;
    setDisplayVal(v);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onLiveChange?.(v);
    });
  }, [isDragging, valueFromClientX, onLiveChange]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    cancelAnimationFrame(rafRef.current);
    onChange(liveValRef.current);
    setIsDragging(false);
  }, [isDragging, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    const stepSize = e.shiftKey ? step * 5 : step;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const v = clamp(value + stepSize);
      onChange(v);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clamp(value - stepSize));
    }
  }, [disabled, value, step, onChange, clamp]);

  useEffect(() => {
    if (!isDragging) {
      setDisplayVal(value);
    }
  }, [value, isDragging]);

  const isActive = isDragging || isHovering;

  return (
    <div
      className={cn(
        "group relative py-2.5 px-1.5",
        "select-none",
        "transition-[background] duration-[140ms]",
        isActive && !disabled && "bg-white/[0.025]",
        isFocused && "outline outline-1 outline-cyan/45 outline-offset-[2px]",
        disabled && "opacity-50",
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
      aria-valuenow={displayVal}
      aria-disabled={disabled}
      style={{ touchAction: "none", userSelect: "none" }}
    >
      <div className="flex items-center justify-between w-full pointer-events-none mb-1">
        <span
          className={cn(
            "font-mono text-[10px] transition-colors duration-[140ms]",
            disabled
              ? "text-subtle/60"
              : isActive
                ? "text-[rgba(244,246,250,0.78)]"
                : "text-subtle",
          )}
        >
          {label}
        </span>
        <span className={cn(
          "font-mono text-[10px] pointer-events-none transition-opacity duration-[140ms]",
          isActive ? "text-frost/70" : "text-frost/40",
        )}>
          {displayVal}
        </span>
      </div>

      <div ref={trackRef} className="relative h-7 flex items-center -mx-0.5 cursor-pointer">
        <div
          className={cn(
            "relative h-1 w-full rounded-full",
            disabled
              ? "bg-white/[0.04]"
              : isDragging
                ? "bg-white/[0.22]"
                : isHovering
                  ? "bg-white/[0.22]"
                  : "bg-white/[0.08]",
            isDragging ? "" : "transition-colors duration-[140ms]",
          )}
        >
          <div
            className={cn(
              "h-full rounded-full",
              disabled
                ? "bg-frost/20"
                : isDragging
                  ? "bg-gradient-to-r from-[rgba(120,223,255,0.75)] to-[rgba(167,139,250,0.65)]"
                  : isHovering
                    ? "bg-frost/60"
                    : "bg-frost/40",
              isDragging ? "" : "transition-all duration-[140ms]",
            )}
            style={{ width: `${pct}%` }}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
              "w-[16px] h-[16px] rounded-full",
              isDragging ? "cursor-grabbing" : "cursor-grab",
              disabled && "bg-frost/30",
              !disabled && isDragging && "bg-frost shadow-[0_0_18px_rgba(120,223,255,0.42)]",
              !disabled && isHovering && !isDragging && "scale-110 bg-frost/90 shadow-[0_0_14px_rgba(120,223,255,0.28)]",
              !disabled && !isHovering && !isDragging && "bg-frost/80",
              isDragging ? "" : "transition-all duration-[140ms]",
            )}
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
