// serial.ts - Handles connection to Arduino via Web Serial API

// Web Serial API types (not yet in standard TS lib)
declare global {
  interface Navigator {
    serial?: {
      requestPort(): Promise<any>;
    };
  }
}

export class SerialManager {
  port: any = null;
  reader: ReadableStreamDefaultReader<string> | null = null;
  keepReading = true;
  connected = false;

  pulseBuffer: number[] = new Array(100).fill(0);
  currentBpm = 0;

  private onConnectCallbacks: (() => void)[] = [];
  private onDisconnectCallbacks: (() => void)[] = [];
  private onDataCallbacks: ((bpm: number, buffer: number[], raw: number) => void)[] = [];
  private simulationInterval: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<boolean> {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      this.connected = true;
      this.keepReading = true;
      this.notifyConnect();
      this.readLoop();
      return true;
    } catch (error) {
      console.error("Failed to connect to COM Port:", error);
      return false;
    }
  }

  async disconnect() {
    this.keepReading = false;
    if (this.reader) await this.reader.cancel();
    if (this.port) await this.port.close();
    this.connected = false;
    this.notifyDisconnect();
  }

  private async readLoop() {
    if (!this.port?.readable) return;
    const textDecoder = new TextDecoderStream();
    this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();
    let partialBuffer = "";

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        partialBuffer += value;
        const lines = partialBuffer.split('\n');
        partialBuffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) this.processData(trimmed);
        }
      }
    } catch (error) {
      console.error("Error reading from serial port:", error);
    } finally {
      this.reader.releaseLock();
      this.connected = false;
      this.notifyDisconnect();
    }
  }

  processData(dataString: string) {
    let rawPulse = 0;
    let bpm = this.currentBpm;

    if (dataString.includes('BPM:')) {
      const parts = dataString.split(',');
      for (const p of parts) {
        if (p.startsWith('BPM:')) bpm = parseInt(p.substring(4));
        if (p.startsWith('RAW:')) rawPulse = parseInt(p.substring(4));
      }
    } else {
      rawPulse = parseInt(dataString);
      if (isNaN(rawPulse)) return;
      bpm = Math.floor(60 + (rawPulse % 40));
    }

    this.currentBpm = bpm;
    this.pulseBuffer.push(rawPulse);
    if (this.pulseBuffer.length > 100) this.pulseBuffer.shift();
    this.onDataCallbacks.forEach(cb => cb(this.currentBpm, this.pulseBuffer, rawPulse));
  }

  testConnection() {
    console.log("Starting Web Serial Simulation Mode...");
    this.connected = true;
    this.notifyConnect();

    this.simulationInterval = setInterval(() => {
      if (!this.connected) return;
      const simulatedRaw = 500 + Math.random() * 200 + Math.sin(Date.now() / 200) * 100;
      const simulatedBpm = 75 + Math.floor(Math.sin(Date.now() / 1000) * 15 + Math.random() * 5);
      this.processData(`BPM:${simulatedBpm},RAW:${Math.floor(simulatedRaw)}`);
    }, 50);
  }

  onData(callback: (bpm: number, buffer: number[], raw: number) => void) {
    this.onDataCallbacks.push(callback);
  }

  onConnect(callback: () => void) {
    this.onConnectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallbacks.push(callback);
  }

  private notifyConnect() {
    this.onConnectCallbacks.forEach(cb => cb());
  }

  private notifyDisconnect() {
    this.onDisconnectCallbacks.forEach(cb => cb());
  }

  destroy() {
    if (this.simulationInterval) clearInterval(this.simulationInterval);
  }
}

export const serialManager = new SerialManager();
