import { useEffect, useRef, useState } from "react";
import { DOOMSDAY_BASE_SECONDS } from "@/lib/countryDatabase";

type Props = {
  secondsToMidnight: number;
  alertLevel: number;
};

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0) {
    return { label: `${mins}m ${secs}s`, short: `${mins}:${String(secs).padStart(2, "0")}` };
  }
  return { label: `${secs} seconds`, short: `0:${String(secs).padStart(2, "0")}` };
}

function getAlertColor(level: number): string {
  if (level >= 0.9) return "#7f1d1d";
  if (level >= 0.75) return "#b91c1c";
  if (level >= 0.6) return "#dc2626";
  if (level >= 0.45) return "#ef4444";
  if (level >= 0.3) return "#f97316";
  if (level >= 0.15) return "#facc15";
  return "#22c55e";
}

function getAlertLabel(level: number): string {
  if (level >= 0.9) return "CRITICAL";
  if (level >= 0.75) return "SEVERE";
  if (level >= 0.6) return "DANGER";
  if (level >= 0.45) return "HIGH";
  if (level >= 0.3) return "ELEVATED";
  if (level >= 0.15) return "MODERATE";
  return "LOW";
}

export default function DoomsdayClock({ secondsToMidnight, alertLevel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displaySeconds, setDisplaySeconds] = useState(secondsToMidnight);
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    let start: number | null = null;
    const from = displaySeconds;
    const to = secondsToMidnight;
    const diff = to - from;
    if (diff === 0) return;
    setTicking(true);
    const duration = 1200;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplaySeconds(Math.round(from + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTicking(false);
      }
    };
    requestAnimationFrame(animate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsToMidnight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    ctx.clearRect(0, 0, size, size);

    const color = getAlertColor(alertLevel);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a0f";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
    glowGrad.addColorStop(0, "transparent");
    glowGrad.addColorStop(1, `${color}33`);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + Math.cos(angle) * (r - 4);
      const y1 = cy + Math.sin(angle) * (r - 4);
      const x2 = cx + Math.cos(angle) * (r - (i % 3 === 0 ? 12 : 8));
      const y2 = cy + Math.sin(angle) * (r - (i % 3 === 0 ? 12 : 8));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = i % 3 === 0 ? "#ffffff99" : "#ffffff44";
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.stroke();
    }

    const maxSeconds = DOOMSDAY_BASE_SECONDS + 150;
    const progressFraction = 1 - (displaySeconds / maxSeconds);
    const handAngleFraction = 0.75 + progressFraction * 0.08;
    const handAngle = handAngleFraction * Math.PI * 2 - Math.PI / 2;

    const handLength = r * 0.7;
    const hx = cx + Math.cos(handAngle) * handLength;
    const hy = cy + Math.sin(handAngle) * handLength;

    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(hx, hy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    const minuteAngle = Math.floor(displaySeconds / 60) / 60 * Math.PI * 2 - Math.PI / 2;
    const mLength = r * 0.55;
    const mx = cx + Math.cos(minuteAngle) * mLength;
    const my = cy + Math.sin(minuteAngle) * mLength;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(mx, my);
    ctx.strokeStyle = "#ffffff88";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

  }, [displaySeconds, alertLevel]);

  const color = getAlertColor(alertLevel);
  const label = getAlertLabel(alertLevel);
  const timeStr = formatTime(displaySeconds);

  return (
    <div
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border backdrop-blur-md"
      style={{
        background: "rgba(5,5,12,0.88)",
        borderColor: `${color}55`,
        boxShadow: `0 0 20px ${color}33`,
        minWidth: 148,
      }}
    >
      <div className="flex items-center gap-1.5 w-full justify-between">
        <span className="font-mono text-[10px] tracking-widest text-white/50 uppercase">Doomsday Clock</span>
        <span
          className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-bold tracking-wider"
          style={{ background: `${color}33`, color }}
        >
          {label}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={110}
        height={110}
        className="rounded-full"
        style={{ filter: ticking ? `drop-shadow(0 0 6px ${color})` : undefined }}
      />

      <div className="text-center">
        <div
          className="font-mono font-bold text-sm tracking-widest"
          style={{ color, textShadow: `0 0 10px ${color}88` }}
        >
          {timeStr.short}
        </div>
        <div className="font-mono text-[9px] text-white/40 mt-0.5">TO MIDNIGHT</div>
      </div>

      <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${alertLevel * 100}%`,
            background: `linear-gradient(90deg, #22c55e, ${color})`,
          }}
        />
      </div>

      <div className="font-mono text-[9px] text-white/30 text-center">
        {timeStr.label} to midnight
      </div>
    </div>
  );
}
