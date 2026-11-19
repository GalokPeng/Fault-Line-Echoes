// Small field-guide illustrations. Every drawing is local vector artwork with a 64-unit view box.
const shape = (d, fill = 'url(#surface)', stroke = '#282a23', width = 1.5) =>
  '<path d="' +
  d +
  '" fill="' +
  fill +
  '" stroke="' +
  stroke +
  '" stroke-width="' +
  width +
  '" stroke-linejoin="round" stroke-linecap="round"/>'
const ink = (d, color = '#4d4733', width = 1.5) => shape(d, 'none', color, width)
const shine = (d) => ink(d, '#f5e2aa', 1.25)
const wrap = (drawing, transform) => '<g transform="' + transform + '">' + drawing + '</g>'
const paint = (colors, drawing) => ({ colors: colors.split(' '), drawing })
const golden = '#eed196 #c79550 #80582f'
const leather = '#dfb176 #986641 #593d2e'
const steel = '#d1e0db #789497 #455963'
const sage = '#d2d49a #889660 #4a6044'
const bone = '#f4e3ae #d0b785 #8a7957'
const copper = '#ebbe8c #b77c53 #754737'
const linen = '#e3d8b6 #afaa8b #727462'
const iron = '#adbec0 #778791 #404c56'
const shell = '#efd79f #b18a53 #78613e'

