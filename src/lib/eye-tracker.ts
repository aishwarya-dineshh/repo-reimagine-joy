// eye-tracker.ts - Webcam and MediaPipe Face Tracking with Advanced Eye Feature Extraction
// Computes: Blink Rate, Blink Duration, Pupil Dilation, Gaze Deviation, Microsaccades, Fixation Time

declare const FaceMesh: any;
declare const Camera: any;
declare const drawConnectors: any;
declare const FACEMESH_TESSELATION: any;
declare const FACEMESH_RIGHT_EYE: any;
declare const FACEMESH_RIGHT_IRIS: any;
declare const FACEMESH_LEFT_EYE: any;
declare const FACEMESH_LEFT_IRIS: any;

export interface EyeFeatures {
  blinkRate: number;       // blinks per second
  blinkDuration: number;   // average blink duration in ms
  pupilDilation: number;   // normalized iris diameter (0-1)
  gazeDeviation: number;   // horizontal gaze std deviation (0-1)
  microsaccades: number;   // rapid small eye shifts per second
  fixationTime: number;    // proportion of time eyes are stable (0-1)
}

// Weights matching the Python code
export const FEATURE_WEIGHTS = {
  blinkRate: 0.20,
  blinkDuration: 0.15,
  pupilDilation: 0.25,
  gazeDeviation: 0.15,
  microsaccades: 0.15,
  fixationTime: 0.10,
};

export function computeGuiltScore(features: EyeFeatures): number {
  // Normalize each feature to 0-1 range and apply weights
  const normalized = {
    blinkRate: Math.min(Math.max(features.blinkRate / 3, 0), 1),         // 3 blinks/sec = max
    blinkDuration: Math.min(Math.max(features.blinkDuration / 500, 0), 1), // 500ms = max
    pupilDilation: Math.min(Math.max(features.pupilDilation, 0), 1),
    gazeDeviation: Math.min(Math.max(features.gazeDeviation * 10, 0), 1),
    microsaccades: Math.min(Math.max(features.microsaccades / 10, 0), 1),  // 10/sec = max
    fixationTime: 1 - Math.min(Math.max(features.fixationTime, 0), 1),    // inverted: less fixation = more deception
  };

  let score = 0;
  for (const key of Object.keys(FEATURE_WEIGHTS) as (keyof typeof FEATURE_WEIGHTS)[]) {
    score += FEATURE_WEIGHTS[key] * normalized[key];
  }

  return Math.round(score * 10000) / 100; // percentage with 2 decimals
}

export class EyeTracker {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Basic metrics (kept for backward compat)
  saccadesPerSec = 0;
  blinksPerSec = 0;

  // Advanced features
  features: EyeFeatures = {
    blinkRate: 0,
    blinkDuration: 0,
    pupilDilation: 0,
    gazeDeviation: 0,
    microsaccades: 0,
    fixationTime: 0,
  };

  // Internal tracking state
  private lastEyeX = 0;
  private lastEyeY = 0;
  private saccadeCount = 0;
  private blinkCount = 0;
  private lastBlinkState = false;
  private blinkThreshold = 0.35;
  trackingActive = false;

  // Blink duration tracking
  private blinkStartTime = 0;
  private blinkDurations: number[] = [];

  // Pupil dilation tracking (iris size relative to eye width)
  private pupilSizes: number[] = [];

  // Gaze positions for deviation & microsaccade & fixation
  private gazeXHistory: number[] = [];
  private gazeYHistory: number[] = [];

  // Microsaccade detection
  private microSaccadeCount = 0;
  private lastGazeX = 0;
  private lastGazeY = 0;

  // Fixation detection
  private fixationFrames = 0;
  private totalFrames = 0;
  private readonly fixationThreshold = 0.005; // normalized movement threshold

  // Timing
  private startTime = Date.now();

  private faceMesh: any;
  private intervalId: ReturnType<typeof setInterval>;

  constructor(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    try {
      this.faceMesh = new FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults(this.onResults.bind(this));
    } catch (e) {
      console.warn('MediaPipe FaceMesh not available:', e);
    }

    // Every second: compute per-second metrics
    this.intervalId = setInterval(() => {
      this.saccadesPerSec = this.saccadeCount;
      this.blinksPerSec = this.blinkCount;

      const elapsedSec = (Date.now() - this.startTime) / 1000 || 1;

      // 1. Blink Rate (blinks per second, rolling)
      this.features.blinkRate = this.blinkCount;

      // 2. Blink Duration (average ms)
      if (this.blinkDurations.length > 0) {
        this.features.blinkDuration = this.blinkDurations.reduce((a, b) => a + b, 0) / this.blinkDurations.length;
      }

      // 3. Pupil Dilation (average normalized iris size)
      if (this.pupilSizes.length > 0) {
        const recent = this.pupilSizes.slice(-30); // last 30 samples
        this.features.pupilDilation = recent.reduce((a, b) => a + b, 0) / recent.length;
      }

      // 4. Gaze Deviation (std of horizontal gaze positions)
      if (this.gazeXHistory.length > 2) {
        const recent = this.gazeXHistory.slice(-60);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length;
        this.features.gazeDeviation = Math.sqrt(variance);
      }

      // 5. Microsaccades per second
      this.features.microsaccades = this.microSaccadeCount;

      // 6. Fixation Time (proportion of frames with low movement)
      if (this.totalFrames > 0) {
        this.features.fixationTime = this.fixationFrames / this.totalFrames;
      }

      // Reset per-second counters
      this.saccadeCount = 0;
      this.blinkCount = 0;
      this.microSaccadeCount = 0;
      this.fixationFrames = 0;
      this.totalFrames = 0;
    }, 1000);
  }

