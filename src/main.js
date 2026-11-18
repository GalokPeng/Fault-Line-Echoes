import { biomes, heightAt, riverX, riverWidth } from './biomes.js'
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

const $ = (id) => document.getElementById(id),
  canvas = $('world'),
  atlas = $('atlas'),
  hud = $('hud'),
  dlg = $('dialog'),
  body = $('dialogBody')
const data = readSave(),
  audio = soundscape(),
  ids = Object.keys(biomes),
  roman = ['I', 'II', 'III', 'IV'],
  zh = ['壹', '贰', '叁', '肆']
let prefs = { sound: true, quality: 'auto', sensitivity: 1 }
try {
  Object.assign(prefs, JSON.parse(localStorage.getItem('faultline.field.preferences')) || {})
} catch {}
audio.enable(prefs.sound)
let id = ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'rain',
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
const escapeLock = () => {
  if (document.pointerLockElement === canvas) document.exitPointerLock()
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
  }
  writeSave(data)
}
function dialog(title, name, content, closable = true) {
  panel = name
  keys.clear()
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
  const cancelRoom = (panel === 'rooms' || panel === 'manual') && !pvpLaunching
  panel = ''
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
      choice.append(el('small', r.skills.join(' · ') + '　｜　' + r.passive))
      add(choice)
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
        'WASD 移动，鼠标环视，方向键亦可转动视角。左键轻击、右键重击，Q / E / C 释放技能，V 释放蓄满的绝技。',
      ),
      el(
        'p',
        '按住 F 朝来袭方向格挡。Shift 疾跑，Z 潜行，空格跳跃，在树干旁按住空格攀爬。R 对话或调查，T 打开手记，Esc 释放鼠标与暂停。',
      ),
    )
  })
}
function fillAtlas() {
  const b = biomes[id],
    i = ids.indexOf(id)
  $('worldTitle').textContent = b.name
  $('worldEnglish').textContent = b.english
  $('worldDesc').textContent = b.description
  $('chapter').textContent = '第 ' + zh[i] + ' 境　/　REGION 0' + (i + 1)
  $('cityTitle').textContent = b.city
  $('wildTitle').textContent = b.wild
  $('edgeInfo').textContent = 'BASIN SURVEY　 ·　' + roman[i] + ' / IV'
  $('backdrop').style.backgroundImage = 'url(/atlas/' + id + '.webp)'
  document.querySelectorAll('.region').forEach((e) => {
    const on = e.dataset.id === id
    e.classList.toggle('selected', on)
    e.setAttribute('aria-pressed', String(on))
  })
}
for (const [i, b] of Object.values(biomes).entries()) {
  const e = btn('', () => select(b.id), 'region')
  e.dataset.id = b.id
  e.style.setProperty('--img', 'url(/atlas/' + b.id + '.webp)')
  e.append(el('small', roman[i]), el('strong', b.name), el('em', b.english))
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
function activeGoal() {
  const task = current(data)
  return task && task.step.zone === id ? { ...task, p: poi?.[task.step.point] } : null
}
function storyPanel(task, which = data.tracked) {
  const s = task.step
  const finish = (choice) => {
    const reward = completeStep(data, which, choice)
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
    } else if (s.listen) {
      const sample = btn('听取回声', () => {
        audio.note(560, 490, 0.28)
        setTimeout(() => audio.note(480, 430, 0.25), 380)
        setTimeout(() => audio.note(390, 350, 0.52), 900)
        sample.disabled = true
        setTimeout(() => {
          if (panel === 'story') add(btn('记录节拍', () => finish()))
        }, 1200)
      })
      add(sample)
    } else add(btn('记录并继续', () => finish()))
  })
}
function journal() {
  dialog('巡线手记', 'journal', () => {
    const which = data.tracked,
      c = current(data)
    const cv = el('canvas', null, 'mapImg')
    add(cv)
    drawMap(cv, id, hero.pos, view.town.features, activeGoal()?.p)
    add(el('p', biomes[id].city + '　·　世界志可随时前往其他三境。', 'muted'), el('h3', '正在追踪'))
    if (c)
      add(
        el(
          'p',
          c.q.name +
            '　｜　' +
            (c.step.hidden ? c.step.clue : c.step.label) +
            ' · ' +
            biomes[c.step.zone].name,
        ),
      )
    else add(el('p', data.ending ? '盆地结局 · ' + data.ending : '此线已完成'))
    add(
      el('h3', '主线　' + Math.min(9, data.main) + ' / 9'),
      btn(
        main[data.main]?.name || '新水位线 · 完成',
        () => {
          data.tracked = 'main'
          save()
          journal()
        },
        which === 'main' ? 'chosen' : '',
      ),
    )
    add(el('h3', '当地支线'))
    for (const q of side.filter((s) => s.zone === id)) {
      const s = current(data, q.id)
      const e = btn(
        q.name + (s ? '' : ' ✓'),
        () => {
          data.tracked = q.id
          save()
          journal()
        },
        which === q.id ? 'chosen' : '',
      )
      e.disabled = !s
      add(e)
    }
    add(el('h3', '行囊与线索'), el('p', data.items.join('、') || '尚无领取的奖励。'))
    if (data.secrets.length) add(el('p', data.secrets.join(' · ')))
    add(
      btn('返回世界', () => closeDialog()),
      btn('打开四境世界志', toAtlas),
    )
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
      add(btn('巡线手记', journal), btn('四境世界志', toAtlas))
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
      if (Math.hypot(hero.pos.x, hero.pos.z) < 55 && !people.training)
        add(
          el('h3', '主城驿站'),
          btn('休息至黎明', () => rest(6.2)),
          btn('休息至夜间', () => rest(21.5)),
        )
    } else add(btn('离开房间', toAtlas))
  })
}
function rest(h) {
  if (people.all.some((a) => a.angry && a.f.hp > 0 && length(a.pos, hero.pos) < 25)) {
    msg('警戒中，先离开冲突范围')
    closeDialog()
    return
  }
  data.hour = h
  hero.f.hp = 100
  save()
  closeDialog()
  msg(h > 12 ? '入夜，城灯已亮' : '天色渐明，街市苏醒')
}
function interact() {
  if (online) return
  const goal = activeGoal()
  if (goal?.p && length(hero.pos, goal.p) < 4.4) {
    storyPanel(goal)
    return
  }
  const a = people.nearby()
  if (a) {
    dialog(a.name, 'speak', () => {
      add(
        el('small', biomes[id].city + '　/　' + a.job, 'muted'),
        el('p', people.speak(a)),
        btn('告别', () => closeDialog()),
        btn('翻开当地手记', journal),
      )
      if (a.kind === 'guard')
        add(
          btn('邀请切磋', () => {
            duelQuest = null
            closeDialog()
            people.startDuel('stone', '守卫陪练')
          }),
        )
    })
    return
  }
  msg('靠近居民、手记标记或调查地点后再按 R')
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
          const b = biomes[id],
            p = b.spawn
          physics.teleport(p[0], heightAt(id, ...p), p[1])
          hero.pos = physics.feet()
          hero.f = fighter(data.role)
          inputFocus()
          save()
          msg('已在' + b.city + '苏醒')
        }),
      )
    },
    false,
  )
}
function events() {
  return {
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
        save()
        msg('通过对决' + (reward ? '　取得 ' + reward : ''), 4)
      } else msg('切磋结束　胜出', 4)
    },
  }
}
async function enter(link = null) {
  if (entering || !view) return
  entering = true
  const n = ++requestId
  wake()
  closeDialog(false)
  loading(true, '正在进入' + biomes[id].city + '…')
  await paint()
  try {
    if (!view.land || loadedId !== id) {
      view.load(id)
      loadedId = id
    }
    const b = biomes[id],
      s = link ? null : data.positions[id],
      origin = { x: b.spawn[0], y: heightAt(id, ...b.spawn), z: b.spawn[1] },
      p = s && ['x', 'y', 'z'].every((k) => Number.isFinite(s[k])) ? s : origin
    physics = await makePhysics(view.land.ground, view.land.solids, view.town.colliders, p, b.radius)
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
      color: skins[data.skin] || roles[char].color,
      crouch: false,
    }
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
      people = makePeople(view, id, physics, hero, events())
      if (!data.visited.includes(id)) data.visited.push(id)
      save()
    }
    $('roleName').textContent = roles[char].name + '　/　' + roles[char].type
    $('hotbar').replaceChildren(
      ...roles[char].skills.map((name, i) => {
        const cell = el('span', null, 'ability')
        cell.append(el('b', ['Q', 'E', 'C', 'V'][i]), el('span', name))
        return cell
      }),
    )
    msg(link ? '正在同步房间' : '已抵达' + b.city + '　·　鼠标环视，T 查看地图', 4)
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
let loadedId = null
function toAtlas() {
  const oldOnline = online
  online = null
  pvpLaunching = !!oldOnline
  if (!oldOnline) save()
  mode = 'atlas'
  oldOnline?.close()
  room?.close?.()
  room = null
  pvpLaunching = false
  people?.dispose()
  people = null
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
  view.punch()
  audio.note(spec.shot ? 385 : 132, spec.shot ? 115 : 58, 0.12, 0.13, 'triangle')
  const hits = people.strike(spec)
  if (!hits) msg(spec.name, 0.65)
}
function update(dt) {
  const f = hero.f
  if (!online) recover(f, dt)
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
  f.guard = active && keys.has('KeyF') && f.busy <= 0
  hero.crouch = active && keys.has('KeyZ') && !online
  const moving = !!(forward || right),
    sprint = active && moving && keys.has('ShiftLeft') && f.stamina > 8 && !f.guard
  const speed = roles[f.role].speed * (sprint ? 1.57 : hero.crouch ? 0.56 : f.guard ? 0.52 : 1)
  if (sprint) f.stamina = Math.max(0, f.stamina - 20 * dt)
  const h = heading(hero.yaw),
    d = Math.hypot(forward, right) || 1
  let dx = ((h.x * forward + Math.cos(hero.yaw) * right) * speed) / d,
    dz = ((h.z * forward - Math.sin(hero.yaw) * right) * speed) / d
  if (f.dash > 0) {
    dx += h.x * f.dashSpeed
    dz += h.z * f.dashSpeed
  }
  const canClimb = active && !online && keys.has('Space') && f.stamina > 3 && nearTrunk()
  if (canClimb) f.stamina = Math.max(0, f.stamina - dt * (data.items.includes('轻型攀爬背带') ? 16 : 23))
  const b = biomes[id],
    p = hero.pos,
    swimming = Math.abs(p.x - riverX(id, p.z)) < riverWidth(id, p.z) && p.y < b.waterLevel - 0.22
  hero.pos = physics.move(dx * dt, dz * dt, dt, jump, canClimb, swimming ? b.waterLevel : null)
  hero.swimming = swimming
  jump = false
  if (online) {
    online.update(dt)
  } else {
    data.hour = (data.hour + dt / 36) % 24
    people.update(dt, data.hour < 6 || data.hour > 18)
    saveTimer += dt
    if (saveTimer > 4) {
      saveTimer = 0
      save()
    }
  }
  hero.moving = moving && physics.grounded
  hero.sprint = sprint
}
function nearTrunk() {
  const p = hero.pos,
    r = data.items.includes('耐磨攀爬手套') ? 1.07 : 0.78
  return view.land.solids.some(
    (s) =>
      s.h > 4 &&
      p.y >= s.y - 0.5 &&
      p.y < s.y + s.h - 0.55 &&
      Math.hypot(p.x - s.x, p.z - s.z) < s.r + r,
  )
}
function ui() {
  const f = hero.f,
    b = biomes[id],
    p = hero.pos,
    inside = Math.hypot(p.x, p.z) < 55,
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
    : hero.swimming
      ? '河道涉渡'
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
  Array.from($('hotbar').children).forEach(
    (cell, i) =>
      (cell.lastChild.textContent = f.cd[i] > 0.01 ? f.cd[i].toFixed(1) + 's' : roles[f.role].skills[i]),
  )
  const tr = $('tracker')
  tr.replaceChildren()
  if (online) {
    tr.append(el('b', '双人切磋'), el('span', online.score.join(' / ')))
    $('prompt').textContent = ''
    return
  }
  const goal = activeGoal(),
    currentTask = current(data)
  if (people.training)
    tr.append(
      el('b', '人机切磋'),
      el('span', people.training.name + '　' + Math.ceil(people.training.f.hp) + ' HP'),
    )
  else if (currentTask) {
    tr.append(
      el('b', currentTask.q.name),
      el('span', currentTask.step.hidden ? '寻访线索' : currentTask.step.label),
    )
    if (goal?.p && !currentTask.step.hidden)
      tr.append(el('div', Math.round(length(p, goal.p)) + ' m　' + pointDirection(p, goal.p)))
    else if (!goal) tr.append(el('div', biomes[currentTask.step.zone].name))
  }
  const npc = people.nearby(),
    focus = people.all.find((a) => a.f.hp > 0 && a.angry && length(a.pos, p) < 20)
  $('prompt').textContent =
    goal?.p && length(p, goal.p) < 4.4
      ? 'R　' + goal.step.label
      : npc
        ? 'R　与' + npc.name + '交谈'
        : focus
          ? focus.name + '　' + Math.ceil(focus.f.hp) + ' HP'
          : ''
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
      while (acc >= 1 / 60) {
        if (!panel || online) update(1 / 60)
        acc -= 1 / 60
      }
    }
    view.player(
      hero.pos,
      hero.yaw,
      hero.pitch,
      hero.moving && !panel,
      hero.f.guard,
      hero.crouch,
      dt,
      time,
    )
    const day = view.render(dt, online ? 10 : data.hour, time)
    if (!panel) {
      audio.tick(
        dt,
        hero.moving,
        hero.sprint,
        hero.pos.y < biomes[id].level - 2 && Math.hypot(hero.pos.x, hero.pos.z) < 48,
        day,
        hero.crouch || data.items.includes('软底护套'),
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
canvas.addEventListener('mousedown', (e) => {
  wake()
  dragging = true
  dragDistance = 0
  fallbackClick = false
  if (mode === 'play' && !panel) {
    const captured = document.pointerLockElement === canvas
    inputFocus()
    if (captured || e.button === 2) action(e.button === 2 ? 'heavy' : 'light')
    else fallbackClick = e.button === 0
  }
})
window.addEventListener('mouseup', () => {
  if (fallbackClick && dragDistance < 6 && document.pointerLockElement !== canvas) action('light')
  dragging = false
  fallbackClick = false
})
canvas.addEventListener('contextmenu', (e) => e.preventDefault())
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
  else action(cmd)
}
$('touchActions').addEventListener('lostpointercapture', (e) => keys.delete(e.target.dataset.key))
$('hotbar').onclick = (e) => {
  const cell = e.target.closest('.ability')
  if (cell) action(['q', 'e', 'c', 'v'][Array.from($('hotbar').children).indexOf(cell)])
}
document.addEventListener('keydown', (e) => {
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
  if (e.repeat) return
  if (e.code === 'Space') jump = true
  if (e.code === 'KeyR') interact()
  if (e.code === 'KeyT' && !online) journal()
  if (['KeyQ', 'KeyE', 'KeyC', 'KeyV'].includes(e.code)) action(e.code.slice(3).toLowerCase())
})
document.addEventListener('keyup', (e) => keys.delete(e.code))
window.addEventListener('blur', () => {
  keys.clear()
  dragging = false
  if (mode === 'play' && !panel && !online) pause()
})
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && mode === 'play' && !panel && !entering && !online) pause()
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
  const was = online
  if (was && mode === 'play') toAtlas()
  if (panel === 'rooms' || panel === 'manual' || was)
    dialog('联机房间', 'rooms', () => add(el('p', reason), btn('返回联机选项', rooms)))
}
async function linked(link) {
  if (pvpLaunching || online) return
  pvpLaunching = true
  id = 'rain'
  fillAtlas()
  await enter(link)
}
function rooms() {
  dialog('联机房间', 'rooms', () => {
    add(el('p', '两名行者在汇流镇练习场切磋，三局两胜。角色以标准状态入场，装束随行。'))
    const input = el('input')
    input.placeholder = '六位房号'
    input.maxLength = 6
    input.setAttribute('aria-label', '房号')
    const status = el('p', '', 'muted')
    const start = async (invite) => {
      room?.close?.()
      rooms()
      const note = el('p', '正在联系信令服务…')
      add(note)
      try {
        room = await connectRoom(
          invite,
          (number, text) => (note.textContent = '房号　' + number + '　｜　' + text),
          linked,
          unavailable,
        )
      } catch (e) {
        note.textContent = e.message
      }
    }
    add(
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
  requestAnimationFrame(frame)
} catch (e) {
  fail(e)
}