function meatCut(outline, grain, cooked, joint = '') {
  const edge = cooked ? '#67452d' : '#955851'
  const lines = cooked ? '#714231' : '#f4c6a7'
  const fat = cooked ? '#ddae70' : '#f2d6ad'
  return (
    (joint ? shape(joint, '#e0ce9e') : '') +
    shape(outline) +
    ink(grain, lines, cooked ? 2.6 : 2.2) +
    ink('M18 39q2 6 11 8', fat, 1.5) +
    ink('M20 44l3 2m3 1 4 1', edge, 1)
  )
}
const cuts = {
  loin: [
    'M11 38q2-12 16-19 16-9 24-2 8 9-8 23-15 13-27 9-6-2-5-11Z',
    'M17 34q11 1 14-9m3-2q-2 10 9 10m-13 2-5 8m15-23 5 5',
  ],
  shoulder: [
    'M10 32q2-11 18-16 16-3 22 7l4 12q-1 12-18 15-18 1-23-7Z',
    'M18 32q3-9 10-8t9 8q-1 7-8 7t-7-5m14-10 8 6m-3 10 5-4',
  ],
  breast: [
    'M12 45q1-17 13-25 10-7 21-6 10 4 3 13l-13 14q-7 9-18 9Z',
    'M19 37q10-12 20-17m-16 23 21-20m-11 17 14-14',
  ],
  steak: [
    'M9 32q3-12 18-16l17-3q10 1 11 8 3 11-10 23-12 9-25 5Q8 45 9 32Z',
    'M16 27q8 3 13-4t16-5m-30 19q9 1 17-9l11 10m-10-8 8-6',
  ],
  haunch: [
    'M10 39q-1-10 14-15l10-7q9-6 15 3 3 9-6 14l-8 13q-6 9-16 4-8-3-9-12Z',
    'M18 34q10-1 15-9m-11 17q12-8 14-14m4-4 4 3',
    'M41 26l9-11q-3-5 1-7 3-1 6 3 4-1 5 2 0 4-6 5l-10 12Z',
  ],
  rib: [
    'M10 32q3-10 17-13l21-2q7 5 5 14-5 9-16 15l-12 5q-12-2-15-10Z',
    'M15 33l14-10m-7 18 16-17m-6 20 13-15',
    'M23 35l-8 15q-4 5-6 2-3-3 1-6l9-13m18-5-9 23q-3 4-6 2-2-3 2-7l9-19m14-5-8 20q-1 4-4 3-2-1-1-5l8-21',
  ],
  shank: [
    'M12 38q2-10 13-14l8-8q9-6 15 2 5 8-1 15l-12 13q-10 8-19 2-7-2-4-10Z',
    'M17 35q9 1 15-11m-8 19 11-13m4-7 4 3',
    'M37 27l9-15q-2-5 2-7 3-1 5 3 4-1 5 3-1 4-6 5l-8 14Z',
  ],
}
function cutArt(type, cooked, colors, angle = 0) {
  const [outline, grain, joint] = cuts[type]
  return paint(colors, wrap(meatCut(outline, grain, cooked, joint), 'rotate(' + angle + ' 32 32)'))
}
function hide(d, markings, fur = false) {
  return (
    shape(d) + ink(markings, fur ? '#604536' : '#6b5544', 1.55) + shine('M17 27l4 3m19 8 4-1m-17 9 3-2')
  )
}
function feather(outline, marks, stem = 'M13 54Q29 35 48 12') {
  return shape(outline) + ink(stem, '#e2cba1', 2.05) + ink(marks, '#4a5144', 1.1)
}
function plate(outline, segmentation) {
  return shape(outline) + ink(segmentation, '#645744', 1.8) + shine('M18 28l5-5 7-2m7 20 4-3')
}
function vial(liquid, label, style = 'round') {
  const outline =
    style === 'long'
      ? 'M25 15h12v11l6 7v15q0 6-6 6H23q-4 0-4-5V33l6-7Z'
      : 'M25 14h14v12q12 8 12 17 0 10-13 11H24q-12-1-12-10 0-11 13-18Z'
  const content =
    style === 'long'
      ? 'M21 37q5-3 11 0t9 0v11q0 4-5 4H25q-4 0-4-4Z'
      : 'M15 40q5-4 14-1t18 0q4 12-10 13H25q-13 0-10-12Z'
  return (
    shape(outline, '#bfd1bc') +
    shape(content, liquid, '#678478', 1) +
    shape('M24 9q6-3 16 0l-2 10H26Z', '#b18c58') +
    ink('M25 19h14m-14 3h14', '#736349') +
    (label
      ? shape('M23 35q8-3 17 0l-1 10q-8 3-15-1Z', '#ebd6a3') +
        shape('M28 42q-2-6 7-6-1 6-7 6Z', '#648454', 'none')
      : '') +
    ink('M21 36q-3 4-3 8', '#eef4d8', 2)
  )
}
const lamella = (d, seams) => shape(d) + ink(seams, '#5a6055', 2) + shine('M17 25l8-3m9 17 8-2')
const sleeve = 'M25 12l7 4 7-4 8 6 9 15-8 5-7-11 2 24q-10 6-25 0l4-24-7 12-8-6 11-16Z'
const boot = 'M22 13l20 3-4 17 5 5 10 3q4 2 2 8-13 4-24 0l-5-3-10 1-3-6 4-10Z'
const bootArt = (short) =>
  shape(short ? 'M18 24l18-5 4 15 8 3 6 6q2 6-5 7l-16-1-7-4-11 2-4-6 8-9Z' : boot) +
  (short
    ? ink('M18 28l17-4m-16 9 4 2 11-4m-10 7 12-4m-18 8 10-1 9 4h12', '#72583f')
    : ink('M20 19l19 4m-20 4 16 3m-12 4 11 2m-14 4 7-1 8 7h13', '#624534')) +
  shine('M25 17l9 2m9 22 4 1')
