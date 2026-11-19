import { skins } from './story.js'

// Clothing, silhouette and casting pose only. Collision and combat never read this catalogue.
const profiles = {
  leaf: {
    coat: '#537861',
    trim: '#b9ce84',
    trousers: '#394c42',
    flesh: '#b88667',
    hair: '#322c29',
    glow: '#a9eab1',
    width: 0.91,
    stance: 0.94,
  },
  stone: {
    coat: '#a46d46',
    trim: '#d7a960',
    trousers: '#51483f',
    flesh: '#a16f50',
    hair: '#463c33',
    glow: '#f6b679',
    width: 1.13,
    stance: 1.12,
  },
  tide: {
    coat: '#427b90',
    trim: '#9cd9cf',
    trousers: '#374e60',
    flesh: '#bf8d73',
    hair: '#292e38',
    glow: '#88e3f5',
    width: 0.94,
    stance: 0.96,
  },
  beam: {
    coat: '#776482',
    trim: '#ccb4ca',
    trousers: '#484859',
    flesh: '#ac8064',
    hair: '#36303b',
    glow: '#cfacf2',
    width: 1.01,
    stance: 1.02,
  },
}
const costumes = {
  巡线原色: { pattern: 0 },
  赭岩巡线服: { pattern: 1, trim: '#f0c48b' },
  高线巡工服: { pattern: 2, trim: '#e6c376' },
  雨枝纹: { pattern: 3, trim: '#e8d9a2' },
  井边灰外套: { pattern: 4, trim: '#83aaaf' },
  新水位纪念服: { pattern: 5, trim: '#f5e2a0' },
}
export function avatarLook(role, skin) {
  role = Object.hasOwn(profiles, role) ? role : 'leaf'
  if (!Object.hasOwn(costumes, skin))
    skin = Object.keys(skins).find((key) => skins[key] === skin) || '巡线原色'
  const base = profiles[role],
    costume = costumes[skin]
  return {
    ...base,
    role,
    skin,
    pattern: costume.pattern,
    coat: costume.pattern ? skins[skin] : base.coat,
    trim: costume.trim || base.trim,
  }
}
export const actionKeys = ['light', 'heavy', 'q', 'e', 'c', 'v']
const poses = {
  leaf: ['jab', 'hook', 'lunge', 'sweep', 'palm', 'double'],
  stone: ['jab', 'ram', 'ram', 'brace', 'press', 'double'],
  tide: ['palm', 'double', 'lance', 'sweep', 'recoil', 'volley'],
  beam: ['edge', 'double', 'sweep', 'lance', 'brace', 'volley'],
}
export function gestureFor(role, key) {
  const i = actionKeys.indexOf(key)
  return (poses[role] || poses.leaf)[i < 0 ? 0 : i]
}
export function handMotion(pose, progress, side, active) {
  const wave = Math.sin(Math.min(1, progress) * Math.PI)
  const both = ['double', 'volley', 'brace', 'press', 'ram'].includes(pose)
  const a = both || active ? wave : 0
  const open = ['palm', 'edge', 'double', 'sweep', 'lance', 'volley', 'press', 'recoil'].includes(pose)
  const spread = pose === 'sweep' ? 0.19 : pose === 'edge' ? 0.1 : pose === 'brace' ? -0.075 : 0
  const raise = pose === 'press' ? 0.19 : pose === 'brace' ? 0.135 : pose === 'ram' ? 0.1 : 0.055
  const thrust = pose === 'recoil' ? -0.06 : pose === 'ram' ? 0.1 : pose === 'lance' ? 0.39 : 0.28
  return {
    x: side * spread * a,
    y: raise * a,
    z: -thrust * a,
    tilt: -(open ? 0.36 : 0.8) * a,
    roll: side * (pose === 'sweep' ? 0.83 : pose === 'edge' ? 0.5 : 0) * a,
    open: open ? a : 0,
  }
}
export const pulseColors = { leaf: 0x9cf0ae, stone: 0xf2b271, tide: 0x77e1f5, beam: 0xc6a5fa }
