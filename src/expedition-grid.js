import { items, slots, buyerNames, LARGE_CAPACITY, TORCH_HOURS } from './expedition.js'
import { itemIcon } from './expedition-icons.js'

function tag(name, txt, cls) {
  const el = document.createElement(name)
  if (txt) el.textContent = txt
  if (cls) el.className = cls
  return el
}
const number = (n) => Number(n.toFixed(2)).toString()
export function picture(id, cls = '') {
  const img = tag('img', '', cls)
  img.src = itemIcon(id)
  img.alt = ''
  img.draggable = false
  return img
}

function navigateKeys(e) {
  const cell = e.target.closest('[data-pick]')
  if (!cell) return
  const entries = [...e.currentTarget.querySelectorAll('[data-pick]')]
  const i = entries.indexOf(cell)
  const top = entries[0].offsetTop
  const row = entries.findIndex((n) => n.offsetTop !== top)
  const columns = row < 0 ? entries.length : row
  const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }
  let target
  if (Object.hasOwn(offset, e.key)) target = Math.max(0, Math.min(entries.length - 1, i + offset[e.key]))
  else if (e.key === 'Home') target = 0
  else if (e.key === 'End') target = entries.length - 1
  else return
  e.preventDefault()
  e.stopPropagation()
  entries[target].click()
}

