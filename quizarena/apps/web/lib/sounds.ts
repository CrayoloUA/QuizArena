/**
 * SoundService: Synthesizes retro 8-bit (chiptune) sound effects natively
 * using the Web Audio API. No external audio file downloads required!
 */
class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.isMuted = localStorage.getItem("quizarena_mute") === "true";
    }
  }

  /**
   * Lazy-initializes AudioContext upon user interaction
   */
  private initCtx(): void {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // Resume if suspended (browser security blocks audio autoplay)
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Toggles global mute state
   */
  public setMute(mute: boolean): void {
    this.isMuted = mute;
    if (typeof window !== "undefined") {
      localStorage.setItem("quizarena_mute", mute ? "true" : "false");
    }
  }

  /**
   * Get mute state
   */
  public getMute(): boolean {
    return this.isMuted;
  }

  /**
   * Internal sound generator for clean chiptune notes
   */
  private playTone(
    freqs: number[],
    durations: number[],
    type: OscillatorType = "square",
    volume: number = 0.05
  ): void {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    let time = this.ctx.currentTime;

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(volume, time);
      const dur = durations[idx] || 0.1;
      
      // Smooth exponential decay to avoid audio clicks
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.start(time);
      osc.stop(time + dur);

      time += dur;
    });
  }

  /**
   * Sound 1: Tick - keyboard typewriter key click
   */
  public playTick(): void {
    this.playTone([900], [0.03], "sine", 0.02);
  }

  /**
   * Sound 2: Click - navigation select/hover button clicks
   */
  public playClick(): void {
    this.playTone([600], [0.04], "square", 0.02);
  }

  /**
   * Sound 3: Correct answer - chiptune ascending laser
   */
  public playCorrect(): void {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  /**
   * Sound 4: Incorrect answer - short distorted downward buzz
   */
  public playIncorrect(): void {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(130, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(45, this.ctx.currentTime + 0.22);

    gainNode.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.22);
  }

  /**
   * Sound 5: Alarm - ticking danger beep when time is almost out
   */
  public playAlarm(): void {
    this.playTone([650, 520], [0.08, 0.08], "sawtooth", 0.025);
  }

  /**
   * Sound 6: Power-Up - chiptune sweeping frequency warp
   */
  public playPowerUp(): void {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(950, this.ctx.currentTime + 0.26);

    // Apply pitch frequency modulation (LFO Vibrato effect)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    
    lfo.frequency.setValueAtTime(28, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gainNode.gain.setValueAtTime(0.035, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.26);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    lfo.start();
    osc.start();
    
    lfo.stop(this.ctx.currentTime + 0.26);
    osc.stop(this.ctx.currentTime + 0.26);
  }

  /**
   * Sound 7: Victory - retro triumphant happy chiptune fanfarria
   */
  public playVictory(): void {
    // C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz) happy major arpeggio
    this.playTone([523.25, 659.25, 783.99, 1046.50], [0.14, 0.14, 0.14, 0.45], "square", 0.035);
  }
}

export const sounds = new SoundService();