function antler(elder) {
  return (
    shape(
      elder
        ? 'M16 52l5-8 7-7 2-10-8-6-2-10 5 8 7 4 4-7-2-10 5 7 1 8-5 10 9-4 5-9 2-11 2 10-2 8-5 7-13 8-5 6-5 7Z'
        : 'M14 52l12-13 4-9-9-6-3-10 5 7 9 4 4-11-2-7 5 5 1 8-5 13 8-4 8-14-2 12-4 6-14 7-10 15Z',
    ) + ink(elder ? 'M21 48l9-9 6-13m0 9 10-5' : 'M20 48l11-12 5-14', '#8b6e4b', 1.4)
  )
}
const art = {
  bun: paint(
    '#fae8ba #ddc192 #a58a62',
    shape('M8 38q1-10 11-15l7-5q2-6 7-4 3 0 4 5l9 5q10 5 10 15-1 11-23 12Q9 51 8 38Z') +
      ink('M31 18q-5 6-3 12m6-11 5 11m-8-9-13 9m18-8 10 6', '#a58b63') +
      shine('M12 37q2-5 7-8'),
  ),
  dates: paint(
    '#ce8e63 #a65839 #68452b',
    shape('M9 35q1-7 10-10 8-2 10 4 1 7-8 12-9 5-12-1Z') +
      shape('M26 23q-1-8 8-12 9-3 14 2 3 7-5 13-11 8-17 1Z') +
      shape('M31 40q1-10 15-13 9-3 10 4 0 7-11 14-11 7-14 0Z') +
      ink('M14 36l9-7m8-6 10-7m-4 24 12-8', '#edbb81'),
  ),
  fruit: paint(
    '#d694ad #a35c81 #563f64',
    shape('M31 29q0-14 17-17-4 16-17 17Z', '#75965d') +
      ink('M21 34l10-10 2-12', '#7c8b58', 2.4) +
      shape('M14 28q10-4 14 5 4 12-7 16-10 1-13-9-2-8 6-12Z') +
      shape('M28 31q9-8 17-2 11 8 2 18-8 7-16 1-7-5-3-17Z') +
      shine('M13 33l5-2m15 3 4-2'),
  ),
  water: paint(steel, vial('#68afbf', false)),
  riverWater: paint(
    sage,
    wrap(vial('#799c74', false, 'long'), 'rotate(-13 32 32)') + ink('M25 44q7-3 12 1', '#c4cf87'),
  ),
  dirtyWater: paint(
    copper,
    wrap(vial('#94855b', false), 'rotate(13 32 32)') +
      ink('M22 45l2 1m5-3 2 2m5 2h3m4-5 2 1', '#5b5945', 2),
  ),
  stomachTonic: paint(sage, vial('#4f8c77', true) + shape('M35 23q9-9 15-6-4 8-12 9Z', '#7fab82')),
  torch: paint(
    leather,
    shape('M15 52l17-32 7 5-17 31Z') +
      shape('M29 30l-1-14 7 5-1-15q11 7 10 17 7-4 8-9 0 15-13 21Z', '#e88a40') +
      shape('M34 28q3-9 4-12 5 8 3 14Z', '#f7d77b') +
      ink('M28 30l8 5m-10-2 8 5', '#d1ad75', 2.5),
  ),
  resin: paint(
    '#f5d775 #d6a340 #98651e',
    shape('M10 40l7-13 14-6 11 10-2 12-12 9-15-3Z') +
      shape('M31 26l5-14 9-3 9 10-3 13-10 3Z') +
      ink('M15 39l10-10 9 1m-9 1 2 14 10-9m2-14 6-7 5 8', '#f7df8d'),
  ),
  hides: paint(
    leather,
    hide(
      'M18 10l8 8 13-1 8-8 7 9-8 9-2 12 9 9-7 7-12-6-13 4-10-5 7-11 1-10-9-9Z',
      'M20 27l8 6-4 10m13-18-5 10 6 7',
    ),
  ),
  ore: paint(
    '#cf9078 #9e6758 #654f4d',
    shape('M7 41l8-16 17-9 13 7 10 16-9 11-26 2Z') +
      shape('M27 27l5-11 13 7-5 9Z', '#cc9a70') +
      ink('M8 41l16 1 5-16m-5 16 6 9m-1-10 14-8 11 6', '#80654f') +
      shine('M16 29l4-4m14-3 6 2'),
  ),
  cloth: paint(
    linen,
    shape('M8 29l23-14 24 9-1 17-24 12-22-9Z') +
      shape('M9 30l22-13 22 7-23 14Z', '#d7cba8') +
      ink('M9 35l21 9 23-13m-43 9 20 8 23-12m-22 2v14', '#897d61') +
      shine('M15 29l14-8'),
  ),
  fieldPack: paint(
    leather,
    shape('M15 24q-2-12 13-13h8q12-2 12 12l4 23q0 8-10 9H19q-9-2-8-10Z') +
      shape('M15 21q12-8 33 0l-2 11q-14 9-30 0Z', '#bd9163') +
      shape('M21 37h21v12H20Z', '#ae8054') +
      ink('M24 25l-1 12m17-12-1 12m-16 4h16', '#614d39', 2.4) +
      shape('M28 27h8v7h-8Z', '#d1b56c'),
  ),
  staff: paint(
    leather,
    shape('M12 54l4 2 26-38 5-1 5-8-4-3-5 7-6 2Z') +
      ink('M23 39l4 2m-2-6 4 3m0-7 4 3', '#d4bf83', 2) +
      shine('M35 22l4-6'),
  ),
  saltKnife: paint(
    steel,
    shape('M22 39l18-22 16-9-6 17-19 20Z') +
      shape('M13 54l-3-4 14-16 7 5-14 16Z', '#9d7452') +
      ink('M21 34l11 9', '#ddc483', 4) +
      shine('M31 37l15-16 6-8'),
  ),
  reedHat: paint(
    golden,
    shape('M5 40l24-24q3-7 7 0l23 25q-20 12-54-1Z') +
      ink('M8 40q25 7 48 0m-35-8 9-14m5-1 9 17m-12-16-3 20m3-18 6 19', '#9d783f') +
      shine('M13 38l14-13'),
  ),
  linenCoat: paint(
    linen,
    shape(sleeve) + ink('M26 14l10 12-9 25m13-31 2 26m-20-16-2 17m7-23 4 5m6 0-4 5', '#766d55', 1.8),
  ),
  workLegs: paint(
    iron,
    lamella(
      'M17 13l14 1 1 36-11 4-5-20Zm21-1 13 2-2 35-10 4-4-20Z',
      'M17 20l12 1m-12 7 12 2m8-9 12 1m-12 7 11 1m-26 5 2 14m18-14-1 15',
    ),
  ),
  boots: paint(leather, bootArt(false)),
  softBoots: paint('#bca98b #978468 #756550', bootArt(true)),
  harness: paint(
    leather,
    shape('M17 13l8-3 7 14 8-14 7 3-8 18 8 15-7 5-7-14-9 15-8-5 10-17Z') +
      ink('M18 15l22 35m4-36L20 49', '#d8ba79') +
      shape('M26 26l9-4 4 9-9 4Z', '#d2b267'),
  ),
  rainFang: paint(
    leather,
    shape('M10 54l4 3 26-30-5-5Z') +
      shape('M34 25q8-12 22-18-2 13-14 22l-3 1Z', '#e8d3a1') +
      shape('M31 23l8 10 6-1-1-5-9-8Z', '#739985') +
      ink('M25 33l7 4m-10-1 7 4', '#b8a475', 2),
  ),
  saltCrown: paint(
    shell,
    plate(
      'M9 37q2-10 7-15l7-3 3-8 6 6 8-7 2 9q9 3 13 18l-5 12-8 5-2-14-17-1-3 15-8-5Z',
      'M16 27l13 4 16-4m-30 8 9-2m12 1 12 3m-22-14 5-4 7 4',
    ),
  ),
  rootMantle: paint(
    '#b5ba82 #78805b #525842',
    shape(sleeve) +
      shape('M14 25l11-10 9 6 9-6 8 10-8 9-7-4-6 5-6-6-6 5Z', '#867451') +
      ink('M29 27l5 5-5 17m-10-9 5 2m14 2 4-3', '#554a37', 2) +
      shape('M28 29l6-4 5 4-6 4Z', '#ddc59b'),
  ),
  gorgeGreaves: paint(
    '#d4af94 #9b7565 #62564e',
    lamella(
      'M15 13l14 1 4 27-5 12-10-7-3-18Zm20-3 14 2 3 26-6 15-9-8-1-19Z',
      'M17 20l10 5-9 4 11 5-10 4m18-21 10 5-9 5 11 4-9 4',
    ),
  ),
}

