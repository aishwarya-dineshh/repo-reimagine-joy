import React from 'react';

interface AnalysisViewProps {
  currentQuestion: string;
  answerValue: string;
  setAnswerValue: (v: string) => void;
  stressLevel: number;
  eyeShiftStatus: string;
  eyeShiftColor: 'primary' | 'destructive';
  pulseStatus: string;
  pulseColor: 'primary' | 'destructive';
  onNextQuestion: () => void;
  onEndAnalysis: () => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({
  currentQuestion, answerValue, setAnswerValue, stressLevel,
  eyeShiftStatus, eyeShiftColor, pulseStatus, pulseColor,
  onNextQuestion, onEndAnalysis
}) => {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="bg-secondary/60 border-l-4 border-destructive p-8 mb-8 rounded-r-lg min-h-[150px] flex flex-col justify-center animate-pulse-border">
        <p className="text-muted-foreground text-xs tracking-[2px] mb-4">ACTIVE INTERROGATION</p>
        <p className="text-xl font-light leading-relaxed text-foreground mb-4">{currentQuestion}</p>
        <textarea
          value={answerValue}
          onChange={e => setAnswerValue(e.target.value)}
          rows={2}
          placeholder="Type subject's response here..."
          className="w-full mt-2 p-2 bg-black/70 border border-border text-foreground resize-y font-body text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-black/30 border border-border p-4 rounded text-center">
          <h4 className="text-[0.7rem] text-muted-foreground mb-3 tracking-wider">STRESS LEVEL</h4>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden relative">
            <div
              className="h-full stress-gradient transition-[width] duration-300"
              style={{ width: `${stressLevel}%` }}
            />
          </div>
        </div>
        <div className="bg-black/30 border border-border p-4 rounded text-center">
          <h4 className="text-[0.7rem] text-muted-foreground mb-3 tracking-wider">EYE SHIFTS</h4>
          <span className={`font-heading text-lg ${eyeShiftColor === 'destructive' ? 'text-destructive' : 'text-primary'}`}>
            {eyeShiftStatus}
          </span>
        </div>
        <div className="bg-black/30 border border-border p-4 rounded text-center">
          <h4 className="text-[0.7rem] text-muted-foreground mb-3 tracking-wider">PULSE VARIABILITY</h4>
          <span className={`font-heading text-lg ${pulseColor === 'destructive' ? 'text-destructive' : 'text-primary'}`}>
            {pulseStatus}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-8 flex justify-center gap-4">
        <button
          onClick={onNextQuestion}
          className="cyber-btn font-heading text-sm tracking-wider border border-primary text-primary bg-primary/10 px-6 py-3 rounded-sm uppercase font-bold transition-all hover:shadow-[0_0_15px_hsl(185_100%_50%/0.4)]"
        >
          NEXT QUESTION
        </button>
        <button
          onClick={onEndAnalysis}
          className="cyber-btn font-heading text-sm tracking-wider border border-destructive text-destructive px-6 py-3 rounded-sm uppercase font-bold transition-all hover:bg-destructive/10 hover:shadow-[0_0_15px_hsl(0_80%_55%/0.4)]"
        >
          [ END ANALYSIS ]
        </button>
      </div>
    </div>
  );
};

export default AnalysisView;
