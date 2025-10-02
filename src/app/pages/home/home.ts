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
  public static readonly MAX_ROUND_DURATION_SECONDS = 30 * 60;
  public static readonly MAX_REST_DURATION_SECONDS  = 10 * 60;
  public static readonly TIME_ADJUST_STEP_SECONDS   = 5;
  public static readonly MIN_DURATION_SECONDS       = 10;
  public static readonly INITIAL_COUNTDOWN_SECONDS  = 3;
  public static readonly START_SCREEN_HOLD_MS = 1000;
  public static readonly TIMER_INTERVAL_MS          = 1000;
  public static readonly FINAL_COUNTDOWN_WINDOW     = 3;

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
    const rounds = this._rounds();
    return rounds > 0 ? rounds * this._roundLength() + (rounds - 1) * this._restLength() : 0;
  });
  get displayTotalTime(): string {
    return this.formatSeconds(this.totalTime());
  }

  incrementRoundLength() {
    if (this._roundLength() < Home.MAX_ROUND_DURATION_SECONDS) {
      this._roundLength.set(this._roundLength() + Home.TIME_ADJUST_STEP_SECONDS);
    }
  }
  decrementRoundLength() {
    if (this._roundLength() > Home.MIN_DURATION_SECONDS) {
      this._roundLength.set(this._roundLength() - Home.TIME_ADJUST_STEP_SECONDS);
    }
  }
  incrementRestLength() {
    if (this._restLength() < Home.MAX_REST_DURATION_SECONDS) {
      this._restLength.set(this._restLength() + Home.TIME_ADJUST_STEP_SECONDS);
    }
  }
  decrementRestLength() {
    if (this._restLength() > Home.MIN_DURATION_SECONDS) {
      this._restLength.set(this._restLength() - Home.TIME_ADJUST_STEP_SECONDS);
    }
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

    let countdownValue = Home.INITIAL_COUNTDOWN_SECONDS;
    this.countdown.set(countdownValue);
    this.playTick();

    this.countdownId = setInterval(() => {
      countdownValue -= 1;
      this.countdown.set(countdownValue);

      if (countdownValue >= 1) {
        this.playTick();
      } else if (countdownValue === 0) {
        clearInterval(this.countdownId!);
        this.countdownId = null;
        setTimeout(() => {
          this.countdown.set(null);
          this.currentRound.set(1);
          this.startPhase('round', this._roundLength());
        }, Home.START_SCREEN_HOLD_MS);
      }
    }, Home.TIMER_INTERVAL_MS);
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

      const remainingTime = this.timeLeft() - 1;
      this.timeLeft.set(remainingTime);

      if (remainingTime > 0 && remainingTime <= Home.FINAL_COUNTDOWN_WINDOW) {
        this.playTick();
      }

      if (remainingTime <= 0) {
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
    }, Home.TIMER_INTERVAL_MS);
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

  private formatSeconds(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.countdownId) clearInterval(this.countdownId);
  }
}
