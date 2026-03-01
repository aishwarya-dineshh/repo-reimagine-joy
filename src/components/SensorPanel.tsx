import React, { useRef, useEffect, useCallback } from 'react';

interface SensorPanelProps {
  pulseBuffer: number[];
  bpm: number;
  saccadeRate: number;
  blinkRate: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  trackingCanvasRef: React.RefObject<HTMLCanvasElement>;
}

const SensorPanel: React.FC<SensorPanelProps> = ({
  pulseBuffer, bpm, saccadeRate, blinkRate, videoRef, trackingCanvasRef
}) => {
  const pulseCanvasRef = useRef<HTMLCanvasElement>(null);
  const blinkCanvasRef = useRef<HTMLCanvasElement>(null);
  const blinkHistoryRef = useRef<number[]>([]);

  // Update blink history
  useEffect(() => {
    blinkHistoryRef.current.push(blinkRate);
    if (blinkHistoryRef.current.length > 60) blinkHistoryRef.current.shift();
  }, [blinkRate]);

  const drawPulseGraph = useCallback(() => {
    const canvas = pulseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    // Data
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const buffer = pulseBuffer;
    const step = canvas.width / buffer.length;
    const validValues = buffer.filter(v => v > 0);
    let min = validValues.length ? Math.min(...validValues) : 0;
    let max = Math.max(...buffer);
    if (min === max) { min = 0; max = 1023; }
    const range = max - min || 1;

    for (let i = 0; i < buffer.length; i++) {
      const val = buffer[i];
      const x = i * step;
      const normalized = (val - min) / range;
      const y = canvas.height - (normalized * (canvas.height - 20)) - 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [pulseBuffer]);

  // Draw blink chart
  const drawBlinkChart = useCallback(() => {
    const canvas = blinkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 180;
    const h = 56;
    canvas.width = w * (window.devicePixelRatio || 1);
    canvas.height = h * (window.devicePixelRatio || 1);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, w, h);

    const data = blinkHistoryRef.current.slice(-60);
    if (data.length === 0) return;
    const maxVal = Math.max(1, ...data);
    const stepX = w / Math.max(1, data.length - 1);

    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * stepX;
      const y = h - (v / maxVal) * (h - 6) - 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px Arial';
    ctx.fillText(`${data[data.length - 1].toFixed(1)} b/s`, 6, 12);
  }, []);

  useEffect(() => {
    drawPulseGraph();
  }, [pulseBuffer, drawPulseGraph]);

  useEffect(() => {
    drawBlinkChart();
  }, [blinkRate, drawBlinkChart]);

  return (
    <aside className="cyber-panel w-[380px] flex-shrink-0 flex flex-col gap-6 p-6">
      <div className="border-b border-primary/30 pb-2 mb-2">
        <h2 className="font-heading text-sm text-muted-foreground tracking-wider">SENSOR STREAMS</h2>
      </div>

      {/* Pulse Rate */}
      <div>
        <h3 className="text-xs text-primary mb-2">BIOMETRICS: PULSE RATE</h3>
        <div className="relative w-full h-[180px] bg-black border border-border rounded overflow-hidden">
          <canvas ref={pulseCanvasRef} className="w-full h-full block" />
          <div className="absolute top-2.5 right-2.5 flex flex-col items-end z-20">
            <span className="font-heading text-2xl font-bold text-primary text-glow-primary">{bpm || '--'}</span>
            <span className="text-[0.7rem] text-muted-foreground">BPM</span>
          </div>
        </div>
      </div>

      {/* Eye Tracking */}
      <div>
        <h3 className="text-xs text-primary mb-2">OPTICAL: EYE TRACKING</h3>
        <div className="relative w-full h-[180px] bg-black border border-border rounded overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale contrast-[1.2]"
          />
          <canvas
            ref={trackingCanvasRef}
            className="absolute inset-0 w-full h-full z-10"
          />
          <div className="crosshair" />
          <div className="absolute bottom-2.5 right-2.5 flex items-end z-20 gap-3">
            <div className="flex flex-col items-end">
              <span className="font-heading text-lg font-bold text-primary text-glow-primary">{saccadeRate}</span>
              <span className="text-[0.7rem] text-muted-foreground">Saccades/sec</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-heading text-lg font-bold text-primary text-glow-primary">{blinkRate.toFixed(1)}</span>
              <span className="text-[0.7rem] text-muted-foreground">Blinks/sec</span>
            </div>
          </div>
        </div>
        <canvas ref={blinkCanvasRef} className="block mt-2" style={{ width: 180, height: 56 }} />
      </div>
    </aside>
  );
};

export default SensorPanel;
