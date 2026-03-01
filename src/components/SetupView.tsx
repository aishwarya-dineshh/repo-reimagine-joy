import React from 'react';

interface SetupViewProps {
  subjectName: string;
  setSubjectName: (v: string) => void;
  crimeDetails: string;
  setCrimeDetails: (v: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (v: string) => void;
  hardwareConnected: boolean;
  onConnectHardware: () => void;
  onStartCalibration: () => void;
  canStartCalibration: boolean;
}

const SetupView: React.FC<SetupViewProps> = ({
  subjectName, setSubjectName, crimeDetails, setCrimeDetails,
  geminiApiKey, setGeminiApiKey, hardwareConnected, onConnectHardware,
  onStartCalibration, canStartCalibration
}) => {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-6">
        <label className="block text-primary text-xs mb-2 tracking-wider">SUBJECT NAME</label>
        <input
          type="text"
          value={subjectName}
          onChange={e => setSubjectName(e.target.value)}
          placeholder="Enter subject name..."
          className="w-full bg-secondary/50 border border-border text-foreground px-4 py-3 font-body text-sm rounded outline-none focus:border-primary focus:shadow-[0_0_15px_hsl(185_100%_50%/0.2)] transition-all"
        />
      </div>

      <div className="mb-6">
        <label className="block text-primary text-xs mb-2 tracking-wider">INCIDENT DETAILS (For AI Context)</label>
        <textarea
          value={crimeDetails}
          onChange={e => setCrimeDetails(e.target.value)}
          rows={4}
          placeholder="Describe the main incident or crime..."
          className="w-full bg-secondary/50 border border-border text-foreground px-4 py-3 font-body text-sm rounded outline-none resize-y min-h-[100px] focus:border-primary focus:shadow-[0_0_15px_hsl(185_100%_50%/0.2)] transition-all"
        />
      </div>

      <div className="mb-6">
        <label className="block text-primary text-xs mb-2 tracking-wider">Gemini API Key (optional)</label>
        <input
          type="text"
          value={geminiApiKey}
          onChange={e => setGeminiApiKey(e.target.value)}
          placeholder="Enter Gemini API key"
          className="w-full bg-secondary/50 border border-border text-foreground px-4 py-3 font-body text-sm rounded outline-none focus:border-primary focus:shadow-[0_0_15px_hsl(185_100%_50%/0.2)] transition-all"
        />
      </div>

      <div className="mt-auto pt-8 flex gap-4">
        <button
          onClick={onConnectHardware}
          className={`cyber-btn font-heading text-sm tracking-wider border px-6 py-3 rounded-sm uppercase font-bold transition-all ${
            hardwareConnected
              ? 'border-primary text-primary bg-primary/10'
              : 'border-primary text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_hsl(185_100%_50%/0.4)]'
          }`}
        >
          {hardwareConnected ? '[CONNECTED]' : '[+] CONNECT COM PORT'}
        </button>
        <button
          onClick={onStartCalibration}
          disabled={!canStartCalibration}
          className="cyber-btn font-heading text-sm tracking-wider border border-primary text-primary bg-primary/10 px-6 py-3 rounded-sm uppercase font-bold transition-all hover:shadow-[0_0_15px_hsl(185_100%_50%/0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:border-muted-foreground disabled:text-muted-foreground"
        >
          INITIALIZE CALIBRATION <span className="ml-1">&gt;&gt;</span>
        </button>
      </div>
    </div>
  );
};

export default SetupView;
