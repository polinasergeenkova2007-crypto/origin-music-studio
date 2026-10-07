export class Reverb {
  readonly input: ConvolverNode;
  readonly output: GainNode;
  constructor(private context: BaseAudioContext) {
    this.input = context.createConvolver();
    this.output = context.createGain();
    const length = Math.floor(context.sampleRate * 4.2),
      buffer = context.createBuffer(2, length, context.sampleRate);
    let seed = 42;
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] =
          ((seed / 4294967296) * 2 - 1) *
          Math.pow(1 - i / length, 3) *
          Math.min(1, i / (context.sampleRate * 0.025));
      }
    }
    this.input.buffer = buffer;
    this.input.connect(this.output);
    this.output.gain.value = 0.55;
  }
  dispose() {
    this.input.disconnect();
    this.output.disconnect();
  }
}