  async start(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    this.startTime = Date.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      this.video.srcObject = stream;

      this.video.onloadeddata = () => {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        if (typeof Camera !== 'undefined' && this.faceMesh) {
          const camera = new Camera(this.video, {
            onFrame: async () => {
              if (this.trackingActive) {
                await this.faceMesh.send({ image: this.video });
              }
            },
            width: 640,
            height: 480
          });
          camera.start();
        }
        this.trackingActive = true;
      };
      return true;
    } catch (err) {
      console.error("Error accessing webcam:", err);
      return false;
    }
  }

  stop() {
    this.trackingActive = false;
    if (this.video.srcObject) {
      (this.video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    clearInterval(this.intervalId);
  }

  private onResults(results: any) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (results.multiFaceLandmarks?.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Draw face mesh
      if (typeof drawConnectors !== 'undefined') {
        drawConnectors(this.ctx, landmarks, FACEMESH_TESSELATION, { color: '#00f3ff22', lineWidth: 0.5 });
        drawConnectors(this.ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#ff2a2a' });
        drawConnectors(this.ctx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#ff2a2a' });
        drawConnectors(this.ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#00f3ff' });
        drawConnectors(this.ctx, landmarks, FACEMESH_LEFT_IRIS, { color: '#00f3ff' });
      }

      this.totalFrames++;

      // === GAZE TRACKING (Iris landmarks 468-472 left, 473-477 right) ===
      if (landmarks[468] && landmarks[473]) {
        const leftIrisX = landmarks[468].x;
        const leftIrisY = landmarks[468].y;
        const rightIrisX = landmarks[473].x;
        const rightIrisY = landmarks[473].y;

        // Average gaze position
        const gazeX = (leftIrisX + rightIrisX) / 2;
        const gazeY = (leftIrisY + rightIrisY) / 2;

        this.gazeXHistory.push(gazeX);
        this.gazeYHistory.push(gazeY);
        // Keep history manageable
        if (this.gazeXHistory.length > 300) this.gazeXHistory.shift();
        if (this.gazeYHistory.length > 300) this.gazeYHistory.shift();

        // Saccade detection (large movement)
        const movement = Math.hypot(gazeX - this.lastEyeX, gazeY - this.lastEyeY);
        if (movement > 0.01) {
          this.saccadeCount++;
          this.ctx.fillStyle = 'rgba(255, 42, 42, 0.15)';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Microsaccade detection (small rapid shifts 0.003 < m < 0.01)
        if (movement > 0.003 && movement < 0.01) {
          this.microSaccadeCount++;
        }

        // Fixation detection (very low movement)
        if (movement < this.fixationThreshold) {
          this.fixationFrames++;
        }

        this.lastEyeX = gazeX;
        this.lastEyeY = gazeY;
      }

      // === PUPIL DILATION (iris size relative to eye width) ===
      try {
        // Left iris diameter: landmarks 469 (right) and 471 (left) of left iris
        if (landmarks[469] && landmarks[471] && landmarks[33] && landmarks[133]) {
          const irisDiameter = Math.hypot(
            (landmarks[469].x - landmarks[471].x) * this.canvas.width,
            (landmarks[469].y - landmarks[471].y) * this.canvas.height
          );
          const eyeWidth = Math.hypot(
            (landmarks[33].x - landmarks[133].x) * this.canvas.width,
            (landmarks[33].y - landmarks[133].y) * this.canvas.height
          ) || 1;

          const normalizedPupil = irisDiameter / eyeWidth;
          this.pupilSizes.push(normalizedPupil);
          if (this.pupilSizes.length > 300) this.pupilSizes.shift();
        }
      } catch {
        // ignore
      }

      // === BLINK DETECTION ===
      const dist = (a: any, b: any) =>
        Math.hypot((a.x - b.x) * this.canvas.width, (a.y - b.y) * this.canvas.height);

      try {
        const leftV = dist(landmarks[159], landmarks[145]);
        const leftH = dist(landmarks[33], landmarks[133]) || 1;
        const leftRatio = leftV / leftH;

        const rightV = dist(landmarks[386], landmarks[374]);
        const rightH = dist(landmarks[362], landmarks[263]) || 1;
        const rightRatio = rightV / rightH;

        const isBlinking = leftRatio < this.blinkThreshold || rightRatio < this.blinkThreshold;

        if (isBlinking && !this.lastBlinkState) {
          // Blink started
          this.blinkCount++;
          this.blinkStartTime = Date.now();
        } else if (!isBlinking && this.lastBlinkState && this.blinkStartTime > 0) {
          // Blink ended — record duration
          const duration = Date.now() - this.blinkStartTime;
          if (duration > 20 && duration < 1000) { // reasonable blink duration
            this.blinkDurations.push(duration);
            if (this.blinkDurations.length > 100) this.blinkDurations.shift();
          }
          this.blinkStartTime = 0;
        }

        this.lastBlinkState = isBlinking;
      } catch {
        // ignore landmark access errors
      }
    }
  }
}
