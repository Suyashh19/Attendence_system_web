import { useEffect, useRef, useState } from 'react';

interface CountdownTimerProps {
  /** Seconds left when the timer mounts */
  duration: number;
  onComplete?: () => void;
  size?: number;
  strokeWidth?: number;
}

/**
 * Ring countdown on the dark hero. Counts against a fixed end time rather than
 * ticking down, so a page that Safari paused in the background shows the right time on return.
 */
export function CountdownTimer({ duration, onComplete, size = 132, strokeWidth = 9 }: CountdownTimerProps) {
  const totalMs = Math.max(0, duration) * 1000;
  const endAt = useRef(Date.now() + totalMs);
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (totalMs <= 0) {
      onCompleteRef.current?.();
      return;
    }
    let frame = 0;
    let done = false;
    const tick = () => {
      const left = Math.max(0, endAt.current - Date.now());
      setRemainingMs(left);
      if (left === 0) {
        if (!done) {
          done = true;
          onCompleteRef.current?.();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [totalMs]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalMs > 0 ? remainingMs / totalMs : 0;
  // Ring colour as time runs out: plenty of time -> hurry -> almost over
  const color = fraction > 0.5 ? '#0B815A' : fraction > 0.2 ? '#B45309' : '#D92D20';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-[40px] font-extrabold leading-none">{Math.ceil(remainingMs / 1000)}</span>
        <span className="text-[10px] font-bold tracking-widest text-white/60 mt-1">SECONDS</span>
      </div>
    </div>
  );
}
