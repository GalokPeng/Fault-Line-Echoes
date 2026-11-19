import { biomes, heightAt, waterAt, riverX } from './biomes.js'
import { makeView, drawMap } from './view.js'
import { makePhysics } from './physics.js'
import { makePeople } from './people.js'
import { roles, fighter, cast, recover, heading, length } from './combat.js'
import { soundscape } from './audio.js'
import {
  readSave,
  writeSave,
  current,
  completeStep,
  positions,
  main,
  side,
  skins,
  gear,
} from './journal.js'
import { connectRoom, manualRoom, match } from './room.js'
import { gates, entryAt, nextGate } from './borders.js'
import { makeField, objectName, windLull } from './field-world.js'
import { footfall, climbMotion } from './movement.js'
import {
  migrateExpedition,
  expeditionStats,
  advanceExpedition,
  addItem,
  operate,
  items,
} from './expedition.js'
import { openPack } from './expedition-ui.js'
import { roomActivity, makePatrol } from './patrol.js'
import { assetUrl } from './asset-url.js'
import { crossedPassage } from './passages.js'
import {
  medicineTitle,
  medicineState,
  acceptCase,
  caseObjective,
  deliverCase,
  ferrySite,
  pickUpCase,
  putCaseDown,
  stepCase,
} from './medicine.js'
import { makeFerryScene } from './ferry-scene.js'
import {
  opening,
  handbookEntries,
  questStatus,
  trackingKey,
  acceptCommission,
  recordEvidence,
} from './handbook.js'
import { floodSites } from './flood-evidence.js'
import { commissionPostSite } from './commission-post.js'
import { capitalNpcs } from './capital-data.js'
import { roleProfiles } from './role-profiles.js'
import { skillIcon, skillHint } from './skill-icons.js'
import { avatarPortrait } from './avatar-portraits.js'

const $ = (id) => document.getElementById(id),
  canvas = $('world'),
  atlas = $('atlas'),
  hud = $('hud'),
  dlg = $('dialog'),
  body = $('dialogBody')
const data = readSave(),
  audio = soundscape(),
  ids = ['capital', 'rain', 'salt', 'root', 'gorge']
let pack = migrateExpedition(data),
  stats = expeditionStats(pack),
  field = null,
  ferry = null,
  pin = null,
  bellTime = 0,
  bellStep = 0
const medicine = medicineState(data, pack)

let mapHeld = false
let mapReleaseTime = -Infinity
let patrol = null,
  roomChoice = 'duel'
let prefs = { sound: true, quality: 'auto', sensitivity: 1, captions: true }
try {
  Object.assign(prefs, JSON.parse(localStorage.getItem('faultline.field.preferences')) || {})
} catch {}
audio.enable(prefs.sound)
let id = ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'capital',
  mode = 'atlas',
  view,
  physics,
  people,
  hero,
  poi,
  room,
  online,
  pvpLaunching = false,
  panel = '',
  duelQuest = null
let time = 0,
  last = 0,
  acc = 0,
  saveTimer = 0,
  uiTimer = 0,
  feedbackTimer = 0,
  flash = 0,
  dragging = false,
  prevX = 0,
  prevY = 0,
  jump = false,
  queued = null,
  requestId = 0,
  entering = false,
  restoring = false
let fallbackClick = false,
  dragDistance = 0
const keys = new Set(),
  stick = { x: 0, z: 0 },
  el = (tag, txt, css) => {
    const e = document.createElement(tag)
    if (txt != null) e.textContent = txt
    if (css) e.className = css
    return e
  }
