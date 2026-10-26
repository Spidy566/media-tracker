"use client";

interface CosmosSpinnerProps {
  className?: string;
  size?: number;
}

const DOT_KEYS = [
  "dot-0",
  "dot-1",
  "dot-2",
  "dot-3",
  "dot-4",
  "dot-5",
  "dot-6",
  "dot-7",
  "dot-8",
  "dot-9",
];

export function CosmosSpinner({ className = "", size = 44 }: CosmosSpinnerProps) {
  const dotCount = DOT_KEYS.length;
  const radius = (size - 6) / 2;
  const center = size / 2;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="animate-spin"
        style={{ animationDuration: "1.2s" }}
      >
        <title>Loading</title>
        {DOT_KEYS.map((key, i) => {
          const angle = (i * 2 * Math.PI) / dotCount - Math.PI / 2;
          const cx = center + radius * Math.cos(angle);
          const cy = center + radius * Math.sin(angle);
          const opacity = 0.15 + (0.85 * (i + 1)) / dotCount;
          return (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={2.2}
              fill="currentColor"
              className="text-white"
              style={{ opacity }}
            />
          );
        })}
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
