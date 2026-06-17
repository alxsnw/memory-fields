export interface LatentModulation {
  breath: number;
  shimmer: number;
}

export class LatentFieldEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseSrc: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private animId = 0;
  private _vol = 0;
  private _targetVol = 0;
  private _startTime = 0;

  get isActive() { return this.ctx !== null; }

  get modulation(): LatentModulation {
    const t = this._startTime ? (performance.now() - this._startTime) / 1000 : 0;
    return {
      breath: Math.sin(t * 0.15) * 0.5 + 0.5,
      shimmer: this._vol * 0.3,
    };
  }

  wake() {
    if (this.ctx) return;
    this._startTime = performance.now();
    const ctx = new AudioContext();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // White noise buffer → low-pass filter
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const ns = ctx.createBufferSource();
    ns.buffer = buf;
    ns.loop = true;

    const nGain = ctx.createGain();
    nGain.gain.value = 0.5;

    const nFilt = ctx.createBiquadFilter();
    nFilt.type = "lowpass";
    nFilt.frequency.value = 250;
    nFilt.Q.value = 0.5;
    this.noiseFilter = nFilt;

    ns.connect(nGain);
    nGain.connect(nFilt);
    nFilt.connect(master);
    ns.start();
    this.noiseSrc = ns;

    // Sine drone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 72;

    const oGain = ctx.createGain();
    oGain.gain.value = 0.3;

    osc.connect(oGain);
    oGain.connect(master);
    osc.start();
    this.droneOsc = osc;

    this._targetVol = 0.04;
    this._tick();
  }

  private _tick = () => {
    if (!this.ctx || !this.master) return;
    const diff = this._targetVol - this._vol;
    if (Math.abs(diff) > 0.0001) {
      this._vol += diff * 0.02;
      this.master.gain.value = this._vol;
    }

    const t = this._startTime ? (performance.now() - this._startTime) / 1000 : 0;

    if (this.droneOsc) {
      this.droneOsc.frequency.value = 72 + Math.sin(t * 0.2) * 1.5;
    }
    if (this.noiseFilter) {
      this.noiseFilter.frequency.value = 200 + Math.sin(t * 0.15) * 80;
    }

    this.animId = requestAnimationFrame(this._tick);
  };

  fadeOut(durationMs = 4000) {
    this._targetVol = 0;
    setTimeout(() => this.sleep(), durationMs + 500);
  }

  sleep() {
    cancelAnimationFrame(this.animId);
    try { this.noiseSrc?.stop(); } catch {}
    try { this.droneOsc?.stop(); } catch {}
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.noiseSrc = null;
    this.noiseFilter = null;
    this.droneOsc = null;
    this._vol = 0;
    this._targetVol = 0;
  }
}