const btn = (txt, fn, css) => {
  const e = el('button', txt, css)
  e.onclick = fn
  return e
}
const add = (...nodes) => body.append(...nodes)
const msg = (s, seconds = 3) => {
  if (s) {
    $('feedback').textContent = s
    feedbackTimer = seconds
  }
}
let intentionalUnlock = false
const escapeLock = () => {
  if (document.pointerLockElement === canvas) {
    intentionalUnlock = true
    document.exitPointerLock()
  }
}
function inputFocus() {
  canvas.focus({ preventScroll: true })
  if (document.pointerLockElement !== canvas) {
    try {
      const lock = canvas.requestPointerLock()
      lock?.catch(() => {})
    } catch {}
  }
}
function setPrefs() {
  try {
    localStorage.setItem('faultline.field.preferences', JSON.stringify(prefs))
  } catch {}
}
function save() {
  if (hero && physics && mode === 'play' && !online && !pvpLaunching && hero.f.hp > 0) {
    data.positions[id] = { ...hero.pos, yaw: hero.yaw, pitch: hero.pitch }
    if (['carried', 'ground', 'floating'].includes(medicine.phase)) medicine.lastZone = id
    data.vitals = { hp: hero.f.hp, stamina: hero.f.stamina }
  }
  writeSave(data)
}
function dialog(title, name, content, closable = true) {
  panel = name
  keys.clear()
  if (hero) hero.quiet = false
  stick.x = stick.z = 0
  jump = false
  queued = null
  escapeLock()
  $('dismiss').hidden = !closable
  dlg.hidden = false
  $('dialogTitle').textContent = title
  body.replaceChildren()
  content?.()
  const focusable = body.querySelector('button:not(:disabled),select,input')
  if (focusable) focusable.focus({ preventScroll: true })
}
function closeDialog(lock = true) {
  if (panel === 'dead') return
  if (panel === 'map' && lock) mapReleaseTime = performance.now()
  const cancelRoom = (panel === 'rooms' || panel === 'manual') && !pvpLaunching
  panel = ''
  mapHeld = false
  dlg.hidden = true
  keys.clear()
  if (cancelRoom) {
    room?.close?.()
    room = null
  }
  if (lock && mode === 'play') inputFocus()
}
$('dismiss').onclick = () => closeDialog()
dlg.addEventListener('click', (e) => {
  if (e.target === dlg && !$('dismiss').hidden) closeDialog()
})
function wake() {
  audio.wake()
  audio.enable(prefs.sound)
}
function loading(on, text = '正在踏勘地形…') {
  $('loading').hidden = !on
  $('loading').lastElementChild.textContent = text
}
function rolePanel() {
  dialog('选择行者', 'roles', () => {
    for (const [key, r] of Object.entries(roles)) {
      const choice = btn(
        r.name + '　' + r.type,
        () => {
          data.role = key
          save()
          rolePanel()
        },
        'roleCard' + (data.role === key ? ' chosen' : ''),
      )
      const portrait = el('img')
      portrait.src = avatarPortrait(key, data.skin)
      portrait.alt = ''
      choice.prepend(portrait)
      choice.append(el('small', r.skills.join(' · ') + '　｜　' + r.passive))
      add(choice)
    }
    const profile = roleProfiles[data.role]
    if (profile) {
      add(
        el('h3', roles[data.role].name + ' · 行者档案'),
        el('p', profile.origin),
        el('p', profile.fieldcraft, 'muted'),
      )
      const legend = el('div', null, 'skillLegend')
      for (const [i, key] of ['q', 'e', 'c', 'v'].entries()) {
        const item = el('div')
        item.append(
          skillIcon(data.role, key),
          el('strong', key.toUpperCase() + ' · ' + roles[data.role].skills[i]),
          el('span', skillHint(data.role, key)),
        )
        legend.append(item)
      }
      add(legend)
    }
    const unlocked = Object.keys(skins).filter((k) => k === '巡线原色' || data.items.includes(k))
    add(el('h3', '出行装束'))
    for (const skin of unlocked)
      add(
        btn(
          skin,
          () => {
            data.skin = skin
            save()
            rolePanel()
          },
          data.skin === skin ? 'chosen' : '',
        ),
      )
    add(el('p', '行者与装束在下次进入世界时生效。', 'muted'))
  })
}
function options() {
  dialog('设置与操作', 'options', () => {
    add(el('h3', '显示与声音'))
    for (const [key, label] of [
      ['auto', '均衡画质'],
      ['low', '省电画质'],
      ['fine', '精细画质'],
    ])
      add(
        btn(
          label,
          () => {
            prefs.quality = key
            view?.quality(key)
            setPrefs()
            options()
          },
          prefs.quality === key ? 'chosen' : '',
        ),
      )
    add(
      btn(prefs.sound ? '环境音 · 开' : '环境音 · 关', () => {
        prefs.sound = !prefs.sound
        wake()
        setPrefs()
        options()
      }),
    )
    add(
      btn('方向字幕 · ' + (prefs.captions ? '开' : '关'), () => {
        prefs.captions = !prefs.captions
        setPrefs()
        options()
      }),
    )
    add(el('h3', '鼠标灵敏度'))
    for (const v of [0.65, 1, 1.45])
      add(
        btn(
          v + '×',
          () => {
            prefs.sensitivity = v
            setPrefs()
            options()
          },
          prefs.sensitivity === v ? 'chosen' : '',
        ),
      )
    add(
      el('h3', '键鼠操作'),
      el(
        'p',
        'WASD 移动，鼠标环视，方向键亦可转动视角。左键轻击，X 重击，按住 F 格挡。Q / E / C 释放技能，V 释放蓄满的绝技。',
      ),
      el(
        'p',
        'F 格挡，Shift 疾跑，按住 Caps Lock 静步，松开恢复，Ctrl 蹲下。空格跳跃，面对可触及的树节或矮台按住空格攀爬。走入光幕自动过境。R 交互，按住 Tab 看地图，松开收起，B 行囊，G 火把，T 任务手册。',
      ),
    )
    if (import.meta.env.PROD && !globalThis.faultlineAssets) {
      const download = el('a', '下载单文件离线版 HTML')
      download.href = '/faultline-local.html'
      download.download = '断层回声.html'
      add(download)
    }
  })
}
function fillAtlas() {
  const b = biomes[id],
    i = ids.indexOf(id)
  $('worldTitle').textContent = b.name
  $('worldEnglish').textContent = b.english
  $('worldDesc').textContent = b.description
  $('chapter').textContent =
    id === 'capital'
      ? '远行起点　/　THE CAPITAL'
      : ['', '西境 · 河港', '东境 · 盐道', '北境 · 古林', '南境 · 关山'][i]
  $('cityTitle').textContent = b.city
  $('wildTitle').textContent = b.wild
  $('edgeInfo').textContent = id === 'capital' ? '白石王庭　·　四境驿道' : '实景预览　·　从白砥城出发'
  $('backdrop').style.backgroundImage = 'url("' + assetUrl('/atlas/' + id + '.webp') + '")'
  document.querySelectorAll('.region').forEach((e) => {
    const on = e.dataset.id === id
    e.classList.toggle('selected', on)
    e.setAttribute('aria-pressed', String(on))
  })
}
for (const key of ids) {
  const b = biomes[key]
  const e = btn('', () => (b.id === 'capital' ? enter() : select(b.id)), 'region')
  if (b.id === 'capital') e.setAttribute('aria-label', '进入主城 · 白砥城')
  e.dataset.id = b.id
  e.style.setProperty('--img', 'url("' + assetUrl('/atlas/' + b.id + '.webp') + '")')
  e.append(el('strong', b.name), el('em', b.english))
  $('regions').append(e)
}
const paint = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
async function select(next) {
  if (entering || (next === id && view?.land)) return
  id = next
  fillAtlas()
  history.replaceState(null, '', '#' + id)
  const n = ++requestId
  loading(true, '正在绘制' + biomes[id].name + '…')
  await paint()
  if (n !== requestId) return
  try {
    view.load(id)
    loadedId = id
    view.preview(0, false)
    view.render(0, 9.5, time)
  } catch (e) {
    fail(e)
  } finally {
    loading(false)
  }
}
function fail(e) {
  console.error(e)
  dialog('世界载入遇到问题', 'error', () =>
    add(
      el('p', String(e.message || e)),
      btn('重新载入', () => location.reload()),
    ),
  )
}
function actorPoint(service) {
  return (
    people?.all.find((a) => a.service === service && a.f.hp > 0)?.pos ||
    capitalNpcs.find((npc) => npc.service === service)
  )
}
function questGuide() {
  const key = data.tracked
  if (!key) return null
  let objective, name
  if (key === 'medicine') {
    name = medicineTitle
    objective =
      medicine.phase === 'offered'
        ? { zone: 'capital', p: actorPoint('pharmacy'), title: '找回春药铺的谢兰心接单' }
        : caseObjective(medicine, id)
  } else if (key === 'prologue') {
    const status = questStatus(data, key)
    if (status === 'done') return null
    const step = status === 'open' ? null : opening.steps[data.handbook.openingStep]
    const site = step && floodSites[step.point]
    objective = {
      zone: 'capital',
      p: site ? { ...site, y: heightAt('capital', site.x, site.z) } : actorPoint('clerk'),
      title: step?.label || '找白石议庭书记衡书接下汛报',
    }
    name = opening.name
  } else {
    const task = current(data, key)
    if (!task) return null
    const status = questStatus(data, task.q.id)
    name = task.q.name
    if (status === 'open') {
      const site = commissionPostSite(task.q.zone)
      objective = {
        zone: task.q.zone,
        title: '到' + site.title + '揭榜',
        p: { ...site, y: heightAt(task.q.zone, site.x, site.z) },
      }
    } else if (status === 'active')
      objective = {
        zone: task.step.zone,
        title: task.step.hidden ? task.step.clue : task.step.label,
        p: !task.step.hidden && id === task.step.zone ? poi?.[task.step.point] : null,
      }
  }
  if (!objective) return null
  const gate = objective.zone === id ? null : nextGate(id, objective.zone)
  return { ...objective, name, gate, target: gate || objective.p }
}
function activeGoal() {
  const task = current(data)
  return task && questStatus(data, task.q.id) === 'active' && task.step.zone === id
    ? { ...task, p: poi?.[task.step.point] }
    : null
}
function commissionOffer(key) {
  const entry = handbookEntries.find((q) => q.id === key)
  dialog(entry.name, 'commission', () => {
    add(
      el('p', entry.summary || entry.steps[0].dialog),
      el('p', '报酬 · ' + entry.reward, 'muted'),
      btn(
        key === 'prologue' ? '接下汛报' : '揭下委托',
        () => {
          if (!acceptCommission(data, key)) return
          pin = null
          save()
          closeDialog()
          msg('已接 · ' + entry.name + '　' + questGuide().title, 4)
        },
        'chosen',
      ),
      btn('稍后再来', () => closeDialog()),
    )
  })
}
function commissionBoard() {
  dialog(commissionPostSite(id).title, 'commission', () => {
    let count = 0
    for (const q of side.filter((q) => q.zone === id && questStatus(data, q.id) === 'open')) {
      add(btn(q.name + ' · ' + q.reward, () => commissionOffer(q.id)))
      count++
    }
    if (!count) add(el('p', '今天能揭的委托都已领走。各地来信和新的开放条件可以在手册里查到。'))
    add(btn('翻开任务手册', journal))
  })
}
function inspectFlood(point) {
  const advance = (answer) => {
    if (!recordEvidence(data, point, answer)) return false
    save()
    closeDialog()
    msg(
      point === 'clerk'
        ? '取得白砥汛印' + (questGuide() ? ' · ' + questGuide().title : ' · 白砥城已存档')
        : '已记入汛报 · ' + opening.steps[data.handbook.openingStep].label,
      5,
    )
    return true
  }
  dialog(point === 'clerk' ? '白石议庭 · 汛报交接' : floodSites[point].title, 'evidence', () => {
    if (point === 'clerk') {
      add(
        el(
          'p',
          data.main || data.sub
            ? '衡书把拓片和试钟记录放进旧案卷。“当时那一栏一直空着，多亏你回来补全。你的汛印，拿好。”'
            : '衡书把泉井的水痕拓片贴到来报上，又翻出雨林的闸簿。“两短一长，城钟没坏。可汇流镇报来的是三声。拿着这枚汛印，去冠层观测台听听他们的钟。”',
        ),
        btn('签名盖印，领取汛印', () => advance()),
      )
      return
    }
    const feedback = el('p', '', 'evidenceReply')
    feedback.setAttribute('role', 'status')
    if (point === 'gauge') {
      add(
        el(
          'p',
          '尺脚浸在浅池里。最上方一道湿泥横过三道整尺刻线中的第三道，再往上只有干白石灰。你将薄纸覆在尺面，准备把读数留给议庭。',
        ),
      )
      for (const n of [2, 3, 4])
        add(
          btn('拓下' + ['二', '三', '四'][n - 2] + '尺', () => {
            if (!advance(n))
              feedback.textContent =
                n === 2 ? '纸边上方还有湿泥，再往上找一格。' : '这道刻线是干的，昨夜的泥痕在下方。'
          }),
        )
    } else {
      let strokes = ''
      add(
        el(
          'p',
          '钟架的铜牌刻着两个短点和一道长线。拉短绳是急音，拉长绳是延音。照着铭牌，把报汛的三拍敲给城门听。',
        ),
      )
      const strike = (long) => {
        strokes += long ? 'l' : 's'
        audio.note(long ? 440 : 620, long ? 290 : 475, long ? 0.7 : 0.17)
        const notation = [...strokes].map((note) => (note === 's' ? '短' : '长')).join(' · ')
        feedback.textContent = notation
        if (strokes.length === 3 && !advance(strokes)) {
          feedback.textContent = notation + '　守钟人摇头，示意再照钟牌试一次。'
          strokes = ''
        }
      }
      add(
        btn('敲短音', () => strike(false)),
        btn('敲长音', () => strike(true)),
      )
    }
    add(feedback)
  })
}
function storyPanel(task, which = data.tracked, route = 'valve') {
  const s = task.step
  const finish = (choice) => {
    if (task.q.id === 'M01' && task.index === 0) data.field.rescue = route
    if (task.q.id === 'M01' && task.index === 1) data.field.rescued = true
    const reward = completeStep(data, which, choice)
    pack = migrateExpedition(data)
    syncStats()
    field?.refresh()
    save()
    closeDialog()
    msg(
      (reward ? '取得　' + reward : s.label + ' · 已记录') +
        (data.ending && s.finish ? '　结局 · ' + data.ending : ''),
      5,
    )
  }
  dialog(task.q.name, 'story', () => {
    add(el('p', s.dialog))
    if (task.q.id === 'M01' && task.index === 0) {
      add(btn(route === 'rope' ? '系牢绳梯，把阿弦拉上来' : '转动阀轮，排空检修池', () => finish()))
      return
    }
    if (s.choice) {
      for (const [value, text] of s.choice) {
        const pick = btn(text, () => finish(value))
        if (value === 'triple' && data.secrets.length < 3) {
          pick.disabled = true
          pick.textContent += '　线索 ' + data.secrets.length + '/3'
        }
        add(pick)
      }
    } else if (s.fight) {
      add(
        btn('接受对决', () => {
          duelQuest = which
          closeDialog()
          people.startDuel(s.fight.role, s.fight.name)
          msg('对决开始，可随时自由转身')
        }),
      )
      if (s.avoid) add(btn('沿巡线绕行', () => finish()))
    } else if (s.listen || (task.q.id === 'M00' && task.index === 0)) {
      const weatherWindow = task.q.id === 'M03'
      const sample = btn('听取回声', () => {
        if (weatherWindow && !windLull(time)) return
        audio.note(560, 490, 0.28)
        setTimeout(() => audio.note(480, 430, 0.25), 380)
        setTimeout(() => audio.note(390, 350, 0.52), 900)
        sample.disabled = true
        setTimeout(() => {
          if (sample.isConnected) add(btn('记录节拍', () => finish()))
        }, 1200)
      })
      add(sample)
      if (weatherWindow) {
        const readout = el('p', '', 'muted')
        add(readout)
        const checkWind = () => {
          if (!sample.isConnected || sample.dataset.recorded) return
          const quiet = windLull(time)
          sample.disabled = !quiet
          readout.textContent = quiet
            ? '风带垂下，铜筒里的节拍很清楚。'
            : '风把红带吹平了。下一次静风还有 ' + Math.ceil(14 - (time % 24)) + ' 秒。'
          requestAnimationFrame(checkWind)
        }
        sample.addEventListener('click', () => {
          sample.dataset.recorded = '1'
        })
        checkWind()
      }
    } else add(btn('记录并继续', () => finish()))
  })
}
function questResult(result) {
  if (result.ok) {
    syncStats()
    save()
    closeDialog()
  }
  msg(result.message, 5)
}
function medicineDialog(place) {
  dialog(medicineTitle, 'medicine', () => {
    if (place === 'pharmacy') {
      add(el('small', '白砥城 · 药师谢兰心', 'muted'))
      if (medicine.phase === 'offered') {
        add(
          el(
            'p',
            '“雨打了一夜，渡棚还有人等这批药。油布裹好了，箱子要留出 4 L。出西门后找红白水尺，渡工任舟在对岸。”',
          ),
          btn('接下委托 · 背起药箱', () => {
            const r = acceptCase(medicine, pack)
            if (r.ok) {
              data.tracked = 'medicine'
              pin = null
            }
            questResult(r)
            if (!r.ok) {
              const warning = body.querySelector('.caseNotice') || el('p', null, 'caseNotice')
              warning.textContent = r.message
              add(warning)
            }
          }),
        )
      } else
        add(
          el(
            'p',
            medicine.phase === 'done'
              ? '“任舟托人捎了回信。渡棚里的药已经用上了。”'
              : '“看得见水下石脊就能慢慢过；要是没把握，靛蓝布旗引你上高桥。练家衣坊也能帮你把箱带系牢。”',
          ),
        )
    } else if (place === 'fork') {
      medicine.sawFork = true
      save()
      add(
        el('small', '浅汊渡口 · 红白水尺', 'muted'),
        el(
          'p',
          '水线压过第二道红漆。眼前的灰石脊通向对岸，石头两侧水深。上游靛蓝旗通向高岸木桥，桥面干燥，路要多走一段。你可以随时改道。',
        ),
      )
      for (const [key, title] of [
        ['ford', '记下浅滩石脊'],
        ['ridge', '记下高岸木桥'],
      ])
        add(
          btn(title, () => {
            medicine.prefer = key
            if (medicine.phase === 'carried') data.tracked = 'medicine'
            pin = null
            save()
            closeDialog()
            msg(title)
          }),
        )
    } else {
      add(el('small', '浅汊东岸 · 渡工任舟', 'muted'))
      if (medicine.phase === 'carried') {
        add(
          el(
            'p',
            medicine.recovered
              ? '“系带都湿透了！油布底下还是干的，拿来吧。”'
              : medicine.route === 'ridge'
                ? '“靛蓝旗还在？好，今晚的挑夫也能走高桥。”'
                : '“石脊还过得去吗？我把水位记下来，后面的人也好走。”',
          ),
          btn('交付油布药箱', () => {
            const r = deliverCase(medicine, pack, data, id, hero.pos)
            if (r.ok) {
              if (data.tracked === 'medicine') data.tracked = null
              pin = null
            }
            questResult(r)
            if (!r.ok) add(el('p', r.message))
          }),
        )
      } else if (medicine.phase === 'floating') {
        add(
          el('p', '“盯住红系带，水往下游去。追不上就沿岸走，系带会在浅水处卡住。地图上能标出箱子。”'),
          btn('追踪落水药箱', () => {
            data.tracked = 'medicine'
            save()
            closeDialog()
          }),
        )
      } else
        add(
          el(
            'p',
            medicine.phase === 'done'
              ? '“上次你送的药救了急。这里的水沿石嘴转向下游，离主流几步，脚下会稳些。”'
              : '“白砥城回春药铺还有给渡棚的一箱药，见到谢兰心，就说任舟在这里等。”',
          ),
        )
    }
    add(btn('告别', () => closeDialog()))
  })
}
function journal(tab) {
  if (typeof tab !== 'string')
    tab = handbookEntries.some((q) => questStatus(data, q.id, medicine) === 'active') ? 'active' : 'open'
  const statuses = { open: '未接', active: '已接', done: '已完成' }
  const group = (status) => (status === 'locked' ? 'open' : status)
  const entries = handbookEntries.map((q) => ({ q, status: questStatus(data, q.id, medicine) }))
  dialog('任务手册', 'journal', () => {
    const tabs = el('div', null, 'bookTabs')
    for (const [key, title] of Object.entries(statuses)) {
      const n = entries.filter((row) => row.status === key).length
      const button = btn(title + ' ' + n, () => journal(key), key === tab ? 'chosen' : '')
      button.setAttribute('aria-pressed', String(key === tab))
      tabs.append(button)
    }
    add(tabs)
    const guide = questGuide()
    if (guide) {
      const strip = el('div', null, 'bookRoute')
      strip.append(
        el('strong', '正在引导 · ' + guide.name),
        el('span', guide.title),
        btn('停止引导', () => {
          data.tracked = null
          save()
          journal(tab)
        }),
      )
      add(strip)
    }
    const cards = el('div', null, 'bookCards')
    const locked = el('details', null, 'bookLocked')
    const folded = entries.filter((row) => row.status === 'locked')
    locked.append(el('summary', '后续委托 · ' + folded.length))
    for (const { q, status } of entries.filter((row) => group(row.status) === tab)) {
      const chapter = main.indexOf(q),
        key = trackingKey(q),
        zone = q.zone || q.steps[0].zone
      const card = el('article', null, 'bookCard')
      card.dataset.quest = q.id
      card.append(
        el(
          'small',
          (q === opening ? '主线序章' : chapter >= 0 ? '主线 · 第' + (chapter + 1) + '章' : '地方委托') +
            '　/　' +
            biomes[zone].name,
        ),
        el('h3', q.name),
      )
      let detail = q.summary || q.steps[0].label
      if (status === 'active') {
        if (q === opening) detail = opening.steps[data.handbook.openingStep].label
        else if (key === 'medicine') detail = caseObjective(medicine, id)?.title || detail
        else {
          const task = current(data, key)
          detail = task.index + 1 + ' / ' + task.list.length + '　' + (task.step.clue || task.step.label)
        }
      } else if (status === 'locked')
        detail =
          '完成「' +
          (chapter >= 0 ? (main[chapter - 1] || opening).name : main[q.open - 1].name) +
          '」后开放'
      else if (key === 'medicine' && status === 'done')
        detail = (medicine.recovered ? '沿水流追回药箱，' : '') + '渡工任舟已签收。'
      card.append(el('p', detail), el('small', '报酬 · ' + q.reward))
      if (status === 'open' || status === 'active') {
        const label =
          status === 'active'
            ? '继续引导'
            : key === 'prologue'
              ? '引导至衡书'
              : key === 'medicine'
                ? '引导至谢兰心'
                : '引导至委托牌'
        card.append(
          btn(label, () => {
            data.tracked = key
            pin = null
            save()
            closeDialog()
            msg(questGuide()?.title, 4)
          }),
        )
      }
      const section = status === 'locked' ? locked : cards
      section.append(card)
    }
    if (!cards.childElementCount)
      cards.append(
        el(
          'p',
          tab === 'active'
            ? '还没有接下委托。到「未接」页选一条路线，即可找到委托人。'
            : tab === 'done'
              ? '交付后，任务和报酬会留在这里。'
              : '当前可接的委托已全部领取。',
          'muted',
        ),
      )
    add(cards)
    if (tab === 'open' && folded.length) add(locked)
    if (tab === 'done' && data.secrets.length) add(el('p', '已查明 · ' + data.secrets.join('、')))
    if (tab === 'done' && data.ending) add(el('p', '盆地结局 · ' + data.ending))
  })
}
function pause() {
  if (!hero) return
  dialog(online ? '联机对战' : '行路菜单', 'pause', () => {
    add(
      btn('继续游戏', () => closeDialog()),
      btn('设置与操作', options),
    )
    if (!online) {
      add(
        btn('区域地图', () => mapPanel()),
        btn('行囊与装备', () => inventory()),
        btn('任务手册', journal),
        btn('返回标题', toAtlas),
      )
      add(el('h3', '人机切磋'))
      for (const [key, r] of Object.entries(roles))
        add(
          btn(r.name + ' · ' + r.type, () => {
            duelQuest = null
            people.startDuel(key, r.name + ' · 陪练')
            closeDialog()
            msg('切磋开始　' + r.name + ' · ' + r.type)
          }),
        )
      if (people.training)
        add(
          btn('结束切磋', () => {
            people.endDuel()
            duelQuest = null
            closeDialog()
          }),
        )
      if (nearInn() && !people.training)
        add(
          el('h3', '主城驿站'),
          btn('休息至黎明', () => rest(6.2)),
          btn('休息至夜间', () => rest(21.5)),
        )
    } else add(btn('离开房间', toAtlas))
  })
}
function rest(h) {
  if (!nearInn()) {
    msg('在客栈或驿站铺位旁才能歇脚')
    return
  }
  if (people.all.some((a) => a.angry && a.f.hp > 0 && length(a.pos, hero.pos) < 25)) {
    msg('警戒中，先离开冲突范围')
    closeDialog()
    return
  }
  const elapsed = (h - data.hour + 24) % 24
  const cost = advanceExpedition(pack, elapsed, { activity: 'rest' })
  data.hour = h
  people.syncClock?.()
  hero.f.hp = Math.max(0, Math.min(100, hero.f.hp + elapsed * 3) - cost.damage)
  hero.f.stamina = 100
  syncStats()
  if (hero.f.hp <= 0) {
    death('饥渴')
    return
  }
  save()
  closeDialog()
  msg(h > 12 ? '入夜，城灯已亮' : '天色渐明，街市苏醒')
}
function speak(a) {
  dialog(a.name, 'speak', () => {
    add(
      el('small', biomes[id].city + '　/　' + a.job, 'muted'),
      el('p', people.speak(a)),
      btn('告别', () => closeDialog()),
      btn('翻开任务手册', journal),
    )
    const service = a.service || (a.job === '市集商贩' ? 'merchant' : 'resident')
    if (id === 'capital' && service === 'clerk') {
      const status = questStatus(data, 'prologue')
      if (status === 'open')
        add(btn('未盖章的汛报 · 接取主线', () => commissionOffer('prologue'), 'chosen'))
      if (status === 'active' && data.handbook.openingStep === 2)
        add(btn('交还汛报', () => inspectFlood('clerk'), 'chosen'))
    }
    if (id === 'capital' && service === 'pharmacy')
      add(
        btn(
          medicineTitle + (medicine.phase === 'offered' ? ' · 接取委托' : ''),
          () => medicineDialog('pharmacy'),
          'chosen',
        ),
      )
    if (id === 'capital' && service === 'outfitter' && medicine.phase === 'carried' && !medicine.bound)
      add(
        btn('给药箱系背带', () => {
          medicine.bound = true
          save()
          closeDialog()
          msg('练红系紧背带。落入深水也能护住药箱。', 4)
        }),
      )
    if (!a.guard && a.kind !== 'guard') {
      const trading = ['baker', 'butcher', 'merchant', 'smith', 'outfitter', 'inn', 'pharmacy'].includes(
        service,
      )
      const kindness = ['baker', 'butcher', 'inn', 'beggar', 'resident'].includes(service)
        ? service
        : undefined
      const ctx = {
        zone: id,
        service,
        merchant: trading,
        kindness,
        waterSource: service === 'water' ? 'well' : undefined,
      }
      if (trading) add(btn('查看' + a.job + '的货品', () => inventory({ ...ctx, tab: 'market' })))
      if (kindness || ctx.waterSource)
        add(btn('询问当地帮助', () => inventory({ ...ctx, tab: 'local' })))
      if (service === 'inn')
        add(
          btn('住店至黎明', () => rest(6.2)),
          btn('住店至夜间', () => rest(21.5)),
        )
    }
    if (a.kind === 'guard') {
      if (id === 'capital' && !data.field.issuedTorch)
        add(
          btn('领取巡夜火把', () => {
            const result = addPackItem('torch', 1)
            if (result.ok) {
              data.field.issuedTorch = true
              save()
              closeDialog()
            }
            msg(result.message)
          }),
        )
      add(
        btn('邀请切磋', () => {
          duelQuest = null
          closeDialog()
          people.startDuel('stone', '守卫陪练')
        }),
      )
    }
  })
}
function syncStats() {
  stats = expeditionStats(pack)
  if (hero && !online) {
    hero.f.attackBonus = stats.attackBonus
    hero.f.armor = stats.armor
  }
}
function worldFeatures() {
  return [...(field?.features || []), ...(view.town?.features || [])]
}
function nearInn() {
  return (
    worldFeatures().some((p) => p.kind === 'inn' && length(hero.pos, p) < 8) ||
    people?.all.some((a) => a.service === 'inn' && length(hero.pos, a.pos) < 6)
  )
}
function inventory(context = {}) {
  if (!hero || online) return
  dialog('行囊与装备', 'pack', () => {
    const host = el('div')
    add(host)
    openPack(
      host,
      pack,
      { zone: id, ...context, onDrop: (item, qty) => leaveItem(item, qty) },
      (result) => {
        syncStats()
        save()
        if (result?.message) msg(result.message)
      },
    )
  })
}
function leaveItem(item, qty, name) {
  if (item === 'medicineCase') {
    putCaseDown(medicine, id, hero.pos)
    data.tracked = 'medicine'
    return
  }
  data.field.drops ??= []
  data.field.drops.push({
    kind: 'drop',
    name: name || items[item]?.name || item,
    item,
    qty,
    zone: id,
    ...hero.pos,
  })
  field?.drops(data.field.drops)
}
function addRemains(parts, species, pos, speciesId) {
  if (!pos || !parts.length) return
  data.field.drops ??= []
  let lot = data.field.drops.find(
    (d) => d.kind === 'remains' && d.zone === id && d.name === species && length(d, pos) < 0.55,
  )
  if (!lot) {
    lot = {
      kind: 'remains',
      zone: id,
      name: species,
      speciesId,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      parts: {},
    }
    data.field.drops.push(lot)
  }
  for (const { id: item, qty } of parts)
    if (items[item] && qty > 0) lot.parts[item] = (lot.parts[item] || 0) + qty
  field?.drops(data.field.drops)
  save()
  msg(species + '倒下了，靠近后按 R 取材', 3)
}
function harvest(lot, notice = '') {
  dialog(lot.name + ' · 取材', 'harvest', () => {
    add(el('p', '选取要带走的部位，余下的材料会留在原处。'))
    if (notice) add(el('p', notice))
    for (const [item, qty] of Object.entries(lot.parts)) {
      if (!items[item]) continue
      add(
        btn(items[item].name + '　× ' + qty, () => {
          const result = addPackItem(item, 1)
          if (result.ok) {
            if (--lot.parts[item] === 0) delete lot.parts[item]
            save()
          }
          if (Object.keys(lot.parts).length) {
            harvest(lot, result.message)
          } else {
            data.field.drops.splice(data.field.drops.indexOf(lot), 1)
            field.drops(data.field.drops)
            save()
            closeDialog()
            msg(result.message)
          }
        }),
      )
    }
  })
}
function mapPanel(local = false) {
  if (!hero || online) return
  const places = worldFeatures().concat(
    people.all
      .filter((a) => a.service && a.f.hp > 0)
      .map((a) => ({ ...a.pos, name: a.name, job: a.job, service: a.service, actorId: a.id })),
    people.bossMarkers(),
  )
  if (id === 'rain') {
    const s = ferrySite()
    places.push(
      { ...s.bridge, kind: 'ferry', name: '高岸驿桥' },
      { ...s.boatman, kind: 'ferry', name: '任舟 · 渡工棚' },
    )
  }
  if (medicine.point && medicine.zone === id)
    places.push({ ...medicine.point, kind: 'case', name: '朱红系带的药箱' })
  dialog(biomes[id].name + ' · 地图', 'map', () => {
    const cv = el('canvas', null, 'mapImg fullMap')
    add(cv)
    const guide = questGuide()
    drawMap(
      cv,
      id,
      hero.pos,
      places,
      guide?.target ? { ...guide.target, label: guide.gate?.name || guide.name } : null,
      { local, yaw: hero.yaw, pin },
    )
    add(
      btn(local ? '全境' : '附近街区', () => mapPanel(!local)),
      btn('任务手册', journal),
      btn('收起地图', () => closeDialog()),
    )
    add(
      el(
        'p',
        (mapHeld ? '松开 Tab 返回。' : '') + '白色箭头是你。选择地点可追踪方向，附近视图显示街区细节。',
        'muted',
      ),
    )
    if (guide)
      add(
        el(
          'p',
          guide.name + ' · ' + guide.title + (guide.gate ? '　经' + guide.gate.name : ''),
          'mapBoss',
        ),
      )
    const boss = places.find((p) => p.boss)
    if (boss)
      add(
        el(
          'p',
          (boss.phase === 'night' ? '夜行' : '昼行') +
            '首领 · ' +
            boss.name +
            '　｜　' +
            boss.lair +
            '。' +
            boss.tactic,
          'mapBoss',
        ),
      )
    const points = [
      ...gates(id),
      ...(id === 'capital'
        ? places.filter(
            (p) =>
              p.service &&
              [
                'well',
                'smith',
                'merchant',
                'water',
                'inn',
                'butcher',
                'outfitter',
                'beggar',
                'baker',
                'pharmacy',
              ].includes(p.service),
          )
        : places.filter(
            (p) =>
              p.boss ||
              ['well', 'inn', 'habitat', 'shore', 'ferry', 'case', 'commission'].includes(p.kind),
          )),
    ]
    if (id === 'capital') points.push(...places.filter((p) => p.kind === 'case'))
    for (const p of points) {
      const shop = {
        smith: '鸣铁铸坊',
        baker: '包子铺',
        pharmacy: '回春药铺',
        outfitter: '练家衣坊',
        butcher: '梁家肉铺',
      }
      const title = p.to
        ? p.name + ' · ' + biomes[p.to].name
        : shop[p.service]
          ? shop[p.service] + ' · ' + p.name
          : p.job || p.name
      add(
        btn(title, () => {
          pin = { ...p, name: title }
          if (!mapHeld) closeDialog()
          else mapPanel(local)
          msg('已标记 ' + title)
        }),
      )
    }
    if (patrol?.other) add(el('p', '同伴所在 · ' + biomes[patrol.other.zone].name))
    if (pin)
      add(
        btn('清除标记', () => {
          pin = null
          mapPanel(local)
        }),
      )
  })
}
function riverSource() {
  if (!hero) return null
  const p = hero.pos,
    water = waterAt(id, p.x, p.z)
  if (!water.canCollect || Math.abs(p.y - water.level) > 1.55) return null
  if (water.kind === 'brine') return { ...p, kind: 'brine', name: '检查盐湖卤水' }
  const polluted = id === 'gorge' && p.z > 0
  return {
    kind: 'water',
    name: polluted ? '浑浊水源' : '河岸活水',
    source: polluted ? 'tainted' : 'river',
    ...p,
  }
}
function candidates() {
  const pos = hero.pos,
    out = [],
    goal = activeGoal(),
    addItem = (p, title, run, max = 3.1) => {
      const d = length(pos, p)
      if (d <= max) out.push({ title, d, run })
    }
  if (id === 'capital' && questStatus(data, 'prologue') === 'active') {
    const point = opening.steps[data.handbook.openingStep]?.point
    if (floodSites[point]) {
      const site = floodSites[point]
      addItem(
        { ...site, y: heightAt(id, site.x, site.z) },
        '查验' + site.title,
        () => inspectFlood(point),
        3.4,
      )
    }
  }
  if (goal?.p) addItem(goal.p, goal.step.label, () => storyPanel(goal), 3.3)
  if (id === 'rain') {
    const s = ferrySite()
    addItem(s.fork, '查看渡口水尺与两条路线', () => medicineDialog('fork'), 4.2)
    addItem(s.boatman, '与渡工任舟交谈', () => medicineDialog('boatman'), 4.5)
  }
  if (medicine.point && medicine.zone === id)
    addItem(
      medicine.point,
      medicine.phase === 'floating' ? '捞回油布药箱' : '背起放下的药箱',
      () => questResult(pickUpCase(medicine, pack)),
      3.5,
    )
  if (patrol && !patrol.done && id === 'rain') {
    addItem(poi.watch, '双岗联测 · 高台报声', () => patrol.interact('tower'), 4.5)
    addItem(poi.oldValve, '双岗联测 · 废闸核验', () => patrol.interact('valve'), 4.5)
  }
  const a = people.nearby()
  if (a) addItem(a.pos, '与' + a.name + '交谈', () => speak(a), 5)
  const water = riverSource()
  const resources = worldFeatures().concat(
    data.field.drops?.filter((d) => d.zone === id) || [],
    water ? [water] : [],
  )
  for (const p of resources) {
    switch (p.kind) {
      case 'commission':
        addItem(p, p.name + ' · 揭榜', commissionBoard, 4)
        break
      case 'brine':
        addItem(p, p.name, () => msg('岸上凝着盐霜。饮水可到白盐城的石井补给。', 4))
        break
      case 'well':
      case 'fire':
      case 'torch':
      case 'water':
        addItem(
          p,
          p.name,
          () =>
            inventory({
              tab: 'local',
              waterSource: p.kind === 'well' ? 'well' : p.source,
              fire: ['torch', 'fire'].includes(p.kind),
            }),
          3.8,
        )
        break
      case 'inn':
        addItem(
          p,
          p.name + ' · 歇脚',
          () =>
            dialog(p.name, 'inn', () =>
              add(
                btn('歇至黎明', () => rest(6.2)),
                btn('歇至夜间', () => rest(21.5)),
              ),
            ),
          5,
        )
        break
      case 'rope':
        if (goal?.q.id === 'M01' && goal.index === 0)
          addItem(p, p.name, () => storyPanel(goal, data.tracked, 'rope'), 2.6)
        break
      case 'ally':
        if (data.field.rescued || data.main > 1)
          addItem(p, '与阿弦交谈', () =>
            dialog('阿弦', 'speak', () =>
              add(
                el(
                  'p',
                  data.field.rescue === 'rope'
                    ? '你系的绳还在。后来的人也能从低渠爬上去了。'
                    : '水退后，我认出了闸底的旧标记。白盐村的名字，还留在下游的名册上。',
                ),
                btn('告别', () => closeDialog()),
              ),
            ),
          )
        break
      case 'cache':
        if (data.field.rescue === 'valve' && !data.field.badge)
          addItem(p, p.name, () => {
            data.field.badge = true
            data.items.push('旧巡线牌')
            field.refresh()
            save()
            msg('涵洞的旧铜牌上刻着下游人名。取得旧巡线牌。')
          })
        break
      case 'owned':
        if (data.field.taken[p.id] !== Math.floor(pack.elapsed / 24))
          addItem(p, '取走' + p.name + '（有主）', () =>
            dialog(p.name, 'owned', () =>
              add(
                el('p', p.ownerName + '的私人物品。附近的人可能看见你。'),
                btn('取走', () => {
                  const res = addPackItem(p.item, 1)
                  if (res.ok) {
                    data.field.taken[p.id] = Math.floor(pack.elapsed / 24)
                    const seen = people.witnessTheft(p)
                    closeDialog()
                    const report = people.report
                    msg(
                      res.message +
                        (seen
                          ? '　' +
                            report.witness +
                            '看见了！' +
                            (report.guard ? report.guard + '正赶来。' : '摊边响起了呼喊。')
                          : '　四下无人留意。'),
                      4,
                    )
                    save()
                  } else msg(res.message)
                }),
                btn('放回原处', () => closeDialog()),
              ),
            ),
          )
        break
      case 'drop':
        addItem(p, '拾取' + p.name, () => {
          const res = addPackItem(p.item, p.qty)
          if (res.ok) {
            data.field.drops.splice(data.field.drops.indexOf(p), 1)
            field.drops(data.field.drops)
            save()
          }
          msg(res.message)
        })
        break
      case 'remains':
        addItem(p, '从' + p.name + '取材', () => harvest(p), 4.4)
        break
    }
  }
  return out.sort((a, b) => a.d - b.d)
}
function addPackItem(item, qty) {
  const result = addItem(pack, item, qty)
  syncStats()
  return result
}
function interact() {
  if (online || entering) return
  const list = candidates()
  if (!list.length) {
    msg('靠近道路界碑、居民、井台或调查物后按 R')
    return
  }
  if (list.length === 1) {
    list[0].run()
    return
  }
  dialog('附近交互', 'near', () => {
    for (const item of list)
      add(
        btn(item.title, () => {
          closeDialog(false)
          item.run()
        }),
      )
  })
}
function death(killer) {
  save()
  dialog(
    '行者倒下了',
    'dead',
    () => {
      add(
        el('p', killer + ' 击倒了你。驿站会接应返回主城的行者。'),
        btn('回到主城驿站', () => {
          panel = ''
          closeDialog(false)
          people.peace()
          duelQuest = null
          data.vitals = { hp: 100, stamina: 100 }
          pack.food = Math.max(24, pack.food)
          pack.water = Math.max(30, pack.water)
          writeSave(data)
          void enter()
        }),
      )
    },
    false,
  )
}
function events() {
  function spatial(pos, reach) {
    const x = pos.x - hero.pos.x,
      z = pos.z - hero.pos.z,
      d = length(pos, hero.pos)
    if (d >= reach) return null
    return {
      gain: Math.min(1, 1.9 / (1 + d * 0.33)) * (1 - d / reach),
      pan: (x * Math.cos(hero.yaw) - z * Math.sin(hero.yaw)) / Math.max(1, Math.hypot(x, z)),
    }
  }
  return {
    hammer(pos) {
      const s = spatial(pos, 34)
      if (s) {
        audio.note(1120, 760, 0.19, 0.25 * s.gain, 'triangle', s.pan)
        audio.note(1680, 1310, 0.29, 0.095 * s.gain, 'sine', s.pan)
      }
    },
    foot(pos) {
      const s = spatial(pos, 12)
      if (s) audio.foot({ surface: 'stone', volume: 0.11 * s.gain, pan: s.pan })
    },
    hit(name, damage, crime) {
      audio.note(132, 43, 0.13, 0.25, 'triangle')
      msg(name + '　−' + damage + (crime ? '　城防警戒' : ''), 1.6)
    },
    injury(dmg, a) {
      hero.f.hp = Math.max(0, hero.f.hp - dmg)
      flash = dmg > 3 ? 0.7 : 0.13
      audio.note(dmg > 3 ? 92 : 430, 48, 0.16, 0.22, 'triangle', Math.sin(a.yaw - hero.yaw))
      msg((dmg <= 4 ? '格挡　' : '受击　') + a.name + '　−' + dmg, 1.2)
      if (hero.f.hp <= 0) death(a.name)
    },
    duel(win) {
      if (win && duelQuest) {
        const reward = completeStep(data, duelQuest)
        duelQuest = null
        pack = migrateExpedition(data)
        syncStats()
        field?.refresh()
        save()
        msg('通过对决' + (reward ? '　取得 ' + reward : ''), 4)
      } else msg(win ? '切磋结束　胜出' : '已离开切磋范围，对手返回原地', 4)
      if (!win) duelQuest = null
    },
    warning(name) {
      msg(name, 1.25)
    },
    alarm() {
      audio.note(480, 335, 0.28, 0.21, 'triangle')
    },
    loot(item, qty, name, pos) {
      addRemains([{ id: item, qty }], name, pos || hero.pos)
    },
    harvest(parts, name, pos, speciesId) {
      addRemains(parts, name, pos, speciesId)
    },
  }
}
async function enter(link = null, crossing = null) {
  if (entering || !view) return
  entering = true
  const n = ++requestId
  const previous = crossing ? hero?.f : null
  if (!link) id = crossing?.to || 'capital'
  pin = null
  mode = 'loading'
  wake()
  closeDialog(false)
  loading(true, '正在进入' + biomes[id].city + '…')
  await paint()
  try {
    patrol?.detach()
    ferry?.dispose()
    ferry = null
    field?.dispose()
    field = null
    people?.dispose()
    people = null
    physics?.dispose()
    physics = null
    if (!view.land || loadedId !== id) {
      view.load(id)
      loadedId = id
    }
    const b = biomes[id],
      s = crossing ? entryAt(id, crossing.from) : null,
      origin = { x: b.spawn[0], y: heightAt(id, ...b.spawn), z: b.spawn[1] },
      p = s && ['x', 'y', 'z'].every((k) => Number.isFinite(s[k])) ? s : origin
    if (!link) {
      field = makeField(view.scene, id, view.town, data)
      ferry = makeFerryScene(view.scene, id)
    }
    physics = await makePhysics(
      view.land.ground,
      view.land.solids,
      [...view.town.colliders, ...(field?.structures || []), ...(ferry?.structures || [])],
      p,
      id === 'capital' ? 220.3 : b.radius,
    )
    if (n !== requestId) {
      physics.dispose()
      physics = null
      return
    }
    const char = roles[data.role] ? data.role : 'leaf'
    hero = {
      world: id,
      origin,
      pos: physics.feet(),
      yaw: s?.yaw || 0,
      pitch: s?.pitch || 0,
      f: fighter(char),
      skin: data.skin,
      color: skins[data.skin] || roles[char].color,
      crouch: false,
      quiet: false,
      noise: 0,
      grip: null,
    }
    view.setAvatar(char, data.skin)
    if (!link) {
      const vitals = previous || data.vitals
      if (vitals && Number.isFinite(vitals.hp)) hero.f.hp = Math.max(1, Math.min(100, vitals.hp))
      if (vitals && Number.isFinite(vitals.stamina))
        hero.f.stamina = Math.max(0, Math.min(100, vitals.stamina))
      if (previous) hero.f.charge = previous.charge
      syncStats()
    }
    if (field) field.drops(data.field.drops || [])
    poi = positions(id, view.town)
    mode = 'play'
    atlas.hidden = true
    $('surveyHud').hidden = true
    hud.hidden = false
    audio.setRegion(id)
    feedbackTimer = 0
    keys.clear()
    if (link) {
      online = match(link, hero, view, physics, (s) => msg(s, 4))
    } else {
      people = makePeople(view, id, physics, hero, events(), {
        field: data.field,
        clock: () => ({ hour: data.hour, elapsed: pack.elapsed }),
      })
      if (!data.visited.includes(id)) data.visited.push(id)
      save()
    }
    $('roleName').textContent = roles[char].name + '　/　' + roles[char].type
    $('hotbar').replaceChildren(
      ...roles[char].skills.map((name, i) => {
        const key = ['q', 'e', 'c', 'v'][i]
        const cell = el('button', null, 'ability')
        cell.type = 'button'
        cell.title = key.toUpperCase() + ' · ' + name + '　' + skillHint(char, key)
        cell.setAttribute('aria-label', cell.title)
        cell.style.setProperty('--skill-ink', roles[char].color)
        cell.append(
          el('b', key.toUpperCase()),
          skillIcon(char, key),
          el('span', name, 'skillName'),
          el('small', '', 'skillState'),
        )
        return cell
      }),
    )
    msg(
      link
        ? '正在同步房间'
        : crossing
          ? '已越过边境 · ' + gates(id).find((g) => g.to === crossing.from)?.name
          : '白砥城 · 按 T 翻开任务手册，按住 Tab 查看地图',
      4,
    )
    last = performance.now()
    inputFocus()
  } catch (e) {
    fail(e)
  } finally {
    entering = false
    pvpLaunching = false
    loading(false)
  }
}
async function cross(g) {
  if (entering || online || mode !== 'play') return
  audio.note(280, 510, 0.42, 0.12, 'sine')
  save()
  duelQuest = null
  await enter(null, { from: id, to: g.to })
}
let loadedId = null
function toAtlas() {
  const oldOnline = online
  const oldPatrol = patrol
  patrol = null
  online = null
  pvpLaunching = !!oldOnline
  if (!oldOnline) save()
  mode = 'atlas'
  oldOnline?.close()
  oldPatrol?.close()
  room?.close?.()
  room = null
  pvpLaunching = false
  people?.dispose()
  people = null
  field?.dispose()
  field = null
  ferry?.dispose()
  ferry = null
  physics?.dispose()
  physics = null
  hero = null
  duelQuest = null
  keys.clear()
  queued = null
  jump = false
  closeDialog(false)
  escapeLock()
  hud.hidden = true
  atlas.hidden = false
  $('surveyHud').hidden = true
  fillAtlas()
  view.preview(0, false)
}
function missingGame() {
  return !hero || mode !== 'play' || !!panel
}
function action(key) {
  if (missingGame() || hero.f.hp <= 0) return
  if (online) {
    online.cast(key)
    return
  }
  if (hero.f.busy > 0) {
    if (hero.f.busy < 0.16) queued = key
    return
  }
  const spec = cast(hero.f, key)
  if (!spec) {
    if (key === 'v') msg('绝技回响　' + Math.floor(hero.f.charge) + '%', 1)
    return
  }
  view.punch(spec)
  patrol?.gesture?.(spec.key)
  audio.note(spec.shot ? 385 : 132, spec.shot ? 115 : 58, 0.12, 0.13, 'triangle')
  const hits = people.strike(spec)
  if (!hits) msg(spec.name, 0.65)
}
function update(dt) {
  const f = hero.f
  if (!online) {
    const previousStamina = f.stamina
    recover(f, dt)
    f.stamina = Math.min(100, previousStamina + (f.stamina - previousStamina) * stats.stamina)
  }
  if (queued && f.busy <= 0) {
    const key = queued
    queued = null
    action(key)
  }
  const active = !panel && f.hp > 0
  if (active) {
    hero.yaw += (Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'))) * dt * 1.9
    hero.pitch = Math.min(
      1.43,
      Math.max(
        -1.43,
        hero.pitch + (Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'))) * dt * 1.3,
      ),
    )
  }
  const forward = active ? Number(keys.has('KeyW')) - Number(keys.has('KeyS')) + stick.z : 0,
    right = active ? Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + stick.x : 0
  hero.quiet = active && keys.has('CapsLock')
  f.guard = active && keys.has('KeyF') && f.busy <= 0
  hero.crouch = physics.crouch(
    active && (hero.crouchLatched || keys.has('ControlLeft') || keys.has('ControlRight')),
  )
  if (f.stamina <= 8) hero.windDown = true
  if (f.stamina >= 28) hero.windDown = false
  const moving = !!(forward || right),
    sprint =
      active &&
      moving &&
      (keys.has('ShiftLeft') || keys.has('ShiftRight')) &&
      !hero.windDown &&
      !f.guard &&
      !hero.quiet &&
      !hero.crouch
  const speed =
    roles[f.role].speed *
    (online ? 1 : stats.speed) *
    (sprint ? 1.57 : hero.quiet ? 0.39 : hero.crouch ? 0.53 : f.guard ? 0.52 : 1)
  if (sprint) f.stamina = Math.max(0, f.stamina - (online ? 20 : 21 / stats.stamina) * dt)
  const h = heading(hero.yaw),
    d = Math.hypot(forward, right) || 1
  let dx = ((h.x * forward + Math.cos(hero.yaw) * right) * speed) / d,
    dz = ((h.z * forward - Math.sin(hero.yaw) * right) * speed) / d
  if (f.dash > 0) {
    dx += h.x * f.dashSpeed
    dz += h.z * f.dashSpeed
  }
  const climbables =
    jump && field?.ladderGrip ? [...view.land.solids, field.ladderGrip] : view.land.solids
  const climbing =
    !online && active
      ? climbMotion(
          hero,
          keys.has('Space'),
          jump,
          climbables,
          data.items.includes('耐磨攀爬手套') ? 0.19 : 0,
          dt,
        )
      : null
  if (climbing) {
    dx = climbing.dx
    dz = climbing.dz
    f.stamina = Math.max(
      0,
      f.stamina - (dt * (pack.equipped.body === 'harness' ? 21 : 26)) / stats.stamina,
    )
  }
  const p = hero.pos,
    water = waterAt(id, p.x, p.z),
    immersion = water.wet ? Math.max(0, water.level - p.y) : 0,
    swimming = immersion > (hero.swimming ? 0.38 : 0.58) && water.depth > 0.65,
    wading = immersion > 0.06
  if (wading && !climbing) {
    const carry = Math.min(1, immersion / 1.02) * (swimming ? 1 : 0.45)
    dx = dx * (swimming ? 0.74 : 1 - carry * 0.34) + carry * water.speed * water.flowX
    dz = dz * (swimming ? 0.74 : 1 - carry * 0.34) + carry * water.speed * water.flowZ
  }
  const jumped = jump && !climbing && physics.grounded && f.stamina >= 7
  if (jumped) f.stamina -= 7
  hero.pos = physics.move(
    dx * dt,
    dz * dt,
    dt,
    jumped,
    climbing?.vy ?? false,
    swimming ? water.level : null,
  )
  if (!online && active) {
    const gate = crossedPassage(field.portals, p, hero.pos)
    if (gate) {
      void cross(gate)
      return
    }
  }
  hero.swimming = swimming
  if (!online) {
    const notice = stepCase(medicine, pack, id, hero.pos, swimming, dt)
    if (notice) {
      syncStats()
      save()
      msg(notice, 6)
    }
  }
  hero.wading = wading
  hero.immersion = immersion
  hero.waterVelocity = { x: (hero.pos.x - p.x) / dt, z: (hero.pos.z - p.z) / dt }
  hero.sprint = sprint
  const inTown = id === 'capital' || Math.hypot(p.x, p.z) < 54
  const surface = wading
    ? 'water'
    : id === 'capital'
      ? 'stone'
      : p.y > heightAt(id, p.x, p.z) + 0.65
        ? 'wood'
        : inTown
          ? 'stone'
          : id === 'salt'
            ? 'sand'
            : id === 'gorge'
              ? 'stone'
              : 'leaves'
  const step = footfall(
    hero,
    moving ? Math.hypot(hero.pos.x - p.x, hero.pos.z - p.z) : 0,
    surface,
    physics.grounded || swimming,
  )
  if (step) {
    if (!online && pack.equipped.feet === 'softBoots') {
      step.volume *= 0.85
      hero.noise *= 0.85
    }
    audio.foot(step)
  }
  jump = false
  if (online) {
    online.update(dt)
  } else {
    data.hour = (data.hour + dt / 36) % 24
    const survival = advanceExpedition(pack, dt / 36, {
      activity: climbing
        ? 'climb'
        : swimming && moving
          ? 'swim'
          : sprint
            ? 'sprint'
            : moving
              ? 'walk'
              : 'idle',
      jumps: jumped ? 1 : 0,
      hot: id === 'salt' && data.hour > 10 && data.hour < 16,
    })
    if (survival.burnedOut) msg('松脂燃尽，火把熄灭')
    if (survival.damage) {
      f.hp = Math.max(0, f.hp - survival.damage)
      if (f.hp <= 0) {
        death('饥渴')
        return
      }
    }
    echo(dt)
    people.update(dt, data.hour < 6 || data.hour >= 18)
    saveTimer += dt
    if (saveTimer > 4) {
      saveTimer = 0
      save()
    }
  }
  hero.moving = moving && physics.grounded
  hero.sprint = sprint
}
function echo(dt) {
  if (id !== 'rain' || data.main > 1 || !poi.watch) return
  if ((bellTime -= dt) > 0) return
  const third = bellStep === 2,
    source = third ? poi.lostApprentice : poi.watch,
    p = hero.pos
  const d = length(source, p),
    mask = Math.max(
      0.24,
      Math.min(1, Math.hypot(p.x - biomes.rain.landmark[0], p.z - biomes.rain.landmark[1]) / 55),
    )
  const elevation = p.y - heightAt(id, p.x, p.z) > 3 ? 1.6 : 1
  const vol = Math.min(0.48, (1 / (1 + d / 65)) * 0.54 * mask * elevation)
  if (d < 340 && vol > 0.045) {
    const sx = source.x - p.x,
      sz = source.z - p.z,
      len = Math.hypot(sx, sz) || 1,
      h = heading(hero.yaw),
      side = (sx * Math.cos(hero.yaw) - sz * Math.sin(hero.yaw)) / len,
      front = (h.x * sx + h.z * sz) / len
    audio.note(third ? 360 : 585, third ? 222 : 395, third ? 0.86 : 0.67, vol, 'sine', side)
    if (prefs.captions) {
      const dir =
        d < 3
          ? '近旁'
          : (Math.abs(side) > 0.38 ? (side > 0 ? '右' : '左') : '') + (front < -0.26 ? '后方' : '前方')
      $('caption').textContent = dir + ' · ' + (third ? '下游传来一声低沉的金属回响' : '观测台铜钟')
      hero.captionTTL = 2.1
    }
  }
  bellStep = (bellStep + 1) % 3
  bellTime = third ? 13 : bellStep === 2 ? 1.8 : 1.1
}
function ui() {
  if (!online) syncStats()
  const f = hero.f,
    b = biomes[id],
    p = hero.pos,
    inside = id === 'capital' ? Math.max(Math.abs(p.x), Math.abs(p.z)) < 222 : Math.hypot(p.x, p.z) < 55,
    ang = ((((-hero.yaw * 180) / Math.PI) % 360) + 360) % 360,
    ds = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'],
    index = Math.round(ang / 45) % 8
  $('direction').textContent = ds[(index + 7) % 8]
  $('heading').textContent = ds[index] + '　' + Math.round(ang) + '°'
  $('direction2').textContent = ds[(index + 1) % 8]
  const underground = p.y < b.level - 2.4 && inside,
    upper = p.y > b.level + 3 && inside
  $('area').textContent = inside
    ? b.city
    : Math.hypot(p.x - b.landmark[0], p.z - b.landmark[1]) < 44
      ? b.wild
      : b.name
  $('weather').textContent = online
    ? '房间对战'
    : hero.swimming || hero.wading
      ? hero.swimming
        ? '河道泅渡'
        : '浅水涉行'
      : underground
        ? '地下库窟'
        : upper
          ? '上层观景台'
          : inside
            ? '主城驿区'
            : '野外巡线'
  const hr = Math.floor(data.hour),
    min = Math.floor((data.hour % 1) * 60)
  $('clock').textContent = online
    ? '第 ' + online.round + ' 局　' + Math.ceil(online.time) + ' s'
    : String(hr).padStart(2, '0') +
      ':' +
      String(min).padStart(2, '0') +
      '　' +
      (hr < 6 || hr >= 18 ? '夜间' : '日间')
  $('hpBar').style.width = f.hp + '%'
  $('stBar').style.width = f.stamina + '%'
  $('hpText').textContent = Math.ceil(f.hp) + ' / 100　·　回响 ' + Math.floor(f.charge) + '%'
  $('survival').textContent = online
    ? ''
    : '饱食 ' +
      Math.ceil(pack.food) +
      '　水分 ' +
      Math.ceil(pack.water) +
      (hero.quiet ? '　静步' : '') +
      (hero.crouch ? '　蹲姿' : '') +
      (hero.grip ? '　攀附' : '') +
      (pack.torchLit ? '　火把' : '')
  Array.from($('hotbar').children).forEach((cell, i) => {
    const waiting = f.cd[i] > 0.01
    const charging = i === 3 && f.charge < 99.99
    cell.classList.toggle('cooling', waiting || charging)
    cell.classList.toggle('primed', i === 3 && !charging && !waiting)
    cell.lastElementChild.textContent = waiting
      ? f.cd[i].toFixed(1) + 's'
      : charging
        ? Math.floor(f.charge) + '%'
        : ''
  })
  const tr = $('tracker')
  tr.replaceChildren()
  if (online) {
    tr.append(
      el('b', '双人切磋'),
      el('span', online.score.join(' / ')),
      el('div', room?.transport === 'server' ? '服务器中转' : '点对点直连'),
    )
    $('prompt').textContent = ''
    return
  }
  const goal = activeGoal(),
    guide = questGuide()
  if (pin?.actorId) {
    const actor = people.all.find((a) => a.id === pin.actorId && a.f.hp > 0)
    if (actor) Object.assign(pin, actor.pos)
    else pin = null
  }
  if (pin?.kind === 'case') {
    if (medicine.zone === id && medicine.point) Object.assign(pin, medicine.point)
    else pin = null
  }
  if (people.training)
    tr.append(
      el('b', '人机切磋'),
      el('span', people.training.name + '　' + Math.ceil(people.training.f.hp) + ' HP'),
    )
  else if (guide) {
    tr.append(el('b', guide.name), el('span', guide.title))
    if (guide.target) {
      const bearing = el('div', null, 'routeBearing')
      const arrow = el('i', '↑')
      arrow.setAttribute('aria-hidden', 'true')
      const angle = Math.atan2(guide.target.x - p.x, p.z - guide.target.z) + hero.yaw
      arrow.style.transform = 'rotate(' + angle + 'rad)'
      bearing.append(
        arrow,
        document.createTextNode(
          (guide.gate ? biomes[guide.zone].name + ' · 经' + guide.gate.name + '　' : '') +
            Math.round(length(p, guide.target)) +
            ' m　' +
            pointDirection(p, guide.target),
        ),
      )
      tr.append(bearing)
    }
  } else tr.append(el('b', '自由探索'), el('span', 'T　翻开任务手册'))
  if (pin)
    tr.append(
      el(
        'div',
        '标记 · ' + pin.name + '　' + Math.round(length(p, pin)) + 'm ' + pointDirection(p, pin),
      ),
    )
  const report = people.report
  if (report)
    tr.append(
      el(
        'div',
        '城防警戒 · ' + report.witness + '发现取物' + (report.guard ? '，' + report.guard + '接警' : ''),
      ),
    )
  if (patrol)
    tr.append(
      el(
        'div',
        patrol.done
          ? '双岗联测已完成'
          : '合作巡线 · ' +
              (patrol.other ? biomes[patrol.other.zone].name : '等候同伴') +
              ' · ' +
              (room?.transport === 'server' ? '服务器中转' : '直连'),
      ),
    )
  const list = candidates(),
    focus = people.all.find((a) => a.f.hp > 0 && a.angry && length(a.pos, p) < 25)
  const threshold = field?.portals.find(
    (g) => Math.hypot(p.x - g.x, p.z - g.z) < 15 && Math.abs(p.y - g.y) < 5,
  )
  $('prompt').textContent = list.length
    ? 'R　' + list[0].title + (list.length > 1 ? '　＋' + (list.length - 1) : '')
    : threshold
      ? '穿越光幕 · ' + biomes[threshold.to].name
      : focus
        ? focus.name + '　' + Math.ceil(focus.f.hp) + ' HP'
        : ''
  field?.object(goal)
}
function pointDirection(a, b) {
  const ang = ((Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI + 360) % 360
  return ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(ang / 45) % 8]
}
function frame(ts) {
  requestAnimationFrame(frame)
  if (!view?.land || restoring) return
  const dt = Math.max(0, Math.min(0.1, (ts - (last || ts)) / 1000))
  last = ts
  time += dt
  if (mode === 'play' && hero) {
    if (!panel || online) {
      acc = Math.min(0.15, acc + dt)
      while (acc >= 1 / 60 && mode === 'play') {
        if (!panel || online) update(1 / 60)
        acc -= 1 / 60
      }
    }
    if (mode !== 'play') return
    view.player(
      hero.pos,
      hero.yaw,
      hero.pitch,
      hero.moving && !panel,
      hero.f.guard,
      hero.crouch,
      dt,
      time,
      hero.grip,
      !online && pack.torchLit,
      online ? null : pack.equipped.weapon,
    )
    view.land.setWaterActor?.(
      !online && !panel && hero.wading ? hero.pos : null,
      hero.waterVelocity,
      Math.min(1, (hero.immersion || 0) / 0.6),
    )
    ferry?.update(medicine, time, panel ? 0 : dt, hero.pos)
    const day = view.render(dt, online ? 10 : data.hour, time)
    field?.update(dt, time, day, view.camera)
    patrol?.update(dt)
    if (hero.captionTTL > 0 && (hero.captionTTL -= dt) <= 0) $('caption').textContent = ''
    if (!panel) {
      const px = hero.pos.x,
        pz = hero.pos.z,
        cx = riverX(id, pz),
        bankSound = Math.abs(cx - px) < 54 && id !== 'salt' ? waterAt(id, cx, pz) : null
      const distance = bankSound ? Math.hypot(px - cx, hero.pos.y - bankSound.level) : Infinity
      const waterGain = bankSound?.wet
        ? Math.max(0, 1 - distance / 54) *
          (0.09 + Math.min(1, bankSound.speed / 3) * 0.19 + bankSound.foam * 0.18)
        : 0
      audio.tick(
        dt,
        hero.pos.y < biomes[id].level - 2 && Math.hypot(hero.pos.x, hero.pos.z) < 48,
        day,
        waterGain,
        Math.max(-1, Math.min(1, (cx - px) / Math.max(4, distance))) * Math.cos(hero.yaw),
      )
    }
    if ((uiTimer -= dt) < 0) {
      uiTimer = 0.12
      ui()
    }
    if (feedbackTimer > 0 && (feedbackTimer -= dt) <= 0) $('feedback').textContent = ''
    flash = Math.max(0, flash - dt * 1.7)
    $('hitflash').style.opacity = String(flash)
  } else {
    view.preview(dt, mode === 'survey')
    view.render(dt, 9.5, time)
  }
}
function motion(dx, dy) {
  if (dragging) dragDistance += Math.abs(dx) + Math.abs(dy)
  if (mode === 'survey' && dragging) {
    view.orbit(-dx, dy)
    return
  }
  if (!missingGame() && (document.pointerLockElement === canvas || dragging)) {
    hero.yaw -= dx * 0.0023 * prefs.sensitivity
    hero.pitch = Math.max(-1.43, Math.min(1.43, hero.pitch - dy * 0.0023 * prefs.sensitivity))
  }
}
document.addEventListener('mousemove', (e) => motion(e.movementX, e.movementY))
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button === 2) e.preventDefault()
})
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) {
    e.preventDefault()
    return
  }
  wake()
  dragging = true
  dragDistance = 0
  fallbackClick = false
  if (mode === 'play' && !panel) {
    const captured = document.pointerLockElement === canvas
    inputFocus()
    if (captured) action('light')
    else fallbackClick = true
  }
})
window.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return
  if (fallbackClick && dragDistance < 6 && document.pointerLockElement !== canvas) action('light')
  dragging = false
  fallbackClick = false
})
for (const event of ['contextmenu', 'auxclick'])
  document.addEventListener(
    event,
    (e) => {
      if (e.target === canvas || document.pointerLockElement === canvas) e.preventDefault()
    },
    true,
  )
