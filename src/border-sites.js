export const links = [
  [
    ['capital', '西门', -216, 0],
    ['rain', '白石驿界碑', 12, 590],
  ],
  [
    ['capital', '东门', 216, 0],
    ['salt', '盐商古道', 18, 590],
  ],
  [
    ['capital', '北门', 0, -216],
    ['root', '北林石关', -20, 590],
  ],
  [
    ['capital', '南门', 0, 216],
    ['gorge', '关南驿口', 35, 590],
  ],
  [
    ['rain', '古根山口', -25, -590],
    ['root', '雨林古径', -30, -590],
  ],
  [
    ['salt', '断潮山口', 70, -590],
    ['gorge', '盐路边关', 43, -590],
  ],
]
export const wildGateSites = Object.fromEntries(
  ['rain', 'salt', 'root', 'gorge'].map((id) => [
    id,
    links
      .flat()
      .filter(([zone]) => zone === id)
      .map(([, , x, z]) => ({ x, z })),
  ]),
)
export const gateProfile = {
  rain: { radius: 6.25, spring: 3.8 },
  salt: { radius: 6.6, spring: 4.3 },
  root: { radius: 5.95, spring: 4.6 },
  gorge: { radius: 6.8, spring: 3.65 },
}
