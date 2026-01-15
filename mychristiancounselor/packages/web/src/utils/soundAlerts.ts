export type SoundAlertType = 'failure' | 'critical' | 'success';

export class SoundAlerts {
  private static audioContext: AudioContext | null = null;
  private static enabled: boolean = true;

  private static getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a simple beep using Web Audio API
   * This avoids needing external audio files
   */
  private static playTone(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error('Failed to play sound alert:', error);
    }
  }

  /**
   * Play alert for queue failures (2-tone warning)
   */
  static playFailureAlert() {
    if (!this.enabled) return;

    this.playTone(400, 0.15, 0.2); // Low tone
    setTimeout(() => {
      this.playTone(300, 0.15, 0.2); // Lower tone
    }, 150);
  }

  /**
   * Play alert for critical events (3-tone urgent)
   */
  static playCriticalAlert() {
    if (!this.enabled) return;

    this.playTone(800, 0.1, 0.25); // High tone
    setTimeout(() => {
      this.playTone(600, 0.1, 0.25); // Mid tone
    }, 120);
    setTimeout(() => {
      this.playTone(800, 0.1, 0.25); // High tone again
    }, 240);
  }

  /**
   * Play alert for success/completion (rising tone)
   */
  static playSuccessAlert() {
    if (!this.enabled) return;

    this.playTone(523, 0.08, 0.15); // C5
    setTimeout(() => {
      this.playTone(659, 0.08, 0.15); // E5
    }, 80);
    setTimeout(() => {
      this.playTone(784, 0.12, 0.15); // G5
    }, 160);
  }

  /**
   * Play alert based on type
   */
  static playAlert(type: SoundAlertType) {
    switch (type) {
      case 'failure':
        this.playFailureAlert();
        break;
      case 'critical':
        this.playCriticalAlert();
        break;
      case 'success':
        this.playSuccessAlert();
        break;
    }
  }
}
