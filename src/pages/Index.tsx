import React, { useState, useRef, useCallback, useEffect } from 'react';
import CyberHeader from '../components/CyberHeader';
import SensorPanel from '../components/SensorPanel';
import SetupView from '../components/SetupView';
import CalibrationView from '../components/CalibrationView';
import AnalysisView from '../components/AnalysisView';
import ResultsView from '../components/ResultsView';
import EyeFeaturesPanel from '../components/EyeFeaturesPanel';
import { serialManager } from '../lib/serial-manager';
import { aiEngine } from '../lib/ai-engine';
import { geminiAgent } from '../lib/gemini-api';
import { EyeTracker, type EyeFeatures } from '../lib/eye-tracker';

type Phase = 'setup' | 'calibration' | 'analysis' | 'results';

const Index = () => {
  const [phase, setPhase] = useState<Phase>('setup');

  // Status indicators
  const [hardwareStatus, setHardwareStatus] = useState<'red' | 'green' | 'yellow'>('red');
  const [cameraStatus, setCameraStatus] = useState<'red' | 'green' | 'yellow'>('red');
  const [aiStatus, setAiStatus] = useState<'red' | 'green' | 'yellow'>('yellow');

  // Setup form
  const [subjectName, setSubjectName] = useState('');
  const [crimeDetails, setCrimeDetails] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Sensor data
  const [pulseBuffer, setPulseBuffer] = useState<number[]>(new Array(100).fill(0));
  const [bpm, setBpm] = useState(0);
  const [saccadeRate, setSaccadeRate] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0);

  // Calibration
  const [calibrationIndex, setCalibrationIndex] = useState(0);
  const [calibrationQuestion, setCalibrationQuestion] = useState('establishing baseline...');
  const [calibrationComplete, setCalibrationComplete] = useState(false);

  // Analysis
  const [analysisQuestion, setAnalysisQuestion] = useState('');
  const [stressLevel, setStressLevel] = useState(0);
  const [eyeShiftStatus, setEyeShiftStatus] = useState('NORMAL');
  const [eyeShiftColor, setEyeShiftColor] = useState<'primary' | 'destructive'>('primary');
  const [pulseStatus, setPulseStatus] = useState('STABLE');
  const [pulseColor, setPulseColor] = useState<'primary' | 'destructive'>('primary');

  // Results
  const [resultData, setResultData] = useState<{ probability: string; reasons: string[] }>({ probability: '0', reasons: [] });

  // Eye features
  const [eyeFeatures, setEyeFeatures] = useState<EyeFeatures>({
    blinkRate: 0, blinkDuration: 0,
    gazeDeviation: 0, microsaccades: 0, fixationTime: 0,
  });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackingCanvasRef = useRef<HTMLCanvasElement>(null);
  const eyeTrackerRef = useRef<EyeTracker | null>(null);
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisIndexRef = useRef(0);
  const lastQuestionRef = useRef('');

  // Eye tracking polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (eyeTrackerRef.current) {
        setSaccadeRate(eyeTrackerRef.current.saccadesPerSec);
        setBlinkRate(eyeTrackerRef.current.blinksPerSec);
        setEyeFeatures({ ...eyeTrackerRef.current.features });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Serial callbacks
  useEffect(() => {
    serialManager.onConnect(() => {
      setHardwareStatus('green');
    });
    serialManager.onDisconnect(() => {
      setHardwareStatus('red');
    });
    serialManager.onData((newBpm, buffer) => {
      setBpm(newBpm);
      setPulseBuffer([...buffer]);
    });
    return () => { serialManager.destroy(); };
  }, []);

  const hardwareConnected = hardwareStatus === 'green';
  const canStartCalibration = subjectName.trim() !== '' && crimeDetails.trim() !== '';

  const handleConnectHardware = useCallback(async () => {
    if (serialManager.connected) return;
    try {
      if ((navigator as any).serial) {
        const success = await serialManager.connect();
        if (!success) serialManager.testConnection();
      } else {
        serialManager.testConnection();
      }
    } catch {
      serialManager.testConnection();
    }
  }, []);

  const handleStartCalibration = useCallback(async () => {
    // Initialize Gemini
    if (geminiApiKey.trim()) {
      geminiAgent.setApiKey(geminiApiKey.trim());
    }

    await aiEngine.setContext(crimeDetails, subjectName);

    setPhase('calibration');
    setAiStatus('green');
    setCalibrationIndex(0);
    setCalibrationComplete(false);

    const q = aiEngine.getQuestion(true, 0) || 'What is your full name?';
    setCalibrationQuestion(q);

    // Start camera
    if (!eyeTrackerRef.current && videoRef.current && trackingCanvasRef.current) {
      eyeTrackerRef.current = new EyeTracker(videoRef.current, trackingCanvasRef.current);
      try {
        const success = await eyeTrackerRef.current.start();
        setCameraStatus(success ? 'green' : 'yellow');
      } catch {
        setCameraStatus('yellow');
      }
    }
  }, [geminiApiKey, crimeDetails, subjectName]);

  const handleNextCalibration = useCallback(() => {
    const newIndex = calibrationIndex + 1;
    setCalibrationIndex(newIndex);

    aiEngine.calibrateBaseline(
      serialManager.pulseBuffer,
      serialManager.currentBpm,
      eyeTrackerRef.current?.saccadesPerSec || 0,
      eyeTrackerRef.current?.blinksPerSec || 0
    );

    const total = aiEngine.baseQuestions.length;
    if (newIndex >= total) {
      setCalibrationComplete(true);
      setCalibrationQuestion("BASELINE ESTABLISHED. READY FOR INVESTIGATION.");
    } else {
      const q = aiEngine.getQuestion(true, newIndex) || 'Calibrating...';
      setCalibrationQuestion(q);
    }
  }, [calibrationIndex]);

  const handleBeginAnalysis = useCallback(async () => {
    await aiEngine.setContext(crimeDetails, subjectName);

    if (!aiEngine.investigationQuestions?.length) {
      aiEngine.generateContextualQuestions(crimeDetails);
    }

    setPhase('analysis');
    analysisIndexRef.current = 0;

    const firstQ = aiEngine.getQuestion(false, 0) || "No questions available.";
    lastQuestionRef.current = firstQ;
    setAnalysisQuestion(firstQ);

    // Start analysis loop
    analysisIntervalRef.current = setInterval(() => {
      const saccades = eyeTrackerRef.current?.saccadesPerSec || 0;
      const blinks = eyeTrackerRef.current?.blinksPerSec || 0;
      const currentBpm = serialManager.currentBpm;

      const stress = aiEngine.analyzeRealTime(currentBpm, saccades, blinks);
      setStressLevel(stress);

      if (saccades > 3) {
        setEyeShiftStatus('ERRATIC');
        setEyeShiftColor('destructive');
      } else {
        setEyeShiftStatus('NORMAL');
        setEyeShiftColor('primary');
      }

      const diff = currentBpm - aiEngine.avgBaselinePulse;
      if (diff > 15) {
        setPulseStatus('PEAK');
        setPulseColor('destructive');
      } else {
        setPulseStatus('STABLE');
        setPulseColor('primary');
      }
    }, 1000);
  }, [crimeDetails, subjectName]);

  const handleNextAnalysisQuestion = useCallback(() => {
    analysisIndexRef.current++;
    const nextQ = aiEngine.getQuestion(false, analysisIndexRef.current) || "(no further questions available)";
    lastQuestionRef.current = nextQ;
    setAnalysisQuestion(nextQ);
  }, []);

  const handleEndAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    const data = aiEngine.calculateFinalProbability();
    setResultData(data);
    setPhase('results');
    setAiStatus('yellow');
  }, []);

  const handleReset = useCallback(() => {
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    eyeTrackerRef.current?.stop();
    eyeTrackerRef.current = null;
    aiEngine.reset();

    setPhase('setup');
    setSubjectName('');
    setCrimeDetails('');
    setGeminiApiKey('');
    setCalibrationIndex(0);
    setCalibrationComplete(false);
    setStressLevel(0);
    setCameraStatus('red');
    setAiStatus('yellow');
    setResultData({ probability: '0', reasons: [] });
  }, []);

  const calibrationProgress = (calibrationIndex / aiEngine.baseQuestions.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-radial-dark">
      <div className="fixed inset-0 bg-grid pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <CyberHeader
          hardwareStatus={hardwareStatus}
          cameraStatus={cameraStatus}
          aiStatus={aiStatus}
        />

        <main className="flex-1 p-8 flex justify-center overflow-auto">
          <div className="flex gap-8 w-full max-w-[1600px]">
            <div className="w-[380px] flex-shrink-0 flex flex-col gap-4">
              <SensorPanel
                pulseBuffer={pulseBuffer}
                bpm={bpm}
                saccadeRate={saccadeRate}
                blinkRate={blinkRate}
                videoRef={videoRef}
                trackingCanvasRef={trackingCanvasRef}
              />
              <EyeFeaturesPanel
                features={eyeFeatures}
                isActive={cameraStatus === 'green'}
              />
            </div>

            <section className="cyber-panel flex-1 flex flex-col p-6">
              <div className="border-b border-primary/30 pb-2 mb-4">
                <h2 className="font-heading text-sm text-muted-foreground tracking-wider">INVESTIGATION CONSOLE</h2>
              </div>

              {phase === 'setup' && (
                <SetupView
                  subjectName={subjectName}
                  setSubjectName={setSubjectName}
                  crimeDetails={crimeDetails}
                  setCrimeDetails={setCrimeDetails}
                  geminiApiKey={geminiApiKey}
                  setGeminiApiKey={setGeminiApiKey}
                  hardwareConnected={hardwareConnected}
                  onConnectHardware={handleConnectHardware}
                  onStartCalibration={handleStartCalibration}
                  canStartCalibration={canStartCalibration}
                />
              )}

              {phase === 'calibration' && (
                <CalibrationView
                  currentQuestion={calibrationQuestion}
                  progress={calibrationProgress}
                  isComplete={calibrationComplete}
                  onNextQuestion={handleNextCalibration}
                  onBeginAnalysis={handleBeginAnalysis}
                />
              )}

              {phase === 'analysis' && (
                <AnalysisView
                  currentQuestion={analysisQuestion}
                  stressLevel={stressLevel}
                  eyeShiftStatus={eyeShiftStatus}
                  eyeShiftColor={eyeShiftColor}
                  pulseStatus={pulseStatus}
                  pulseColor={pulseColor}
                  onNextQuestion={handleNextAnalysisQuestion}
                  onEndAnalysis={handleEndAnalysis}
                />
              )}

              {phase === 'results' && (
                <ResultsView
                  probability={resultData.probability}
                  reasons={resultData.reasons}
                  onReset={handleReset}
                />
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
