import { Component, computed, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

type Phase = 'idle' | 'round' | 'rest' | 'done';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnDestroy {
  private _roundLength = signal(120);
  private _restLength = signal(60);
  private _rounds = signal(3);

  currentPhase = signal<Phase>('idle');
  currentRound = signal(0);
  timeLeft = signal(0);
  isPaused = signal(false);

  countdown = signal<number | null>(null);
  private countdownId: any = null;

  private intervalId: any = null;

  get displayRoundLength(): string {
    return this.formatSeconds(this._roundLength());
  }
  get displayRestLength(): string {
    return this.formatSeconds(this._restLength());
  }
  get displayRounds(): number {
    return this._rounds();
  }
  get displayTimeLeft(): string {
    return this.formatSeconds(this.timeLeft());
  }

  totalTime = computed(() => {
    const r = this._rounds();
    return r > 0 ? r * this._roundLength() + (r - 1) * this._restLength() : 0;
  });
  get displayTotalTime(): string {
    return this.formatSeconds(this.totalTime());
  }

  incrementRoundLength() {
    if (this._roundLength() < 30 * 60) this._roundLength.set(this._roundLength() + 5);
  }
  decrementRoundLength() {
    if (this._roundLength() > 10) this._roundLength.set(this._roundLength() - 5);
  }
  incrementRestLength() {
    if (this._restLength() < 10 * 60) this._restLength.set(this._restLength() + 5);
  }
  decrementRestLength() {
    if (this._restLength() > 10) this._restLength.set(this._restLength() - 5);
  }
  incrementRounds() {
    this._rounds.set(this._rounds() + 1);
  }
  decrementRounds() {
    if (this._rounds() > 1) this._rounds.set(this._rounds() - 1);
  }

  private tickAudio = new Audio('/sounds/countdown.mp3');
  private bellAudio = new Audio('/sounds/bell.mp3');

  constructor() {
    this.tickAudio.preload = 'auto';
    this.bellAudio.preload = 'auto';
  }

  private playTick() {
    try {
      this.tickAudio.pause();
      this.tickAudio.currentTime = 0;
      void this.tickAudio.play();
    } catch {}
  }

  private playBell() {
    try {
      this.tickAudio.pause();
      this.tickAudio.currentTime = 0;

      this.bellAudio.pause();
      this.bellAudio.currentTime = 0;
      void this.bellAudio.play();
    } catch {}
  }

  startWorkout() {
    if (this.countdown() !== null || this.currentPhase() !== 'idle') return;

    this.stopTimer();
    this.isPaused.set(false);
    this.currentPhase.set('idle');

    let v = 3;
    this.countdown.set(v);
    this.playTick();

    this.countdownId = setInterval(() => {
      v -= 1;
      this.countdown.set(v);

      if (v >= 1) {
        this.playTick();
      } else if (v === 0) {
        const HOLD_MS = 300;
        clearInterval(this.countdownId!);
        this.countdownId = null;
        setTimeout(() => {
          this.countdown.set(null);
          this.currentRound.set(1);
          this.startPhase('round', this._roundLength());
        }, HOLD_MS);
      }
    }, 1000);
  }

  private startPhase(phase: Phase, duration: number) {
    this.currentPhase.set(phase);
    this.timeLeft.set(duration);
    this.isPaused.set(false);

    if (phase === 'round') {
      this.playBell();
    }

    this.runTick();
  }

  private runTick() {
    this.stopTimer();
    this.intervalId = setInterval(() => {
      if (this.isPaused()) return;

      const t = this.timeLeft() - 1;
      this.timeLeft.set(t);

      if (t > 0 && t <= 3) {
        this.playTick();
      }

      if (t <= 0) {
        this.stopTimer();

        const phase = this.currentPhase();
        if (phase === 'round') {
          this.playBell();

          if (this.currentRound() === this._rounds()) {
            this.currentPhase.set('done');
          } else {
            this.startPhase('rest', this._restLength());
          }
        } else if (phase === 'rest') {
          this.currentRound.set(this.currentRound() + 1);
          this.startPhase('round', this._roundLength());
        }
      }
    }, 1000);
  }

  togglePause() {
    if (this.currentPhase() === 'idle' || this.currentPhase() === 'done') return;
    if (!this.isPaused()) {
      this.isPaused.set(true);
      this.stopTimer();
    } else {
      this.isPaused.set(false);
      this.runTick();
    }
  }

  endWorkout() {
    this.stopTimer();
    if (this.countdownId) {
      clearInterval(this.countdownId);
      this.countdownId = null;
    }
    this.countdown.set(null);
    this.isPaused.set(false);
    this.currentPhase.set('idle');
    this.currentRound.set(0);
    this.timeLeft.set(0);
  }

  closeAfterDone() {
    this.endWorkout();
  }

  private stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private formatSeconds(total: number): string {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.countdownId) clearInterval(this.countdownId);
  }
}
