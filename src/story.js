const check = (zone, point, label, dialog, options = {}) => ({ zone, point, label, dialog, ...options })
const main = [
  {
    id: 'M00',
    name: '第三声',
    summary: '夜雨过后，例行闸声多响了一次。',
    reward: '巡线夹册',
    steps: [
      check(
        'rain',
        'watch',
        '登上冠层观测台',
        '乔芮：两声是例检。第三声是下游回报。可图上写着，下游没人。',
      ),
      check(
        'rain',
        'camp',
        '回汇流镇交接记录',
        '乔芮：下游的泵停了。顺着地面的黄线去维护渠，阿弦应该还在里面。',
      ),
    ],
  },
  {
    id: 'M01',
    name: '闸下有人',
    summary: '排水，找到被困在低渠里的学徒。',
    reward: '护底靴',
    opens: 'salt',
    steps: [
      check(
        'rain',
        'oldValve',
        '去北支渠废闸救援',
        '阿弦在检修池里敲击格栅。左岸的阀轮能排水，东栈桥的绳盘能从上方接人。',
      ),
      check(
        'rain',
        'lostApprentice',
        '接应阿弦',
        '阿弦：旧编号我写在手背上。你看看，这难道是白盐村那条线？',
      ),
      check(
        'rain',
        'worksExit',
        '通过护闸员的封锁',
        '护闸员：出站灯亮在上面。可以绕行，也可以过我这一关。',
        {
          fight: { name: '护闸员', role: 'stone', hp: 53 },
          avoid: true,
        },
      ),
    ],
  },
  {
    id: 'M02',
    name: '被迁走的村',
    summary: '白盐村依然有人居住。把实际名单交给调度台。',
    reward: '软底护套',
    steps: [
      check('salt', 'bank', '检查湿井绳', '井绳还湿，旁边有当天晾出的布。'),
      check('salt', 'shelter', '找唐禾确认住户', '唐禾：迁走的是登记册。我在井边五十年，没见过车来。'),
      check('salt', 'watch', '确认居民到达高处', '唐禾：都到齐了。把井、路和我们的名字一起报上去。'),
    ],
  },
  {
    id: 'M03',
    name: '风停的十秒',
    summary: '在风塔重放旧调度记录。',
    reward: '收声标记器',
    opens: 'root',
    steps: [
      check('salt', 'work', '校准地表收声口', '乔芮：上塔后等风带垂下。静风时窗正好十秒。'),
      check(
        'salt',
        'canopy',
        '在风停时重放记录',
        '旧录音：下游确认未清空。请暂停自动开闸。签名被抹掉，原件还在古根。',
        { listen: true },
      ),
    ],
  },
  {
    id: 'M04',
    name: '根里存的名字',
    summary: '找出原始名单和旧水路图。',
    reward: '轻型攀爬背带',
    opens: 'gorge',
    steps: [
      check('root', 'entry', '进入古根档案窟', '纸页受潮，几处手写的名字仍然清楚。'),
      check('root', 'records', '拼合检修原件', '沈厌的签署记录：按旧图执行。事故由我签字。'),
      check(
        'root',
        'camp',
        '决定如何交接名单',
        '乔芮：我可以把原件直接念出来。也可以让唐禾先逐户核实。',
        {
          choice: [
            ['broadcast', '公开广播'],
            ['private', '交给唐禾'],
          ],
        },
      ),
    ],
  },
  {
    id: 'M05',
    name: '借一座桥',
    summary: '在峡谷修通一条居民撤离线。',
    reward: '高线巡工服',
    steps: [
      check('gorge', 'rim', '检查两条撤离路线', '唐禾：一共四十七人。要走桥上，还是走地下旁道？', {
        choice: [
          ['bridge', '修高架线'],
          ['tunnel', '开地下旁道'],
        ],
      }),
    ],
    branches: {
      bridge: [check('gorge', 'bridge', '放行高架撤离线', '脚步声依次越过维护渠顶板。最后一队到了。')],
      tunnel: [
        check('gorge', 'valve', '放行地下撤离线', '黄灯一盏盏亮起。最后一批居民从高台侧梯离开。'),
      ],
    },
  },
  {
    id: 'M06',
    name: '控塔人',
    summary: '到断潮塔核验撤离与水压，取得手动许可。',
    reward: '塔台授权',
    steps: [
      check(
        'gorge',
        'canopy',
        '启用断潮塔的压力表',
        '沈厌：我知道他们还在。旧方案至少开得动。你敢保证另一条路能通？',
        {
          choice: [
            ['talk', '出示档案与回执'],
            ['duel', '空手对决'],
          ],
        },
      ),
    ],
    branches: {
      talk: [
        check('gorge', 'work', '和沈厌交叉核验读数', '沈厌：名单与回执都对上了。三根表管，我们一起看。'),
      ],
      duel: [
        check('gorge', 'yard', '与沈厌对决', '沈厌：打一场。然后你我一起上塔确认读数。', {
          fight: { name: '沈厌', role: 'beam', hp: 82 },
        }),
      ],
    },
  },
  {
    id: 'M07',
    name: '把水交给谁',
    summary: '人员已在高处。选择盆地的分流方式。',
    reward: '分流回执',
    steps: [
      check('gorge', 'watch', '选定分流方案', '乔芮：人都在高处。你还来得及再看一眼下面的灯。', {
        choice: [
          ['old', '走旧渠，保镇工坊'],
          ['town', '走镇侧，保白盐村'],
          ['triple', '三闸分流'],
        ],
      }),
    ],
    branches: {
      old: [
        check('gorge', 'valve', '开启旧渠总闸', '唐禾：东边灯没了。给井留出能回去的路。'),
        check('gorge', 'camp', '回高台确认洪峰通过', '旧井和部分村舍进水，镇工坊仍可用。'),
      ],
      town: [
        check('gorge', 'entry', '开启镇侧底闸', '乔芮：工坊按预案已经清空。'),
        check('gorge', 'work', '确认地表闸开启', '水进入工坊低地，白盐村的井保住了。'),
      ],
      triple: [
        check('gorge', 'under', '在地下确认旁通位置', '旁通线水压稳定。低闸可以开。'),
        check('gorge', 'work', '在地表稳住换流', '中段读数归零。听到第三声，再开上闸。'),
        check('gorge', 'canopy', '开启断潮塔第三闸', '村井和工坊水线正常。维护环道封存过水。'),
      ],
    },
  },
  {
    id: 'M08',
    name: '新水位线',
    summary: '天晴后，和居民在新的水位尺留下当天刻度。',
    reward: '新水位纪念服',
    steps: [
      check('salt', 'bank', '回白盐村看新水线', '唐禾：名单上的人都在。井的刻度，从这次重新量。'),
      check('rain', 'camp', '在汇流镇完成交接', '乔芮：以后量水位的人，总要知道水曾经到过哪里。', {
        finish: true,
      }),
    ],
  },
]
const side = [
  {
    id: 'S01',
    name: '雨棚上的脚步',
    reward: '雨枝纹',
    zone: 'rain',
    open: 0,
    steps: [
      check('rain', 'canopy', '按巡线声找到旧雨棚', '巡线员：听到了吗？是木棍敲在承重枝上的声音。'),
      check('rain', 'camp', '把巡线标送回镇上', '巡线员在雨棚边刻了一道雨枝纹。'),
    ],
  },
  {
    id: 'S02',
    name: '木板会说话',
    reward: '湿木图鉴',
    zone: 'rain',
    open: 0,
    steps: [
      check('rain', 'bank', '检查湿木脚印', '踩下去后，松木的回声比实木更空。', { listen: true }),
      check('rain', 'gate', '标出需要更换的木板', '修检编号已登记。'),
    ],
  },
  {
    id: 'S03',
    name: '潮前的支阀',
    reward: '维护渠巡线章',
    secret: 'H01 旁通位置',
    zone: 'rain',
    open: 2,
    steps: [
      check('rain', 'valve', '翻阅阀门检修页', '页脚提到顶板以东有一块复位刻牌。'),
      check('rain', 'back', '寻找旧阀室的复位标记', '复位位置落在档案的空线处。获得旁通位置。', {
        hidden: true,
        clue: '到渠底顶板以东，靠近末端的南侧。',
      }),
    ],
  },
  {
    id: 'S04',
    name: '最后一桶井水',
    reward: '井边灰外套',
    zone: 'salt',
    open: 2,
    steps: [
      check('salt', 'shelter', '找唐禾归还登记卡', '旱季把井盖压在红石旁。'),
      check('salt', 'bank', '用红石校准刻度', '井刻度回到镇图。'),
    ],
  },
  {
    id: 'S05',
    name: '风塔夜班',
    reward: '旧班表名牌',
    zone: 'salt',
    open: 2,
    steps: [
      check('salt', 'watch', '去风塔上层等静风', '值班员留了一份写着避风线的班表。', { listen: true }),
      check('salt', 'rim', '标出背风处', '风小的时候，脚步能传到另一侧的井口。'),
    ],
  },
  {
    id: 'S06',
    name: '井口回音',
    reward: '地下水网注释',
    secret: 'H02 换流时序',
    zone: 'salt',
    open: 4,
    steps: [
      check('salt', 'entry', '在井口重放节拍', '两短一长，尾音经维护渠顶板反射。', { listen: true }),
      check('salt', 'records', '找到小检修窗', '背面有当年的换流时序。', {
        hidden: true,
        clue: '在顶板下面沿渠向东，检查靠尽头的墙面。',
      }),
    ],
  },
  {
    id: 'S07',
    name: '苔石旧营',
    reward: '耐磨攀爬手套',
    zone: 'root',
    open: 4,
    steps: [
      check('root', 'gate', '辨认树皮巡线记号', '架桥师把器材留在了根窟侧间。'),
      check('root', 'records', '收回营地装具', '能在树上多抓一会儿了。'),
    ],
  },
  {
    id: 'S08',
    name: '桥上见',
    reward: '避雷棚摆件',
    zone: 'root',
    open: 4,
    steps: [
      check('root', 'canopy', '标定高处的受力点', '现在可以量对岸绳距。'),
      check('root', 'bridge', '标定横桥中心', '两端留出一人宽的跨层通道。'),
    ],
  },
  {
    id: 'S09',
    name: '三根同响',
    reward: '档案窟语音日志',
    secret: 'H03 三段压力表',
    zone: 'root',
    open: 5,
    steps: [
      check('root', 'under', '对照三次测试脉冲', '第三声比第二声迟半拍。它对应第三块铜牌。', {
        listen: true,
      }),
      check('root', 'back', '寻找第三块铜牌', '铜牌背面是三闸分流的安全读数。', {
        hidden: true,
        clue: '从顶板下钻过去，检查渠底末端的斜角。',
      }),
    ],
  },
  {
    id: 'S10',
    name: '断梁边界',
    reward: '赭岩巡线服',
    zone: 'gorge',
    open: 5,
    steps: [
      check('gorge', 'watch', '从高处标定落差', '从边缘可以下去，坡道最稳。'),
      check('gorge', 'rim', '从地表复核危险边缘', '旧码写在两块岩梁接缝处。'),
    ],
  },
  {
    id: 'S11',
    name: '一张没寄出的图',
    reward: '尾声合影',
    zone: 'gorge',
    open: 5,
    steps: [
      check('gorge', 'records', '从塔底取出信件', '字还清楚。收信人是唐禾。'),
      check('gorge', 'camp', '把信袋送到集合点', '唐禾：这还是他第一次把地下的路画给我们看。'),
    ],
  },
  {
    id: 'S12',
    name: '高处有灯',
    reward: '旧塔信标',
    zone: 'gorge',
    open: 5,
    steps: [
      check('gorge', 'canopy', '点亮塔台撤离灯', '在下游也能看到第三盏灯。'),
      check('gorge', 'work', '读取回传测试电报', '旁通位置在青雨林，换流时序在白盐，压力表在古根。'),
    ],
  },
]
const gear = {
  护底靴: { slot: '脚部', effect: '地表湿木和砂地移动更稳定' },
  软底护套: { slot: '脚部', effect: '战役脚步声较轻，降低巡查员的察觉距离' },
  轻型攀爬背带: { slot: '背部', effect: '攀爬耗费的体力降低' },
  耐磨攀爬手套: { slot: '手部', effect: '允许在稍远的位置抓住树干' },
}
const skins = {
  巡线原色: '#bce6c3',
  赭岩巡线服: '#dda477',
  高线巡工服: '#b7bedc',
  雨枝纹: '#afd99e',
  井边灰外套: '#a9b4bb',
  新水位纪念服: '#e0ca91',
}
function steps(quest, choices) {
  const branch = choices[quest.id]
  return branch && quest.branches?.[branch] ? [...quest.steps, ...quest.branches[branch]] : quest.steps
}

export { main, side, gear, skins, steps }
