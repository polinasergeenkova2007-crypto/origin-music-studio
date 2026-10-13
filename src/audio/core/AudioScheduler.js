export class AudioScheduler {
  context;
  bpm;
  schedule;
  timer;
  nextTime = 0;
  step = 0;
  epoch = 0;
  audibleStep = 0;
  events = [];
  constructor(context, bpm, schedule) {
    this.context = context;
    this.bpm = bpm;
    this.schedule = schedule;
  }
  start() {
    if (this.timer) return;
    this.epoch = this.context.currentTime + 0.035;
    this.nextTime = this.epoch;
    this.step = 0;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
  }
  tick() {
    while (
      this.events.length &&
      this.events[0].time <= this.context.currentTime
    )
      this.audibleStep = this.events.shift().step;
    // Skip missed events after browser throttling instead of playing a backlog.
    const interval = 60 / this.bpm() / 4;
    if (this.nextTime < this.context.currentTime - 0.03) {
      const skipped = Math.ceil(
        (this.context.currentTime - this.nextTime) / interval,
      );
      this.step += skipped;
      this.nextTime += skipped * interval;
    }
    while (this.nextTime < this.context.currentTime + 0.1) {
      this.events.push({ step: this.step, time: this.nextTime });
      this.schedule(this.step++, this.nextTime);
      this.nextTime += 60 / this.bpm() / 4;
    }
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.step = 0;
    this.audibleStep = 0;
    this.events = [];
  }
  get position() {
    while (
      this.events.length &&
      this.events[0].time <= this.context.currentTime
    )
      this.audibleStep = this.events.shift().step;
    return this.audibleStep;
  }
  get playing() {
    return this.timer !== undefined;
  }
}
