// Native Web Audio API Synthesizer for Supermarket POS Audio Feedback
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  /**
   * Crisp supermarket laser scanner beep (2650Hz short sine/triangle tone)
   */
  playScanSuccess() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const harmonic = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2650, now);

      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(5300, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
      gain.gain.setValueAtTime(0.22, now + 0.065);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

      osc.connect(gain);
      harmonic.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + 0.1);
      harmonic.stop(now + 0.1);
    } catch (e) {
      console.warn('Audio playback skipped:', e);
    }
  }

  /**
   * Double low-tone alert beep when an unknown barcode is scanned
   */
  playUnknownAlert() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [0, 0.16].forEach((offset, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Slight downward pitch on second tone for unmistakable alert feel
        const freq = idx === 0 ? 340 : 275;
        osc.frequency.setValueAtTime(freq, now + offset);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.012);
        gain.gain.setValueAtTime(0.18, now + offset + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.13);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.135);
      });
    } catch (e) {
      console.warn('Audio playback skipped:', e);
    }
  }

  /**
   * Pleasant ascending chord chime on successful payment/checkout
   */
  playCheckoutSuccess() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [587.33, 880, 1174.66]; // D5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.075;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.29);
      });
    } catch (e) {
      console.warn('Audio playback skipped:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
