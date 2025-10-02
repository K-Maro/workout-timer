import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  discardPeriodicTasks,
  flush,
} from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeAll(() => {
    spyOn(window.HTMLMediaElement.prototype, 'play').and.returnValue(Promise.resolve());
    spyOn(window.HTMLMediaElement.prototype, 'pause').and.callFake(function () {});
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    try {
      discardPeriodicTasks();
    } catch {}
    try {
      flush();
    } catch {}
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state & computed values', () => {
    it('should show default lengths and rounds via display getters', () => {
      expect(component.displayRoundLength).toBe('02:00');
      expect(component.displayRestLength).toBe('01:00');
      expect(component.displayRounds).toBe(3);
      expect(component.displayTotalTime).toBe('08:00');
      expect(component.currentPhase()).toBe('idle');
      expect(component.currentRound()).toBe(0);
      expect(component.displayTimeLeft).toBe('00:00');
    });

    it('should update total time when params change', () => {
      component.incrementRounds();
      expect(component.displayTotalTime).toBe('11:00');
    });
  });

  describe('increment/decrement rules', () => {
    it('should enforce round length bounds (0..30min) step 5s', () => {
      for (let i = 0; i < 120 / 5 + 1; i++) component.decrementRoundLength();
      expect(component.displayRoundLength).toBe('00:10');

      for (let i = 0; i < (30 * 60) / 5 + 5; i++) component.incrementRoundLength();
      expect(component.displayRoundLength).toBe('30:00');
    });

    it('should enforce rest length bounds (0..10min) step 5s', () => {
      for (let i = 0; i < 60 / 5 + 1; i++) component.decrementRestLength();
      expect(component.displayRestLength).toBe('00:10');

      for (let i = 0; i < (10 * 60) / 5 + 5; i++) component.incrementRestLength();
      expect(component.displayRestLength).toBe('10:00');
    });

    it('should not allow rounds < 1', () => {
      component.decrementRounds();
      component.decrementRounds();
      component.decrementRounds();
      expect(component.displayRounds).toBe(1);
    });
  });

  describe('workout flow (timers)', () => {
    it('should run a 3-second visible countdown, then start round 1', fakeAsync(() => {
      component.startWorkout();

      tick(4000);
      fixture.detectChanges();

      expect(component.countdown()).toBeNull();
      expect(component.currentPhase()).toBe('round');
      expect(component.currentRound()).toBe(1);
      expect(component.displayTimeLeft).toBe('02:00');
    }));

    it('should decrement time left during a round', fakeAsync(() => {
      component.startWorkout();
      tick(4000);
      expect(component.currentPhase()).toBe('round');

      tick(3000);
      expect(component.displayTimeLeft).toBe('01:57');
    }));

    it('should pause and resume', fakeAsync(() => {
      component.startWorkout();
      tick(4000);

      tick(2000);
      const timeAfter2s = component.displayTimeLeft;

      component.togglePause();
      tick(5000);
      expect(component.displayTimeLeft).toBe(timeAfter2s);

      component.togglePause();
      tick(1000);
      expect(component.displayTimeLeft).not.toBe(timeAfter2s);
    }));

    it('should transition round -> rest -> next round and finally done', fakeAsync(() => {
      (component as any)._roundLength.set(2);
      (component as any)._restLength.set(1);
      component.decrementRounds();

      component.startWorkout();

      tick(4000);
      expect(component.currentPhase()).toBe('round');
      expect(component.currentRound()).toBe(1);
      expect(component.displayTimeLeft).toBe('00:02');

      tick(2000);
      expect(component.currentPhase()).toBe('rest');

      tick(1000);
      expect(component.currentPhase()).toBe('round');
      expect(component.currentRound()).toBe(2);

      tick(2000);
      expect(component.currentPhase()).toBe('done');
      expect(component.currentRound()).toBe(2);
    }));

    it('endWorkout() should reset state and clear timers', fakeAsync(() => {
      component.startWorkout();
      tick(2000);
      component.endWorkout();

      expect(component.currentPhase()).toBe('idle');
      expect(component.currentRound()).toBe(0);
      expect(component.displayTimeLeft).toBe('00:00');
      expect(component.countdown()).toBeNull();

      tick(5000);
    }));
  });

  describe('ngOnDestroy', () => {
    it('should clear intervals on destroy', fakeAsync(() => {
      component.startWorkout();
      tick(2000);
      component.ngOnDestroy();

      const phaseBefore = component.currentPhase();
      tick(3000);
      expect(component.currentPhase()).toBe(phaseBefore);
    }));
  });
});
