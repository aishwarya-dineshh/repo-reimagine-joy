import React from 'react';
import { EyeFeatures, FEATURE_WEIGHTS, computeGuiltScore } from '../lib/eye-tracker';

interface EyeFeaturesPanelProps {
  features: EyeFeatures;
  isActive: boolean;
}

const featureLabels: Record<keyof EyeFeatures, { label: string; unit: string; max: number }> = {
  blinkRate: { label: 'BLINK RATE', unit: '/sec', max: 3 },
  blinkDuration: { label: 'BLINK DURATION', unit: 'ms', max: 500 },
  pupilDilation: { label: 'PUPIL DILATION', unit: '', max: 1 },
  gazeDeviation: { label: 'GAZE DEVIATION', unit: '', max: 0.1 },
  microsaccades: { label: 'MICROSACCADES', unit: '/sec', max: 10 },
  fixationTime: { label: 'FIXATION TIME', unit: '', max: 1 },
};

const EyeFeaturesPanel: React.FC<EyeFeaturesPanelProps> = ({ features, isActive }) => {
  const guiltScore = computeGuiltScore(features);

  const getBarColor = (value: number, max: number, key: keyof EyeFeatures) => {
    const ratio = Math.min(value / max, 1);
    // fixation: high = good (green), low = bad (red) — inverted
    if (key === 'fixationTime') {
      return ratio > 0.6 ? 'hsl(120, 100%, 50%)' : ratio > 0.3 ? 'hsl(54, 100%, 61%)' : 'hsl(0, 80%, 55%)';
    }
    // Others: high = bad (red)
    return ratio < 0.33 ? 'hsl(120, 100%, 50%)' : ratio < 0.66 ? 'hsl(54, 100%, 61%)' : 'hsl(0, 80%, 55%)';
  };

  const guiltColor = guiltScore > 70 ? 'text-destructive' : guiltScore > 40 ? 'text-neon-yellow' : 'text-neon-green';

  return (
    <div className="cyber-panel p-4 space-y-3">
      <div className="border-b border-primary/30 pb-2 mb-2 flex items-center justify-between">
        <h2 className="font-heading text-xs text-muted-foreground tracking-wider">EYE ANALYSIS</h2>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'dot-green' : 'dot-red'}`} />
          <span className="text-[0.65rem] text-muted-foreground">{isActive ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Feature bars */}
      {(Object.keys(featureLabels) as (keyof EyeFeatures)[]).map((key) => {
        const { label, unit, max } = featureLabels[key];
        const value = features[key];
        const barWidth = Math.min((value / max) * 100, 100);
        const weight = FEATURE_WEIGHTS[key];

        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[0.6rem] text-muted-foreground tracking-wider">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[0.55rem] text-muted-foreground/60">w:{(weight * 100).toFixed(0)}%</span>
                <span className="font-heading text-xs text-primary">
                  {typeof value === 'number' ? value.toFixed(2) : '0'}{unit}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: getBarColor(value, max, key),
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Guilt Score */}
      <div className="mt-4 pt-3 border-t border-primary/20">
        <div className="flex justify-between items-center">
          <span className="font-heading text-xs text-muted-foreground tracking-wider">GUILT PROBABILITY</span>
          <span className={`font-heading text-lg font-bold ${guiltColor}`}>
            {guiltScore.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full stress-gradient rounded-full transition-all duration-500"
            style={{ width: `${guiltScore}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default EyeFeaturesPanel;
