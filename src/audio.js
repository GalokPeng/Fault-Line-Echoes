export function soundscape() {
  let ctx,
    master,
    wind,
    windGain,
    filter,
    enabled = true,
    region = 'rain',
    footNoise,
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
        footNoise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate)
        const samples = footNoise.getChannelData(0)
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
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
    foot(event) {
      if (!ctx || !enabled || !event) return
      const profiles = {
        stone: [166, 490, 0.07],
        wood: [115, 810, 0.12],
        leaves: [83, 2400, 0.14],
        water: [94, 1800, 0.19],
        sand: [72, 1080, 0.13],
      }
      const [root, cut, life] = profiles[event.surface] || profiles.leaves
      note(root, root * 0.37, life, event.volume, 'triangle')
      const s = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        g = ctx.createGain()
      s.buffer = footNoise
      filter.type = 'bandpass'
      filter.frequency.value = cut
      filter.Q.value = 0.7
      g.gain.setValueAtTime(event.volume * 0.6, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + life)
      s.connect(filter).connect(g).connect(master)
      s.start()
      s.stop(ctx.currentTime + life)
      s.onended = () => {
        s.disconnect()
        filter.disconnect()
        g.disconnect()
      }
    },
    tick(dt, moving, sprint, inside, day, quiet) {
      if (!ctx || !enabled) return
      filter.frequency.setTargetAtTime(
        inside ? 360 : region === 'salt' ? 900 : 1500,
        ctx.currentTime,
        0.8,
      )
      windGain.gain.setTargetAtTime(inside ? 0.065 : 0.18, ctx.currentTime, 0.8)
      birdTime -= dt
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
