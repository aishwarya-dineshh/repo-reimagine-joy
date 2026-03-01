import React from 'react';

interface CalibrationViewProps {
  currentQuestion: string;
  progress: number;
  isComplete: boolean;
  onNextQuestion: () => void;
  onBeginAnalysis: () => void;
}

const CalibrationView: React.FC<CalibrationViewProps> = ({
  currentQuestion, progress, isComplete, onNextQuestion, onBeginAnalysis
}) => {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="bg-secondary/60 border-l-4 border-primary p-8 mb-8 rounded-r-lg min-h-[150px] flex flex-col justify-center">
        <p className="text-muted-foreground text-xs tracking-[2px] mb-4">AI SYSTEM CALIBRATING BASELINE PARAMETERS...</p>
        <p className="text-xl font-light leading-relaxed text-foreground">{currentQuestion}</p>
      </div>

      <div className="mb-8">
        <div className="h-1 bg-primary/20 rounded mb-2 overflow-hidden">
          <div
            className="h-full bg-primary shadow-[0_0_10px_hsl(185_100%_50%/0.4)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
      </div>

      <div className="mt-auto pt-8 flex justify-center gap-4">
        {!isComplete && (
          <button
            onClick={onNextQuestion}
            className="cyber-btn font-heading text-sm tracking-wider border border-primary text-primary bg-primary/10 px-6 py-3 rounded-sm uppercase font-bold transition-all hover:shadow-[0_0_15px_hsl(185_100%_50%/0.4)]"
          >
            NEXT BASE QUESTION
          </button>
        )}
        {isComplete && (
          <button
            onClick={onBeginAnalysis}
            className="cyber-btn font-heading text-sm tracking-wider border border-destructive text-destructive px-6 py-3 rounded-sm uppercase font-bold transition-all hover:bg-destructive/10 hover:shadow-[0_0_15px_hsl(0_80%_55%/0.4)]"
          >
            START REAL-TIME ANALYSIS
          </button>
        )}
      </div>
    </div>
  );
};

export default CalibrationView;
