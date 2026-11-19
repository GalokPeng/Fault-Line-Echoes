// Metres, seconds, and base damage before equipment. Each tell has the same
// duration in animation, world marker and hit resolution.
const attack = (name, type, reach, windup, damage, rest, extra = {}) => ({
  name,
  type,
  reach,
  windup,
  damage,
  rest,
  ...extra,
})
const bite = attack('探身扑咬', 'bite', 2.3, 0.48, 12, 1.2)
const snip = attack('举钳横剪', 'sweep', 2.7, 0.68, 16, 1.5)
const rush = attack('伏身突进', 'charge', 7, 0.8, 16, 2.1, { distance: 6.5, speed: 10, width: 0.83 })
const spit = attack('引颈吐沫', 'bolt', 11, 0.82, 12, 2, { speed: 11, spread: 0 })
const kick = attack('扬爪急踢', 'bite', 2.6, 0.49, 14, 1.3)
const claw = attack('俯肩横扫', 'sweep', 3, 0.7, 16, 1.65)
const beast = (id, name, form, color, hp, speed, moves, more = {}) => ({
  id,
  name,
  form,
  color,
  hp,
  speed,
  moves,
  scale: 1,
  eye: 1.0,
  sight: 20,
  hearing: 1,
  leash: 45,
  ...more,
})
export const wildlife = {
  rain: [
    beast('reedDrake', '雾纹溪蜥', 'drake', '#437d65', 55, 3.7, [spit, bite], { eye: 0.77 }),
    beast('mireBoar', '苔背野豚', 'boar', '#586346', 78, 4.0, [rush, claw], { scale: 0.87 }),
    beast('kingfisher', '冠羽滩行鸟', 'bird', '#378389', 48, 5.1, [kick, rush], {
      scale: 0.85,
      eye: 1.43,
      sight: 25,
    }),
    beast(
      'riverOx',
      '河滩野牛',
      'ox',
      '#554941',
      98,
      3.65,
      [
        attack('低角短冲', 'charge', 7.5, 1.05, 19, 2.1, { distance: 6.4, speed: 9.6, width: 0.95 }),
        attack('侧首顶撞', 'sweep', 2.6, 0.74, 14, 1.55),
      ],
      { scale: 1.18, eye: 1.55, sight: 10, leash: 24, habitat: 'riverMeadow' },
    ),
    beast(
      'rainCrown',
      '叠瀑鸣皇',
      'drake',
      '#356e69',
      210,
      3.9,
      [
        attack('三叠水矢', 'bolt', 20, 1.25, 20, 2.4, { speed: 12, spread: 0.16 }),
        attack('回身扫尾', 'sweep', 4.2, 0.98, 27, 2.1),
      ],
      { boss: true, phase: 'day', scale: 1.83, eye: 1.55, sight: 30, leash: 60 },
    ),
  ],
  salt: [
    beast('saltClaw', '盐壳沙螯', 'scorpion', '#a37b47', 66, 3.4, [snip, spit], { eye: 0.65 }),
    beast('duneFox', '白耳沙狐', 'fox', '#c38f60', 49, 5.2, [rush, bite], { scale: 0.77, hearing: 1.3 }),
    beast('sunDrake', '赤腹地蜥', 'drake', '#a55c3e', 60, 3.8, [spit, bite], { sight: 23 }),
    beast(
      'saltQueen',
      '白昼盐母',
      'scorpion',
      '#c79961',
      235,
      3.2,
      [
        attack('盐井喷涌', 'eruption', 16, 1.52, 33, 2.7, { radius: 3.15 }),
        attack('交钳断沙', 'sweep', 4.7, 1.04, 29, 2.1),
      ],
      { boss: true, phase: 'day', scale: 1.78, eye: 1.13, sight: 28, leash: 55 },
    ),
  ],
  root: [
    beast('mossHart', '苔冠原鹿', 'hart', '#626849', 75, 4.2, [rush, claw], { eye: 1.78 }),
    beast('shelfBoar', '层菌獠豚', 'boar', '#67564e', 80, 3.5, [claw, rush], {
      sight: 16,
      hearing: 1.24,
    }),
    beast('duskOwl', '暮枝原鸮', 'bird', '#5f5a6e', 48, 4.9, [kick, spit], {
      scale: 0.81,
      nocturnal: true,
      eye: 1.4,
    }),
    beast(
      'elderHart',
      '千根守望者',
      'hart',
      '#566747',
      250,
      3.6,
      [
        attack('年轮震荡', 'ring', 10, 1.42, 29, 2.75, { radius: 9, speed: 7 }),
        attack('冠角直冲', 'charge', 12, 1.15, 30, 2.5, { distance: 10, speed: 12, width: 1.15 }),
      ],
      { boss: true, phase: 'day', scale: 1.75, eye: 2.94, hearing: 1.23, leash: 59, sight: 30 },
    ),
  ],
  gorge: [
    beast('redTalon', '赤岩裂爪', 'bird', '#9f6048', 60, 4.9, [kick, rush], { eye: 1.52 }),
    beast('cliffRam', '崖脊盘羊', 'ram', '#927854', 77, 4.1, [rush, claw], { eye: 1.3 }),
    beast('slateClaw', '灰页岩螯', 'scorpion', '#6d7272', 68, 3.4, [snip, spit], { eye: 0.75 }),
    beast(
      'faultRaptor',
      '断层赤翎',
      'bird',
      '#994831',
      220,
      4.4,
      [
        attack('赤翎掠线', 'charge', 15, 1.29, 36, 2.6, { distance: 13, speed: 15, width: 1.28 }),
        attack('折翼裂风', 'bolt', 17, 0.94, 22, 2.25, { speed: 15, spread: 0.1 }),
      ],
      { boss: true, phase: 'day', scale: 1.72, eye: 2.5, sight: 34, leash: 64 },
    ),
  ],
}
const dens = {
  rain: {
    day: ['听瀑石庭', '水矢离口后横移，扫尾时退出近身。'],
    night: ['南汊蛙塘', '喉囊鼓起后会连鸣两次。越过第一圈，等第二圈追到脚边再跳。', [78, 137]],
  },
  salt: {
    day: ['望潮天门', '尾针指地便会锁定脚下盐井，移出亮圈。'],
    night: ['退潮月滩', '颈帆展开后，三道沙脊沿原朝向交错拱起。横穿脊线。', [-93, -50]],
  },
  root: {
    day: ['千年冠廊', '冠角直冲前往侧面走，见到年轮逼近再跳。'],
    night: [
      '南林银茧坡',
      '翅面眼斑同时展开后，第一扇飞粉之间留有空隙，第二扇会填入缺口。移到树干后。',
      [-102, 155],
    ],
  },
  gorge: {
    day: ['悬潮石林', '压冠后固定直冲线路，提前离开两条标线之间。'],
    night: ['南崖回声台', '折耳竖起时会锁定一扇方向，声面沿岩台扩张。冲出扇边或绕到岩石后。', [40, 155]],
  },
}
const nightBosses = {
  rain: beast(
    'poolBell',
    '青喉伏钟蛙',
    'frog',
    '#438880',
    228,
    3.25,
    [
      attack('双囊复鸣', 'echoPair', 12, 1.35, 21, 2.65, { radius: 12, speed: 7.9, delay: 0.81 }),
      attack('蹼足扑拍', 'charge', 6.3, 0.9, 22, 2.1, { distance: 5.6, width: 0.98, speed: 9 }),
    ],
    { scale: 1.53, eye: 1.26, sight: 24, hearing: 1.33, leash: 54 },
  ),
  salt: beast(
    'sailViper',
    '月帆沙蝰',
    'viper',
    '#a18a85',
    218,
    4.1,
    [
      attack('三折沙脊', 'sandTrail', 14, 1.4, 23, 2.65, { radius: 2.05, gap: 0.4 }),
      attack('月牙短噬', 'bite', 2.9, 0.62, 20, 1.45),
    ],
    { scale: 1.68, eye: 2.04, sight: 26, leash: 54 },
  ),
  root: beast(
    'atlasMoth',
    '银眼苔蛾',
    'moth',
    '#b49e9b',
    205,
    3.7,
    [
      attack('错翅飞粉', 'scaleFan', 18, 1.27, 18, 2.6, { speed: 11.5, spread: 0.21, delay: 0.64 }),
      attack('枝下落尘', 'eruption', 8, 1.13, 22, 1.9, { radius: 2.65 }),
    ],
    { scale: 1.55, eye: 2.13, sight: 26, leash: 56 },
  ),
  gorge: beast(
    'echoBat',
    '折耳崖蝠',
    'bat',
    '#846d83',
    222,
    4.8,
    [
      attack('扇面回声', 'echoCone', 16, 1.19, 25, 2.5, { radius: 16, speed: 10.5, angle: 1.1 }),
      attack('贴崖掠袭', 'charge', 9, 0.88, 23, 2.15, { distance: 8.3, speed: 12, width: 0.92 }),
    ],
    { scale: 1.52, eye: 2.2, sight: 24, hearing: 1.55, leash: 64 },
  ),
}
for (const [id, roster] of Object.entries(wildlife)) {
  const day = roster.find((s) => s.boss),
    night = nightBosses[id]
  const [dayLair, dayTactic] = dens[id].day,
    [lair, tactic, nest] = dens[id].night
  Object.assign(day, { lair: dayLair, tactic: dayTactic })
  roster.push(Object.assign(night, { boss: true, nocturnal: true, phase: 'night', lair, tactic, nest }))
}
export const emptyHand = attack('直拳', 'bite', 2.45, 0.48, 12, 1.05)
export const guardPalm = attack('封步掌', 'bite', 2.65, 0.65, 22, 1.23)
