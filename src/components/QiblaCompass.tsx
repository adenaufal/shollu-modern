import { createMemo } from "solid-js";

interface QiblaCompassProps {
  deg?: number;
  size?: number;
}

export function QiblaCompass(props: QiblaCompassProps) {
  const size = () => props.size ?? 52;
  const deg = () => props.deg ?? 293.81;

  return (
    <svg width={size()} height={size()} viewBox="0 0 52 52" fill="none" class="select-none">
      {/* Outer Circle */}
      <circle
        cx="26"
        cy="26"
        r="24"
        stroke="var(--border)"
        stroke-width="1.5"
        fill="var(--surface)"
      />
      {/* Cardinal Labels */}
      <text
        x="26"
        y="9"
        text-anchor="middle"
        font-size="6"
        font-weight="700"
        fill="var(--fg-muted)"
        font-family="Inter, sans-serif"
      >
        N
      </text>
      <text
        x="26"
        y="47"
        text-anchor="middle"
        font-size="6"
        fill="var(--fg-muted)"
        font-family="Inter, sans-serif"
      >
        S
      </text>
      <text
        x="7"
        y="28"
        text-anchor="middle"
        font-size="6"
        fill="var(--fg-muted)"
        font-family="Inter, sans-serif"
      >
        W
      </text>
      <text
        x="46"
        y="28"
        text-anchor="middle"
        font-size="6"
        fill="var(--fg-muted)"
        font-family="Inter, sans-serif"
      >
        E
      </text>
      {/* Rotating Needle */}
      <g transform={`translate(26,26) rotate(${deg()})`}>
        {/* North Pointer (pointing to Mecca) */}
        <polygon points="0,-18 2.5,-6 0,-9 -2.5,-6" fill="var(--accent-500)" />
        {/* South Pointer */}
        <polygon points="0,18 2.5,6 0,9 -2.5,6" fill="var(--fg-muted)" opacity="0.35" />
      </g>
      {/* Center Pivot */}
      <circle cx="26" cy="26" r="2" fill="var(--fg-muted)" />
    </svg>
  );
}