export function inventoryGrid(list, pack, context, state, { render, trigger, attributes, gearOnly }) {
  const stock = Object.keys(pack.items).filter((id) => !gearOnly || items[id].slot)
  const picks = [
    ...stock.map((id) => ({ key: 'item-' + id, id, qty: pack.items[id] })),
    ...Object.keys(slots).map((slot) => ({ key: 'slot-' + slot, id: pack.equipped[slot], slot })),
  ]
  if (!gearOnly && pack.torchHours > 0) picks.unshift({ key: 'held-torch', id: 'torch', held: true })
  if (!gearOnly)
    for (const [id, qty] of Object.entries(pack.pending))
      picks.push({ key: 'pending-' + id, id, qty, pending: true })
  const chosen = picks.find((p) => p.key === state.key) || picks.find((p) => p.id) || picks[0]
  state.key = chosen.key
  const select = (key) => {
    const root = list.closest('.exp-pack')
    state.key = key
    state.drop = ''
    render()
    const target = root?.querySelector('[data-pick="' + key + '"]')
    target?.focus({ preventScroll: true })
  }
  const category = (item) =>
    item.slot
      ? slots[item.slot]
      : item.quest
        ? '委托物品'
        : item.relief
          ? '药剂'
          : item.dish
            ? '生肉'
            : item.water && !item.food
              ? '饮水'
              : item.food
                ? '食物'
                : item.species
                  ? '采集材料'
                  : '行旅物资'
  function cell(entry) {
    const { id, slot, qty, key } = entry
    const item = items[id],
      label = item?.name || (slot === 'weapon' ? '空手' : '空')
    const button = tag(
      'button',
      '',
      'exp-cell' + (slot ? ' exp-slot' : '') + (!item ? ' exp-vacant' : ''),
    )
    button.type = 'button'
    button.dataset.pick = key
    button.setAttribute(
      'aria-label',
      (slot ? slots[slot] + '：' : '') + label + (qty ? '，数量 ' + qty : ''),
    )
    button.setAttribute('aria-pressed', String(chosen.key === key))
    button.onclick = () => select(key)
    if (slot) button.append(tag('small', slots[slot]))
    button.append(picture(id || slot))
    button.append(tag('span', label, 'exp-cell-name'))
    if (qty) button.append(tag('b', '×' + qty, 'exp-count'))
    if (entry.pending) button.append(tag('small', '待领', 'exp-pin'))
    else if (entry.held) button.append(tag('small', pack.torchLit ? '燃' : '熄', 'exp-pin'))
    return button
  }
  function fieldset(title, cls, children) {
    const grid = tag('div', '', cls)
    grid.setAttribute('role', 'group')
    grid.setAttribute('aria-label', title)
    grid.onkeydown = navigateKeys
    children.forEach((x) => grid.append(cell(x)))
    return grid
  }
  function addAction(actions, label, action, id, css) {
    const button = tag('button', label, css)
    button.type = 'button'
    button.dataset.operation = action
    button.onclick = () => {
      const root = list.closest('.exp-pack')
      if (action === 'drop' && state.drop !== id) {
        state.drop = id
        render()
        root?.querySelector('[data-operation="drop"]')?.focus({ preventScroll: true })
        return
      }
      state.drop = ''
      trigger(action, id, () => {
        if (action === 'equip') state.key = 'slot-' + items[id].slot
        else if (action === 'unequip' || action === 'claim') state.key = 'item-' + chosen.id
        else if (action === 'light') state.key = 'held-torch'
      })
      const nextAction = root?.querySelector('[data-operation="' + action + '"]')
      const selected = root?.querySelector('[data-pick][aria-pressed="true"]')
      const focus = state.key === chosen.key && nextAction ? nextAction : selected
      focus?.focus({ preventScroll: true })
    }
    actions.append(button)
  }
  function detail() {
    const out = tag('aside', '', 'exp-inspect'),
      { id, slot, qty } = chosen,
      item = items[id]
    out.setAttribute('aria-label', '选中物品')
    const illustration = tag('div', '', 'exp-illustration')
    illustration.append(picture(id || slot, !item ? 'exp-ghost' : ''))
    out.append(illustration)
    if (!item) {
      out.append(
        tag('small', slots[slot] + ' · 穿戴位', 'exp-kind'),
        tag('strong', slot === 'weapon' ? '空手' : '尚未穿戴', 'exp-item-title'),
        tag('p', slot === 'weapon' ? '当前使用角色本身的徒手招式。' : '选中行囊里的对应装备即可穿戴。'),
      )
      return out
    }
    const kind = chosen.held
      ? '随身照明'
      : chosen.pending
        ? '待领取的奖励'
        : slot
          ? '已穿戴 · ' + slots[slot]
          : category(item)
    out.append(tag('small', kind, 'exp-kind'), tag('strong', item.name, 'exp-item-title'))
    const facts = tag('div', '', 'exp-facts')
    if (qty) facts.append(tag('b', '× ' + qty))
    facts.append(
      tag('span', number(item.volume * (qty || 1)) + ' L'),
      tag('span', number(item.mass * (qty || 1)) + ' kg'),
    )
    out.append(facts)
    if (qty > 1)
      out.append(
        tag('small', '每份 ' + number(item.volume) + ' L · ' + number(item.mass) + ' kg', 'exp-per'),
      )
    const effects = attributes(item)
    if (id === 'torch')
      effects.push(
        chosen.held
          ? '燃料剩余 ' + number(pack.torchHours) + ' 小时'
          : '每支照明 ' + TORCH_HOURS + ' 小时',
      )
    if (id === 'fieldPack') effects.push('容量扩至 ' + LARGE_CAPACITY + ' L')
    if (effects.length) out.append(tag('p', effects.join(' · '), 'exp-effect'))
    out.append(tag('p', item.purpose || ''), tag('small', '来源　' + item.source, 'exp-source'))
    if (item.buyer) out.append(tag('small', '收购　' + buyerNames[item.buyer], 'exp-source'))
    const actions = tag('div', '', 'exp-actions exp-detail-actions'),
      action = (label, a, target = id, cls) => addAction(actions, label, a, target, cls)
    if (slot) action('卸下', 'unequip', slot, 'exp-minor')
    else if (chosen.held) action(pack.torchLit ? '熄灭' : '重新点亮', 'torch')
    else if (chosen.pending) action('收进包里', 'claim')
    else {
      if (item.relief) action('服用药剂', 'use')
      else if (item.food || item.water) action(item.food ? '吃一份' : '喝一份', 'use')
      if (item.slot) action(gearOnly ? '换上' : '装备', 'equip')
      if (id === 'fieldPack' && !pack.upgraded) action('扩容', 'upgrade')
      if (id === 'torch' && !pack.torchHours) action('点亮', 'light')
      if (
        item.dish &&
        (context.fire ||
          (context.zone === 'capital' && context.merchant && context.service === 'butcher'))
      )
        action('烤熟', 'cook')
      if (context.fire && ['riverWater', 'dirtyWater'].includes(id)) action('煮水', 'boil')
      action(state.drop === id ? '确定放下 1 份' : '放下', 'drop', id, 'exp-minor')
    }
    out.append(actions)
    return out
  }
  const worn = picks.filter((p) => p.slot),
    carried = picks.filter((p) => !p.slot)
  const layout = tag('div', '', 'exp-inventory'),
    left = tag('div', '', 'exp-collection')
  left.append(tag('h3', '身上装备'), fieldset('五个装备部位', 'exp-slots', worn))
  left.append(tag('h3', gearOnly ? '备用装备' : '行囊物品'))
  if (carried.length) left.append(fieldset('携带物品', 'exp-grid', carried))
  else
    left.append(
      tag('p', gearOnly ? '当前没有备用装备。' : '行囊是空的。可向城中居民领取干粮。', 'exp-empty'),
    )
  layout.append(left, detail())
  list.append(layout)
}