function rosette(colors, broad, ridges) {
  return paint(colors, plate(broad, ridges))
}
Object.assign(art, {
  rawMeat: cutArt('loin', false, '#efa999 #c87875 #9a585a'),
  meat: cutArt('loin', true, '#dba272 #a26747 #73432f', -10),
  mirePork: cutArt('shoulder', false, '#efb4a1 #ca8b83 #985b58'),
  roastMirePork: cutArt('shoulder', true, copper, -7),
  kingBreast: cutArt('breast', false, '#f2c1a5 #de9e83 #b47d6d', -8),
  roastKingBreast: cutArt('breast', true, '#e2b778 #be8757 #8d603e', 4),
  oxBeef: cutArt('steak', false, '#d99a92 #b36161 #803e47', -8),
  roastOxBeef: cutArt('steak', true, '#c48c65 #a06c52 #6e493b', -4),
  hartVenison: cutArt('haunch', false, '#e6a794 #bf7473 #864d53', 4),
  roastHartVenison: cutArt('haunch', true, '#b98569 #99634d #654939', 7),
  shelfPork: cutArt('rib', false, '#edb7a3 #c78077 #91575b', 3),
  roastShelfPork: cutArt('rib', true, '#d09d72 #a56d4e #784733', 5),
  ramMutton: cutArt('shank', false, '#e1a38c #b47468 #95575c', -18),
  roastRamMutton: cutArt('shank', true, '#cb986b #aa7a57 #744c36', -17),
  reedScale: rosette(
    '#a9cec2 #6e9f85 #466e5e',
    'M11 35l7-13 13-7 14 4 8 11-7 13-15 8-14-6Z',
    'M12 33l14 1 6-15m-5 17 9 12 5-15 10-3',
  ),
  reedSkin: paint(
    sage,
    hide(
      'M12 18l12-5 7 8 9-5 11 5-4 9 5 8-8 11-12-2-9 6-9-5 5-11-8-10Z',
      'M17 26l8-4 7 5-8 6Zm14 8 8-5 6 4-7 7Zm-12 7 7-3 3 5',
    ),
  ),
  mireHide: paint(
    '#c28f72 #97684e #644c41',
    hide(
      'M17 11l11 6 8-1 10-7 7 10-8 11 5 9-5 13-12-5-13 5-8-7 6-14-8-10Z',
      'M17 19l7 7-3 2m15-4 6-5m-14 9-3 6m6 2 4-6m-12 14 3-5',
      true,
    ),
  ),
  kingQuill: paint(
    '#78c8c4 #398c92 #2b655d',
    feather(
      'M13 52q-4-14 5-24l3-1-1 6 5-9-2-2q11-14 29-15 2 15-3 23l-8 7 5-1q-11 11-23 11Z',
      'M18 40l7-2m-2-7 7 1m4-11 2 3m-2 8 12-6m-18 13 11-4',
    ),
  ),
  oxHide: paint(
    '#b0a08e #796e64 #514e48',
    hide(
      'M13 12l13 6h12l12-8 7 9-10 13 7 14-9 7-12-6-15 7-9-7 7-15-9-12Z',
      'M18 21l9 7 5-5 8 3m-17 8 12 4 9-6m-10 8-5 6 m-8-11-4 3',
    ),
  ),
  rainTusk: paint(
    bone,
    shape('M10 49q19-12 22-27l3-12 15 1 5 7q-7 20-22 28-13 7-23 3Z') +
      ink('M33 19l11 6m-13 0 9 5m-11 4 7 2', '#ad9064') +
      shine('M15 48q16-8 23-23'),
  ),
  rainFin: paint(
    '#a6c9b8 #729a8b #45665d',
    shape('M12 49l2-19 6 8 5-20 6 12 8-21 3 16 11-12-4 20-21 15-14 6Z') +
      ink('M16 45l6-8m0 7 7-15m0 12 10-19m-1 15 10-13', '#426e68', 1.7),
  ),
  saltClawPlate: rosette(
    shell,
    'M10 40l6-16 12-10 14 1 11 11 1 13-9 8-23 2Z',
    'M16 29l15 2 18-6m-30 13 13 2 18-6m-20-17 3 26',
  ),
  saltPincer: paint(
    golden,
    shape('M12 48q0-13 10-22 12-12 28-14l-8 7-9 10 10-3 11-8-3 12-17 15-11 3-6 6Z') +
      ink('M18 46l7-10 9-4m-10-2 10-9m9 9-5 6', '#816941'),
  ),
  dunePelt: paint(
    '#e3c391 #bf936a #8c735e',
    hide(
      'M12 17l8-7 9 8 10-1 6-9 8 10-8 11-2 12 7 9-6 4-13-7-13 7-6-5 5-12-1-10Z',
      'M17 18l7 9m6-7-2 11 6 7 2-9m3-3 6-5m-17 21 4 5',
      true,
    ),
  ),
  foxTuft: paint(
    '#efce99 #c18f61 #997251',
    shape(
      'M12 51q6-8 7-16l-2 3q1-13 12-20l-2 6q8-14 24-17-3 8-1 11l3-3q-1 19-14 25l1-5q-4 12-20 15l-8 6Z',
    ) +
      shape('M39 16l13-9-2 11 3-4-4 12-3-4-6 5 1-6-5 2Z', '#e7d8b0', 'none') +
      ink('M16 50q13-11 22-24', '#95694a'),
  ),
  sunScale: rosette(
    '#e6bd87 #b87e5b #8e5948',
    'M16 24l16-12 14 8 5 13-7 13-15 6-14-14Z',
    'M20 27l12 4 10-9m-20 15 10 1 13-8m-14 1-1 17',
  ),
  sunHide: paint(
    copper,
    hide(
      'M8 45l13-8 10-11 9-14 8-1 5 7-3 6-11 6-9 14-18 7Z',
      'M17 43l8-1m-2-5 9 1m-3-7 8 1m-3-7 9 1m-4-8 7 2',
    ),
  ),
  queenPlate: rosette(
    '#eed9a9 #c7a674 #8c714f',
    'M6 39l6-16 9-5 4-8 8 7 9-8 3 9 7 6 6 16-8 9-11-3-7 7-8-7-10 1Z',
    'M12 29l15 5 5-11 6 10 14-4m-37 11 12-3m12 1 10 3',
  ),
  queenClaw: rosette(
    '#ddb782 #b18d65 #806448',
    'M9 46l3-17 12-12 24-7-7 10-13 9 10 5 12-8 5-11 1 17-13 14-17 1-10 9Z',
    'M15 44l11-9 11 5m-17-12 12-8m11 17 7-7',
  ),
  hartAntler: paint(bone, antler(false)),
  shelfBristle: paint(
    leather,
    shape('M16 49l8-23 3 7 8-23 1 17 10-15-4 17 11-6-16 22-11 8Z') +
      ink('M16 52l17-30m-13 31 18-24m-13 24 18-20', '#dcc496', 1.3) +
      ink('M17 44l13 8', '#b98153', 3.4),
  ),
  owlFeather: paint(
    '#c4b9c2 #8d8094 #5f5d71',
    feather(
      'M15 52Q7 38 19 25l3 1 2-5q9-11 24-13 4 15-5 26l-5 4 3-1q-9 12-21 11Z',
      'M14 38l8 4m-4-12 11 4m-3-14 10 5m-6 10 12-5m-11 12 7-3',
    ),
  ),
  owlDown: paint(
    '#ded3c1 #b4a5a2 #8a8188',
    shape(
      'M14 47q-6-9-1-15l4 2q-2-9 5-13l3 4q1-11 10-15l1 8q7-6 13-4l-3 7q8-1 10 3l-8 7 4 2-12 6 2 3-16 4-11 5Z',
    ) + ink('M14 53q13-10 28-27m-18 16-3-8m11-1 9-2', '#968b87'),
  ),
  elderHide: paint(
    '#bdb291 #91856b #6d6254',
    hide(
      'M8 17l9-7 10 7 12 1 10-8 8 10-9 13 6 10-3 7-12-2-8 7-10-6-10 3-3-7 6-13Z',
      'M16 23l12 6 5-5 7 4 8-4m-28 14 8 2 7-5 6 2m-12 6 5-2',
    ),
  ),
  elderAntler: paint('#e2d4a6 #b3a77c #817955', antler(true)),
  redTalonQuill: paint(
    '#e4a479 #b96c52 #834e47',
    feather(
      'M12 52q-1-17 9-27l4-1-1 4 5-9q8-6 24-9 2 12-7 23l-8 4 4-1-13 11-8 1Z',
      'M20 35l5 3m1-11 7 3m4-11 3 3m-9 14 11-7m-14 12 7-3',
    ),
  ),
  redTalonClaw: paint(
    '#c7b598 #9b8171 #735e57',
    shape('M13 49q10-17 20-22 0-8 8-14l12 1 3 7-7 7q-16 4-27 17l-8 9Z') +
      ink('M35 26l8 3m-6-9 9 4m-22 15 7-5', '#806e5b') +
      shine('M16 48q11-16 23-21'),
  ),
  ramHorn: paint(
    '#d6c29d #ac9b79 #7a725d',
    shape(
      'M10 45q-3-23 17-32 19-9 26 5 8 15-7 28-8 7-18 4-9-4-4-12 5-8 12-3l-5 6q7 3 12-6 6-10-3-14-14-4-20 12l-3 15Z',
    ) + ink('M13 32l6 3m-3-12 7 5m1-13 5 8m5-12 2 8m8-8-2 7m9-2-5 5m7 2-5 3m5 3-6 2', '#85785f', 1.3),
  ),
  slatePincer: paint(
    iron,
    shape('M12 48q1-15 11-23l14-8 16-3-9 10-13 7 8 3 14-7-4 10-13 8-11-1-8 10Z') +
      ink('M17 44l8-9 7-2m-9-4 13-8m2 16 9-5', '#667377'),
  ),
  slatePlate: rosette(
    '#b3b7ac #86918f #626c70',
    'M9 31l10-12 14-6 18 8 5 13-10 12-17 6-17-8Z',
    'M13 28l15 1 8-11m-20 20 14-1 14-10m-15 9 4 12 14-10',
  ),
  raptorScute: rosette(
    '#d19c87 #a87569 #775952',
    'M11 22l13-8 10 7 7-7 12 7-2 21-11 11-10-8-8 5-10-16Z',
    'M14 24l9 5 8-4m-16 8 9 5 6-6m6-10 7 5 6-3m-13 9 8 4 4-4',
  ),
  raptorPlume: paint(
    '#edaf83 #c07c69 #915f64',
    feather(
      'M13 53q-3-13 4-23l5-2-2 4 8-12-4 2q9-11 23-13l7-2-2 10-5 11-10 7 7-2-7 8-14 7Z',
      'M19 36l7 1m-3-10 10 3m3-12 3 5m-6 11 12-7m-18 14 9-3',
    ),
  ),
})

const quietSlots = {
  weapon: 'staff',
  head: 'saltCrown',
  body: 'linenCoat',
  legs: 'workLegs',
  feet: 'boots',
}
export const iconIds = Object.keys(art)
export function iconSvg(id) {
  const icon = art[id] || art[quietSlots[id]]
  if (!icon) return ''
  const [light, middle, dark] = icon.colors
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="surface" x1=".1" y1="0" x2=".84" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="' +
    light +
    '"/><stop offset=".53" stop-color="' +
    middle +
    '"/><stop offset="1" stop-color="' +
    dark +
    '"/></linearGradient></defs>' +
    '<ellipse cx="32" cy="53.5" rx="19.5" ry="3.4" fill="#0c1716" opacity=".28"/>' +
    icon.drawing +
    '</svg>'
  )
}
const urls = new Map()
export function itemIcon(id) {
  if (!urls.has(id)) urls.set(id, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(id)))
  return urls.get(id)
}
