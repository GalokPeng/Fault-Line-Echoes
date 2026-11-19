// Each harvest entry describes a field-sized portion, not the whole animal.
// Price is the home-market price in trade seals per item.
const material = (id, name, volume, mass, price, buyer, purpose, qty = 1) => ({
  id,
  name,
  volume,
  mass,
  price,
  buyer,
  purpose,
  qty,
})
const cut = (id, name, volume, mass, price, dish, dishName, nutrition) => ({
  ...material(id, name, volume, mass, price, 'butcher', '肉铺收购，也可以在炉火旁加工。'),
  dish,
  dishName,
  nutrition,
})

const fauna = [
  [
    'rain',
    'reedDrake',
    '雾纹溪蜥',
    [
      material('reedScale', '溪蜥腹鳞', 0.13, 0.085, 3, 'smith', '细鳞可以衬在磨具柄下防滑。', 2),
      material('reedSkin', '溪蜥斑皮', 0.55, 0.22, 4, 'outfitter', '斑皮适合缝耐水工具套。'),
    ],
  ],
  [
    'rain',
    'mireBoar',
    '苔背野豚',
    [
      cut('mirePork', '野豚肩肉', 0.5, 0.43, 4, 'roastMirePork', '炭烤野豚肩', 42),
      material('mireHide', '野豚鬃皮', 1.05, 0.58, 5, 'outfitter', '耐磨鬃皮可衬靴后跟。'),
    ],
  ],
  [
    'rain',
    'kingfisher',
    '冠羽滩行鸟',
    [
      material('kingQuill', '滩鸟冠翎', 0.18, 0.018, 4, 'outfitter', '青色冠翎用作帽簪和衣领饰边。', 2),
      cut('kingBreast', '滩鸟胸肉', 0.31, 0.25, 3, 'roastKingBreast', '盐烤滩鸟胸', 28),
    ],
  ],
  [
    'rain',
    'riverOx',
    '河滩野牛',
    [
      cut('oxBeef', '河滩牛肉', 0.6, 0.52, 6, 'roastOxBeef', '炭烤牛肉', 48),
      material(
        'oxHide',
        '野牛厚皮',
        1.6,
        0.82,
        7,
        'outfitter',
        '衣坊用两份厚皮和一份细麻布缝成折叠驮袋，可把行囊扩至 28 L。',
      ),
    ],
  ],
  [
    'rain',
    'rainCrown',
    '叠瀑鸣皇',
    [
      material(
        'rainTusk',
        '鸣皇长牙',
        0.92,
        0.65,
        18,
        'smith',
        '铁匠把长牙嵌进行脚杖端，制成鸣瀑牙杖。',
      ),
      material('rainFin', '鸣皇背鳍条', 0.43, 0.2, 9, 'smith', '坚韧的鳍条可以固定牙杖的柄箍。', 2),
    ],
  ],
  [
    'salt',
    'saltClaw',
    '盐壳沙螯',
    [
      material('saltClawPlate', '沙螯腹甲', 0.35, 0.17, 4, 'smith', '分节甲片可衬轻护具。', 2),
      material('saltPincer', '沙螯钳壳', 0.51, 0.29, 4, 'smith', '铁匠用坚硬的外钳护住工具尖端。'),
    ],
  ],
  [
    'salt',
    'duneFox',
    '白耳沙狐',
    [
      material('dunePelt', '沙狐冬绒皮', 0.71, 0.35, 6, 'outfitter', '轻软绒皮适合作披肩衬里。'),
      material('foxTuft', '沙狐尾绒', 0.23, 0.045, 3, 'outfitter', '细尾绒可填耳罩，也能扎成拂尘。'),
    ],
  ],
  [
    'salt',
    'sunDrake',
    '赤腹地蜥',
    [
      material('sunScale', '赤腹地蜥鳞', 0.14, 0.07, 3, 'smith', '宽鳞能铺成工具套的护面。', 2),
      material('sunHide', '地蜥尾皮', 0.41, 0.2, 4, 'outfitter', '长条尾皮适合缝手柄套。'),
    ],
  ],
  [
    'salt',
    'saltQueen',
    '白昼盐母',
    [
      material(
        'queenPlate',
        '盐母头胸甲',
        1.78,
        1.05,
        20,
        'smith',
        '天然弧形头甲是打造盐母甲盔的盔面。',
      ),
      material('queenClaw', '盐母大螯护片', 0.64, 0.41, 10, 'smith', '两枚厚螯壳可做盔侧护颊。', 2),
    ],
  ],
  [
    'root',
    'mossHart',
    '苔冠原鹿',
    [
      cut('hartVenison', '原鹿后腿肉', 0.51, 0.45, 5, 'roastHartVenison', '炉烤鹿腿肉', 45),
      material('hartAntler', '原鹿角枝', 0.52, 0.3, 5, 'smith', '角枝可制作扣环及握柄。'),
    ],
  ],
  [
    'root',
    'shelfBoar',
    '层菌獠豚',
    [
      cut('shelfPork', '獠豚肋肉', 0.53, 0.45, 4, 'roastShelfPork', '烤獠豚肋', 44),
      material(
        'shelfBristle',
        '獠豚背鬃',
        0.23,
        0.075,
        3,
        'outfitter',
        '硬背鬃用于做清洁靴面和皮衣的刷子。',
      ),
    ],
  ],
  [
    'root',
    'duskOwl',
    '暮枝原鸮',
    [
      material('owlFeather', '原鸮翼羽', 0.21, 0.018, 4, 'outfitter', '织工用翼羽做轻便饰边。', 2),
      material('owlDown', '原鸮胸绒', 0.32, 0.038, 3, 'outfitter', '细胸绒可填在寒夜披领中。'),
    ],
  ],
  [
    'root',
    'elderHart',
    '千根守望者',
    [
      material('elderHide', '守望者肩皮', 1.85, 1.16, 20, 'outfitter', '整块肩皮是古根护身衣的外层。'),
      material('elderAntler', '守望者冠角', 1.09, 0.74, 13, 'outfitter', '衣坊用冠角制成护衣的承力扣。'),
    ],
  ],
  [
    'gorge',
    'redTalon',
    '赤岩裂爪',
    [
      material('redTalonQuill', '裂爪尾翎', 0.25, 0.03, 4, 'outfitter', '红尾翎常用在巡崖旗饰上。', 2),
      material('redTalonClaw', '裂爪趾爪', 0.14, 0.12, 4, 'smith', '弯爪可作工匠的挂钩。'),
    ],
  ],
  [
    'gorge',
    'cliffRam',
    '崖脊盘羊',
    [
      cut('ramMutton', '盘羊腿肉', 0.55, 0.46, 5, 'roastRamMutton', '炙烤盘羊腿', 46),
      material('ramHorn', '盘羊角鞘', 0.83, 0.49, 6, 'smith', '弯角鞘可做柄首和扣件。'),
    ],
  ],
  [
    'gorge',
    'slateClaw',
    '灰页岩螯',
    [
      material('slatePincer', '岩螯钳尖', 0.32, 0.25, 4, 'smith', '坚实的钳尖可制作磨头。', 2),
      material('slatePlate', '岩螯背甲', 0.58, 0.34, 5, 'smith', '扁厚的甲片适合做膝部护片。'),
    ],
  ],
  [
    'gorge',
    'faultRaptor',
    '断层赤翎',
    [
      material('raptorScute', '赤翎胫鳞', 0.69, 0.48, 14, 'smith', '一对胫鳞构成崖鸣胫甲的护面。', 2),
      material(
        'raptorPlume',
        '赤翎覆羽',
        0.49,
        0.071,
        10,
        'outfitter',
        '覆羽夹在胫甲绑带内侧，可以隔开磨脚的鳞缘。',
      ),
    ],
  ],
]

