"use client";

interface AriaScoreGaugeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeConfig = {
  sm: { width: 40, height: 40, strokeWidth: 3, fontSize: 'text-xs', radius: 16 },
  md: { width: 64, height: 64, strokeWidth: 4, fontSize: 'text-base', radius: 26 },
  lg: { width: 96, height: 96, strokeWidth: 5, fontSize: 'text-xl', radius: 40 },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function getStrokeColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function AriaScoreGauge({ score, size = 'md', showLabel = false }: AriaScoreGaugeProps) {
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const displayScore = score ?? 0;
  const progress = (displayScore / 100) * circumference;

  if (score === null) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-muted/50"
        style={{ width: config.width, height: config.height }}
      >
        <span className="text-muted-foreground text-xs">--</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <svg
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
          className="transform -rotate-90"
        >
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/30"
          />
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            fill="none"
            stroke={getStrokeColor(displayScore)}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${config.fontSize} ${getScoreColor(displayScore)}`}>
            {displayScore}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">ARIA Score</span>
      )}
    </div>
  );
}
