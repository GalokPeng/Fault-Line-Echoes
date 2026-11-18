export function soundscape() {
  let ctx,
    master,
    wind,
    windGain,
    filter,
    enabled = true,
    region = 'rain',
    stepTime = 0,
    birdTime = 0
  function wake() {
    try {
      if (!ctx) {
        ctx = new AudioContext()
        master = ctx.createGain()
        master.gain.value = enabled ? 0.32 : 0
        master.connect(ctx.destination)
        const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
          data = noise.getChannelData(0)
        let last = 0
        for (let i = 0; i < data.length; i++) {
          last = (last + 0.08 * (Math.random() * 2 - 1)) / 1.075
          data[i] = last * 2.4
        }
        wind = ctx.createBufferSource()
        wind.buffer = noise
        wind.loop = true
        filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        windGain = ctx.createGain()
        windGain.gain.value = 0.15
        wind.connect(filter).connect(windGain).connect(master)
        wind.start()
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    } catch {}
  }
  function note(f, t, dur = 0.13, vol = 0.16, type = 'sine', pan = 0) {
    if (!ctx || !enabled) return
    const o = ctx.createOscillator(),
      g = ctx.createGain(),
      st = ctx.createStereoPanner()
    o.type = type
    st.pan.value = Math.max(-1, Math.min(1, pan))
    o.frequency.setValueAtTime(f, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(Math.max(18, t), ctx.currentTime + dur)
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.013)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    o.connect(g).connect(st).connect(master)
    o.start()
    o.stop(ctx.currentTime + dur + 0.015)
    o.onended = () => {
      o.disconnect()
      g.disconnect()
      st.disconnect()
    }
  }
  return {
    wake,
    enable(v) {
      enabled = v
      if (master) master.gain.setTargetAtTime(v ? 0.32 : 0, ctx.currentTime, 0.09)
    },
    setRegion(id) {
      region = id
    },
    tick(dt, moving, sprint, inside, day, quiet) {
      if (!ctx || !enabled) return
      filter.frequency.setTargetAtTime(
        inside ? 360 : region === 'salt' ? 900 : 1500,
        ctx.currentTime,
        0.8,
      )
      windGain.gain.setTargetAtTime(inside ? 0.065 : 0.18, ctx.currentTime, 0.8)
      stepTime -= dt
      birdTime -= dt
      if (moving && stepTime < 0) {
        stepTime = sprint ? 0.32 : 0.48
        note(inside ? 155 : region === 'salt' ? 105 : 115, 34, 0.09, quiet ? 0.038 : 0.15, 'triangle')
      }
      if (!inside && birdTime < 0) {
        birdTime = 3 + Math.random() * 6
        const forest = region === 'rain' || region === 'root'
        note(
          day > 0.45 && forest ? 1800 : 450,
          day > 0.45 && forest ? 2650 : 420,
          0.17,
          0.035,
          'sine',
          Math.random() * 1.6 - 0.8,
        )
      }
    },
    note,
  }
}
