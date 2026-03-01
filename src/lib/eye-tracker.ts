// eye-tracker.ts - Webcam and MediaPipe Face Tracking
// Note: MediaPipe is loaded via CDN in index.html

declare const FaceMesh: any;
declare const Camera: any;
declare const drawConnectors: any;
declare const FACEMESH_TESSELATION: any;
declare const FACEMESH_RIGHT_EYE: any;
declare const FACEMESH_RIGHT_IRIS: any;
declare const FACEMESH_LEFT_EYE: any;
declare const FACEMESH_LEFT_IRIS: any;

export class EyeTracker {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  saccadesPerSec = 0;
  lastEyeX = 0;
  saccadeCount = 0;
  blinkCount = 0;
  blinksPerSec = 0;
  lastBlinkState = false;
  blinkThreshold = 0.35;
  trackingActive = false;

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

    this.intervalId = setInterval(() => {
      this.saccadesPerSec = this.saccadeCount;
      this.saccadeCount = 0;
      this.blinksPerSec = this.blinkCount;
      this.blinkCount = 0;
    }, 1000);
  }

  async start(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) return false;
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

      if (typeof drawConnectors !== 'undefined') {
        drawConnectors(this.ctx, landmarks, FACEMESH_TESSELATION, { color: '#00f3ff22', lineWidth: 0.5 });
        drawConnectors(this.ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#ff2a2a' });
        drawConnectors(this.ctx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#ff2a2a' });
        drawConnectors(this.ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#00f3ff' });
        drawConnectors(this.ctx, landmarks, FACEMESH_LEFT_IRIS, { color: '#00f3ff' });
      }

      if (landmarks[468]) {
        const currentEyeX = landmarks[468].x;
        const movement = Math.abs(currentEyeX - this.lastEyeX);
        if (movement > 0.01) {
          this.saccadeCount++;
          this.ctx.fillStyle = 'rgba(255, 42, 42, 0.2)';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.lastEyeX = currentEyeX;
      }

      // Blink detection
      const dist = (a: any, b: any) =>
        Math.hypot((a.x - b.x) * this.canvas.width, (a.y - b.y) * this.canvas.height);

      try {
        const leftRatio = (() => {
          const v = dist(landmarks[159], landmarks[145]);
          const h = dist(landmarks[33], landmarks[133]) || 1;
          return v / h;
        })();
        const rightRatio = (() => {
          const v = dist(landmarks[386], landmarks[374]);
          const h = dist(landmarks[362], landmarks[263]) || 1;
          return v / h;
        })();

        const isBlinking = leftRatio < this.blinkThreshold || rightRatio < this.blinkThreshold;
        if (isBlinking && !this.lastBlinkState) this.blinkCount++;
        this.lastBlinkState = isBlinking;
      } catch {
        // ignore landmark access errors
      }
    }
  }
}