export const harvestBySpecies = {}
export const harvestItems = {}
export const harvestPrices = {}
for (const [zone, species, source, entries] of fauna) {
  harvestBySpecies[species] = entries.map(({ id, qty }) => ({ id, qty }))
  for (const entry of entries) {
    const { id, name, volume, mass, price, buyer, purpose, dish, dishName, nutrition } = entry
    harvestItems[id] = { name, volume, mass, source, species, zone, purpose, buyer, dish }
    harvestPrices[id] = price
    if (dish) {
      harvestItems[dish] = {
        name: dishName,
        volume: volume * 0.9,
        mass: mass * 0.8,
        food: nutrition,
        source: source + ' · ' + name,
        purpose: '已经烤熟，旅途中可以直接食用。',
      }
    }
  }
}
export const bossLoot = { rain: 'rainTusk', salt: 'queenPlate', root: 'elderHide', gorge: 'raptorScute' }
export const workshopRecipes = {
  fieldPack: { zone: 'rain', service: 'outfitter', materials: { oxHide: 2, cloth: 1 } },
  boots: { zone: 'rain', service: 'outfitter', materials: { mireHide: 2, reedSkin: 1 } },
  softBoots: { zone: 'salt', service: 'outfitter', materials: { dunePelt: 1, sunHide: 1 } },
  harness: { zone: 'root', service: 'outfitter', materials: { mireHide: 1, hartAntler: 1 } },
  workLegs: { zone: 'gorge', service: 'smith', materials: { slatePlate: 2, ramHorn: 1 } },
  rainFang: { zone: 'rain', service: 'smith', materials: { rainTusk: 1, rainFin: 2 } },
  saltCrown: { zone: 'salt', service: 'smith', materials: { queenPlate: 1, queenClaw: 2 } },
  rootMantle: { zone: 'root', service: 'outfitter', materials: { elderHide: 1, elderAntler: 1 } },
  gorgeGreaves: { zone: 'gorge', service: 'smith', materials: { raptorScute: 2, raptorPlume: 1 } },
}