canvas.addEventListener(
  'wheel',
  (e) => {
    if (mode === 'survey') {
      e.preventDefault()
      view.orbit(0, 0, e.deltaY)
    }
  },
  { passive: false },
)
canvas.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      prevX = t.clientX
      prevY = t.clientY
      dragging = true
    }
  },
  { passive: true },
)
canvas.addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches[0]
    if (!t) return
    motion(t.clientX - prevX, t.clientY - prevY)
    prevX = t.clientX
    prevY = t.clientY
    e.preventDefault()
  },
  { passive: false },
)
canvas.addEventListener('touchend', () => (dragging = false))
const pad = $('touchpad')
function dragPad(e) {
  const rect = pad.getBoundingClientRect(),
    x = ((e.clientX - rect.left) / rect.width) * 2 - 1,
    z = 1 - ((e.clientY - rect.top) / rect.height) * 2,
    len = Math.max(1, Math.hypot(x, z))
  stick.x = x / len
  stick.z = z / len
  pad.firstElementChild.style.transform = 'translate(' + stick.x * 22 + 'px,' + -stick.z * 22 + 'px)'
}
pad.onpointerdown = (e) => {
  pad.setPointerCapture(e.pointerId)
  dragPad(e)
}
pad.onpointermove = (e) => {
  if (pad.hasPointerCapture(e.pointerId)) dragPad(e)
}
pad.onlostpointercapture = () => {
  stick.x = stick.z = 0
  pad.firstElementChild.style.transform = 'none'
}
$('touchActions').onpointerdown = (e) => {
  const target = e.target.closest('button')
  if (!target) return
  e.preventDefault()
  target.setPointerCapture(e.pointerId)
  const { key, action: cmd } = target.dataset
  if (key) {
    keys.add(key)
    if (key === 'Space') jump = true
  } else if (cmd === 'interact') interact()
  else if (cmd === 'pause') pause()
  else if (cmd === 'crouch') hero.crouchLatched = !hero.crouchLatched
  else action(cmd)
}
$('touchActions').addEventListener('lostpointercapture', (e) => keys.delete(e.target.dataset.key))
$('hotbar').onclick = (e) => {
  const cell = e.target.closest('.ability')
  if (cell) action(['q', 'e', 'c', 'v'][Array.from($('hotbar').children).indexOf(cell)])
}
document.addEventListener('keydown', (e) => {
  if (mode === 'play' && !online && e.code === 'Tab' && (!panel || mapHeld)) {
    e.preventDefault()
    if (!e.repeat && !panel) {
      mapHeld = true
      mapPanel()
    }
    return
  }
  if (
    mode === 'play' &&
    ((e.code === 'KeyB' && panel === 'pack') || (e.code === 'KeyT' && panel === 'journal'))
  ) {
    e.preventDefault()
    if (!e.repeat) closeDialog()
    return
  }
  if (e.code === 'Escape') {
    if (panel && panel !== 'dead') {
      closeDialog()
      return
    }
    if (mode === 'play' && !panel) {
      pause()
      return
    }
    if (mode === 'survey') endSurvey()
    return
  }
  if (e.target.matches('input,textarea,select') || missingGame()) return
  if (['Space', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code))
    e.preventDefault()
  keys.add(e.code)
  if (e.code === 'CapsLock') {
    e.preventDefault()
    hero.quiet = true
  }
  if (e.repeat) return
  if (e.code.startsWith('Control')) {
    e.preventDefault()
    hero.ctrlStart = performance.now()
  }
  if (e.code === 'KeyG' && !online) {
    const result = operate(pack, 'torch')
    syncStats()
    save()
    msg(result.message)
  }
  if (e.code === 'KeyB' && !online) inventory()
  if (e.code === 'Space') jump = true
  if (e.code === 'KeyR') interact()
  if (e.code === 'KeyX') action('heavy')
  if (e.code === 'KeyT' && !online) journal()
  if (['KeyQ', 'KeyE', 'KeyC', 'KeyV'].includes(e.code)) action(e.code.slice(3).toLowerCase())
})
document.addEventListener('keyup', (e) => {
  if (e.code === 'Tab' && mapHeld) {
    e.preventDefault()
    mapHeld = false
    if (panel === 'map') closeDialog()
    return
  }
  keys.delete(e.code)
  if (hero && e.code === 'CapsLock') hero.quiet = false
  if (hero && mode === 'play' && !panel && e.code.startsWith('Control') && hero.ctrlStart) {
    if (performance.now() - hero.ctrlStart < 205) hero.crouchLatched = !hero.crouchLatched
    hero.ctrlStart = 0
  }
})
window.addEventListener('blur', () => {
  if (mapHeld && panel === 'map') closeDialog(false)
  keys.clear()
  if (hero) hero.quiet = false
  dragging = false
  if (mode === 'play' && !panel && !online && !patrol) pause()
})
document.addEventListener('pointerlockchange', () => {
  // A tap can release Tab before the browser finishes unlocking for the map.
  // Reconcile that delayed event with the already-visible game.
  if (
    !document.pointerLockElement &&
    !panel &&
    mode === 'play' &&
    performance.now() - mapReleaseTime < 600 &&
    document.hasFocus()
  ) {
    intentionalUnlock = false
    requestAnimationFrame(() => {
      if (!panel && mode === 'play' && !document.pointerLockElement) inputFocus()
    })
    return
  }
  if (intentionalUnlock) {
    intentionalUnlock = false
    if (!document.pointerLockElement) return
  }
  if (!document.pointerLockElement && mode === 'play' && !panel && !entering && !online && !patrol)
    pause()
})
window.addEventListener('pagehide', save)
function startSurvey() {
  wake()
  mode = 'survey'
  atlas.hidden = true
  $('surveyHud').hidden = false
}
function endSurvey() {
  mode = 'atlas'
  atlas.hidden = false
  $('surveyHud').hidden = true
}
function unavailable(reason) {
  const was = online || patrol
  if (was && mode === 'play') toAtlas()
  room = null
  if (panel === 'rooms' || panel === 'manual' || was)
    dialog('联机房间', 'rooms', () => add(el('p', reason), btn('返回联机选项', rooms)))
}
async function linked(link) {
  if (pvpLaunching || online || patrol) return
  pvpLaunching = true
  try {
    const choice = await roomActivity(link, roomChoice)
    if (choice === 'patrol') {
      await enter()
      if (mode !== 'play') {
        link.close()
        return
      }
      patrol = makePatrol(
        link,
        () => ({ view, hero, id, data, poi, physics }),
        msg,
        () => {
          if (!data.items.includes('双岗巡线章')) data.items.push('双岗巡线章')
          save()
        },
      )
      msg('双人巡线 · 相约青雨林，一人在观测台报声，一人在废闸回应。', 7)
    } else {
      id = 'rain'
      fillAtlas()
      await enter(link)
    }
  } catch (e) {
    pvpLaunching = false
    link.close()
    unavailable(e.message)
  }
}
function rooms() {
  dialog('联机房间', 'rooms', () => {
    add(
      el(
        'p',
        '房主选择活动。切磋使用相同的基础属性；合作巡线从白砥城出发，两人可分头前往雨林听雨楼和废闸。',
      ),
    )
    const modes = el('div')
    for (const [k, title] of [
      ['duel', '三局两胜 · 切磋'],
      ['patrol', '双人合作 · 巡线'],
    ])
      modes.append(
        btn(
          title,
          () => {
            if (!room) {
              roomChoice = k
              rooms()
            }
          },
          roomChoice === k ? 'chosen' : '',
        ),
      )
    add(modes)
    const input = el('input')
    input.placeholder = '六位房号'
    input.maxLength = 6
    input.value = (new URLSearchParams(location.search).get('room') || '').toUpperCase().slice(0, 6)
    input.setAttribute('aria-label', '房号')
    const status = el('p', '', 'muted')
    const start = (invite) => {
      room?.close?.()
      room = null
      const note = el('p', invite ? '正在加入好友的房间…' : '正在分配六位房号…')
      note.setAttribute('role', 'status')
      let code
      const share = btn('复制邀请链接', async () => {
        const url = new URL(location.href)
        url.search = ''
        url.hash = ''
        url.searchParams.set('room', code)
        try {
          await navigator.clipboard.writeText(url.href)
          note.textContent = '房号　' + code + '　｜　邀请链接已复制，请发给好友'
        } catch {
          const box = el('input')
          box.value = url.href
          box.readOnly = true
          add(box)
          box.select()
        }
      })
      share.hidden = true
      dialog('联机房间', 'rooms', () =>
        add(
          note,
          share,
          btn('取消', () => closeDialog(false)),
        ),
      )
      try {
        room = connectRoom(
          invite,
          (number, text) => {
            code = number
            share.hidden = !!invite
            note.textContent = '房号　' + number + '　｜　' + text
          },
          linked,
          unavailable,
        )
      } catch (e) {
        note.textContent = e.message
      }
    }
    if (location.protocol === 'file:') {
      const web = el('a', '打开正式站远程联机')
      web.href = 'https://fault-line-echoes.vercel.app/?multiplayer=1'
      add(el('p', '六位房号和服务器中转由正式站提供。'), web)
    } else
      add(
        el('p', '房主创建后把房号或邀请链接发给好友。双方保留游戏页面，接通后会自动入场。', 'muted'),
        btn('创建房间', () => start(null)),
        input,
        btn('加入房间', () => {
          if (input.value.trim().length === 6) start(input.value)
          else status.textContent = '请输入六位房号'
        }),
        status,
      )
    add(
      el('h3', '手动直连'),
      el('p', '也可与好友交换两段连接码，建立浏览器之间的 WebRTC 通道。', 'muted'),
      btn('生成邀请', () => manual(true)),
      btn('粘贴好友邀请', () => manual(false)),
    )
  })
}
function manual(host) {
  room?.close?.()
  dialog(host ? '点对点邀请' : '加入直连', 'manual', () => {
    const wire = manualRoom(host, linked, unavailable)
    room = wire
    const local = el('textarea'),
      remote = el('textarea'),
      status = el('p', '', 'muted')
    local.readOnly = true
    local.setAttribute('aria-label', '本机连接码')
    remote.setAttribute('aria-label', '对方连接码')
    remote.placeholder = host ? '粘贴好友的应答码' : '粘贴好友的邀请码'
    for (const t of [local, remote]) {
      t.rows = 3
      t.style.cssText =
        'display:block;width:100%;margin:8px 0;background:#16231e;color:#d6dfcd;border:1px solid #91866b'
    }
    if (host) {
      add(el('p', '先把邀请码发给好友，再粘贴对方返回的应答码。'))
      wire
        .makeLocal()
        .then((t) => (local.value = t))
        .catch((e) => (status.textContent = e.message))
    } else add(el('p', '粘贴好友的邀请码，生成应答码后发回给房主。'))
    add(
      remote,
      btn(host ? '连接好友' : '生成应答码', async () => {
        try {
          await wire.take(remote.value)
          if (!host) local.value = await wire.makeLocal()
          status.textContent = host ? '正在建立连接…' : '将本机应答码发回给房主。'
        } catch (e) {
          status.textContent = e.message
        }
      }),
      local,
      btn('复制本机连接码', async () => {
        try {
          await navigator.clipboard.writeText(local.value)
          status.textContent = '已复制'
        } catch {
          local.select()
          status.textContent = '已选中，可按 Ctrl+C 复制'
        }
      }),
      status,
    )
  })
}
$('enter').onclick = () => enter()
$('roleButton').onclick = rolePanel
$('atlasMode').onclick = () => {
  closeDialog(false)
  endSurvey()
}
$('options').onclick = options
$('roomButton').onclick = rooms
$('survey').onclick = startSurvey
$('endSurvey').onclick = endSurvey
$('surveyEnter').onclick = () => enter()
$('pauseButton').onclick = pause
$('logButton').onclick = () => (online ? pause() : journal())
$('mapButton').onclick = () => (online ? pause() : mapPanel())
$('packButton').onclick = () => inventory()
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault()
  restoring = true
  save()
  dialog('图形设备已暂停', 'error', () =>
    add(
      el('p', '进度已保存。重新载入可恢复世界。'),
      btn('恢复游戏', () => location.reload()),
    ),
  )
})
fillAtlas()
try {
  view = makeView(canvas, prefs.quality)
  await select(id)
  loadedId = id
  if (
    location.protocol !== 'file:' &&
    (new URLSearchParams(location.search).has('room') ||
      new URLSearchParams(location.search).has('multiplayer'))
  )
    rooms()
  requestAnimationFrame(frame)
} catch (e) {
  fail(e)
}
