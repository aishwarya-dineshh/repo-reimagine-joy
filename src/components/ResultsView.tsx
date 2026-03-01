import React, { useEffect, useState } from 'react';

interface ResultsViewProps {
  probability: string;
  reasons: string[];
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ probability, reasons, onReset }) => {
  const [displayProb, setDisplayProb] = useState(0);
  const targetProb = parseFloat(probability);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += targetProb / 40;
      if (current >= targetProb) {
        current = targetProb;
        clearInterval(interval);
      }
      setDisplayProb(current);
    }, 50);
    return () => clearInterval(interval);
  }, [targetProb]);

  const circleColor = targetProb > 70
    ? 'hsl(0, 80%, 55%)'
    : targetProb > 40
    ? 'hsl(54, 100%, 61%)'
    : 'hsl(120, 100%, 50%)';

  return (
    <div className="flex flex-col items-center h-full animate-fade-in gap-8">
      <h2 className="font-heading text-foreground tracking-widest text-lg">DECEPTION PROBABILITY</h2>

      <div className="relative w-[200px] h-[200px]">
        <svg viewBox="0 0 36 36" className="block mx-auto max-w-full max-h-[250px]">
          <path
            className="circle-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="circle-progress"
            style={{
              strokeDasharray: `${targetProb}, 100`,
              stroke: circleColor
            }}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-heading text-5xl font-bold text-foreground" style={{ textShadow: '0 0 15px rgba(255,255,255,0.3)' }}>
          {displayProb.toFixed(1)}%
        </div>
      </div>

      <div className="w-full bg-black/30 border border-border p-6 rounded-lg">
        <h3 className="text-primary text-sm mb-4 border-b border-primary/20 pb-2">ANALYSIS RATIONALE</h3>
        <ul className="list-none">
          {reasons.map((r, i) => (
            <li key={i} className="py-3 border-b border-foreground/10 border-dashed flex items-start gap-2.5">
              <span className="text-primary font-heading">&gt;</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-8 flex justify-center">
        <button
          onClick={onReset}
          className="cyber-btn font-heading text-sm tracking-wider border border-primary text-primary px-6 py-3 rounded-sm uppercase font-bold transition-all hover:bg-primary/10 hover:shadow-[0_0_15px_hsl(185_100%_50%/0.4)]"
        >
          NEW SESSION
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
