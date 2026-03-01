import React from 'react';

interface StatusDotProps {
  status: 'red' | 'green' | 'yellow';
}

const StatusDot: React.FC<StatusDotProps> = ({ status }) => {
  const cls = status === 'red' ? 'dot-red' : status === 'green' ? 'dot-green' : 'dot-yellow';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
};

interface HeaderProps {
  hardwareStatus: 'red' | 'green' | 'yellow';
  cameraStatus: 'red' | 'green' | 'yellow';
  aiStatus: 'red' | 'green' | 'yellow';
}

const CyberHeader: React.FC<HeaderProps> = ({ hardwareStatus, cameraStatus, aiStatus }) => {
  return (
    <header className="flex justify-between items-center px-8 py-4 border-b border-border bg-gradient-to-b from-secondary to-transparent shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <h1 className="font-heading text-primary text-2xl tracking-widest text-glow-primary flex items-center gap-2.5">
        POLYGRAPH.AI
        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold">PRO</span>
      </h1>
      <div className="flex gap-5">
        <span className="flex items-center gap-2 text-xs text-muted-foreground font-bold tracking-wider">
          <StatusDot status={hardwareStatus} /> HARDWARE
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground font-bold tracking-wider">
          <StatusDot status={cameraStatus} /> CAMERA
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground font-bold tracking-wider">
          <StatusDot status={aiStatus} /> AI ENGINE
        </span>
      </div>
    </header>
  );
};

export default CyberHeader;
