import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  score: number;
}

export default function HealthScoreGauge({ score }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s: number) => {
    if (s >= 80) return "hsl(var(--chart-2))";
    if (s >= 60) return "hsl(var(--primary))";
    return "hsl(var(--chart-3))";
  };

  const getLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-[140px] h-[140px]"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Financial health score"
      >
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={getColor(animatedScore)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-foreground">{animatedScore}</span>
          <span className="text-[11px] text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${getColor(score)}20`, color: getColor(score) }}
        >
          {getLabel(score)}
        </span>
      </div>
    </div>
  );
}
