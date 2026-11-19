import { biomes } from './biomes.js'
import { roles, length, attackStyle, heading } from './combat.js'
import { avatarLook, actionKeys } from './avatar.js'
import { launchVolley, advanceFlight, flightDisplay } from './perception-flight.js'

// A guest follows the host's room selection even when joining with only a room code.
export function roomActivity(link, choice) {
  return new Promise((resolve, reject) => {
    let timer, limit
    const finish = (mode) => {
      clearInterval(timer)
      clearTimeout(limit)
      resolve(mode)
    }
    link.listen((m) => {
      if (!m || m.protocol !== 'field-2') return
      if (!link.host && ['patrol', 'duel'].includes(m.activity)) {
        link.send({ protocol: 'field-2', accepted: true })
        finish(m.activity)
      }
      if (link.host && m.accepted) finish(choice)
    })
    if (link.host) {
      const hello = () => link.send({ protocol: 'field-2', activity: choice })
      timer = setInterval(hello, 350)
      hello()
    }
    limit = setTimeout(() => {
      clearInterval(timer)
      reject(Error('版本未同步，请双方刷新网页后重新进入房间'))
    }, 14000)
  })
}

export function makePatrol(link, get, notify, award) {
  let other = null,
    model = null,
    ownerScene = null,
    sent = 0,
    beatUntil = 0,
    listener = '',
    done = false,
    age = 0,
    received = 0
  let appearance = '',
    display = null
  const echoes = []
  function clearModel() {
    model?.dispose()
    model = null
    appearance = ''
    display?.dispose()
    display = null
    echoes.length = 0
  }
  function result() {
    if (done) return
    done = true
    award()
    notify('两岗回声一致，巡线联测完成。', 6)
  }
  function stations(who, station) {
    const local = get(),
      spot = local.poi?.[station === 'tower' ? 'watch' : 'oldValve']
    return who?.zone === 'rain' && local.id === 'rain' && spot && length(who, spot) < 4.8
  }
  function signal(who, station, sender) {
    if (!['tower', 'valve'].includes(station) || (sender === 'guest' && age - received > 2)) return
    if (done || !stations(who, station)) return
    if (station === 'tower') {
      beatUntil = age + 18
      listener = sender
      notify('高台已报出第三声，废闸岗有 18 秒确认。', 4)
      link.send({ type: 'bell' })
    } else if (age <= beatUntil && listener && listener !== sender) {
      link.send({ type: 'complete' })
      result()
    } else notify('请另一名行者先在听雨楼报出节拍。', 4)
  }
  link.listen((m) => {
    if (!m || typeof m !== 'object') return
    if (
      m.type === 'loc' &&
      Object.hasOwn(biomes, m.zone) &&
      [m.x, m.y, m.z, m.yaw, m.hour].every(Number.isFinite)
    ) {
      received = age
      other = {
        ...m,
        role: Object.hasOwn(roles, m.role) ? m.role : 'leaf',
        color: /^#[a-f\d]{6}$/i.test(m.color) ? m.color : null,
        skin: avatarLook(m.role, m.skin || m.color).skin,
      }
      return
    }
    if (m.type === 'gesture' && actionKeys.includes(m.key) && other) {
      const { id, view, physics } = get()
      if (!model || id !== other.zone || m.zone !== id || age - received > 1.5) return
      model.perform?.(m.key)
      const spec = attackStyle(other.role, m.key)
      if (![m.yaw, m.pitch].every(Number.isFinite)) return
      const from = { x: other.x, y: other.y + (other.crouch ? 1.08 : 1.64), z: other.z }
      view.castEffect?.(spec, from, heading(m.yaw, m.pitch), other.y)
      if (spec?.flight && physics && echoes.length < 42) {
        display ??= flightDisplay(view.scene)
        for (const p of launchVolley(from, heading(m.yaw, m.pitch), spec)) {
          display.add(p)
          echoes.push(p)
        }
      }
    }
    if (m.type === 'station' && link.host) signal(other, m.station, 'guest')
    if (m.type === 'bell' && !link.host) {
      beatUntil = age + 18
      notify('同伴听到了第三声，废闸岗可以核验。', 4)
    }
    if (m.type === 'complete' && !link.host) result()
  })
  return {
    get other() {
      return other
    },
    get done() {
      return done
    },
    gesture(key) {
      const { hero, id } = get()
      if (hero && actionKeys.includes(key))
        link.send({ type: 'gesture', zone: id, key, yaw: hero.yaw, pitch: hero.pitch })
    },
    interact(station) {
      const { hero, id } = get()
      if (link.host) signal({ ...hero.pos, zone: id }, station, 'host')
      else {
        link.send({ type: 'station', station })
        notify('已向同伴发出信号。', 2)
      }
    },
    update(dt) {
      const { view, hero, id, data, physics } = get()
      if (!hero) return
      age += dt
      sent += dt
      if (sent > 0.09) {
        sent = 0
        link.send({
          type: 'loc',
          zone: id,
          ...hero.pos,
          role: hero.f.role,
          color: hero.color,
          skin: hero.skin,
          guard: hero.f.guard,
          crouch: hero.crouch,
          yaw: hero.yaw,
          hour: data.hour,
          moving: !!hero.moving,
        })
      }
      if (other && !link.host) data.hour = other.hour
      const nextLook = other ? other.role + '/' + other.skin : ''
      if (ownerScene !== view.scene || other?.zone !== id || (model && nextLook !== appearance)) {
        clearModel()
        ownerScene = view.scene
      }
      if (other?.zone === id) {
        if (!model) {
          model = view.actor('player', id, { role: other.role, skin: other.skin })
          appearance = nextLook
          model.group.position.set(other.x, other.y, other.z)
        }
        const v = model.group.position,
          alpha = 1 - Math.exp(-dt * 17)
        v.x += (other.x - v.x) * alpha
        v.y += (other.y - v.y) * alpha
        v.z += (other.z - v.z) * alpha
        model.group.rotation.y = other.yaw + Math.PI
        model.update(
          dt,
          other.moving,
          false,
          age,
          other.guard ? { type: 'guard', progress: 0.5 } : undefined,
        )
        if (display && physics)
          for (let i = echoes.length - 1; i >= 0; i--) {
            const p = echoes[i]
            advanceFlight(p, dt, physics.clear, [])
            display.sync(p)
            if (p.done) echoes.splice(i, 1)
          }
      }
    },
    detach() {
      clearModel()
      ownerScene = null
    },
    close() {
      clearModel()
      link.close()
    },
  }
}
