import { items, sources, marketFor, recipesFor, aidFor, expeditionStats, operate } from './expedition.js'
import { inventoryGrid, picture } from './expedition-grid.js'
import './expedition.css'

function element(tag, label, cls) {
  const e = document.createElement(tag)
  if (label != null) e.textContent = label
  if (cls) e.className = cls
  return e
}
const format = (n) => Number(n.toFixed(2)).toString()

function attributes(item) {
  const parts = []
  if (item.relief) parts.push('不适时间 −' + item.relief + ' 小时')
  if (item.food) parts.push('饱食 +' + item.food)
  if (item.water) parts.push('水分 +' + item.water)
  if (item.risk === 1) parts.push('饮用会引发不适')
  else if (item.risk) parts.push('生用有不适风险')
  if (item.attack) parts.push('攻击 +' + item.attack)
  if (item.armor) parts.push('减伤 ' + item.armor + '%')
  if (item.speed) parts.push('步速 +' + Math.round(item.speed * 100) + '%')
  if (item.stamina) parts.push('耐力恢复 +' + Math.round(item.stamina * 100) + '%')
  return parts
}

export function openPack(container, pack, context = {}, onChange = () => {}) {
  const aid = aidFor(context)
  let tab =
    context.tab ||
    (context.merchant ? 'market' : aid || context.waterSource || context.fire ? 'local' : 'bag')
  let feedback = ''
  let success = true
  const state = { key: '', drop: '' }
  const panel = element('div', null, 'exp-pack')
  container.replaceChildren(panel)
  function button(title, fn, css) {
    const b = element('button', title, css)
    b.type = 'button'
    b.onclick = fn
    return b
  }
  function trigger(action, id, onSuccess) {
    const result = operate(pack, action, id, context)
    feedback = result.message
    success = result.ok
    if (result.ok) {
      onSuccess?.()
      onChange(result)
    }
    render()
  }
  const act = (label, action, id, cls) => button(label, () => trigger(action, id), cls)
  const atButcher = context.merchant && context.zone === 'capital' && context.service === 'butcher'
  function cookable() {
    return Object.keys(pack.items).filter((id) => items[id].dish)
  }
  function line(name, detail, actions = [], icon = '') {
    const li = element('div', null, 'exp-line'),
      text = element('div', null, 'exp-line-text')
    text.append(element('b', name))
    if (detail) text.append(element('small', detail))
    if (icon) li.append(picture(icon, 'exp-shop-icon'))
    li.append(text)
    if (actions.length) {
      const group = element('div', null, 'exp-actions')
      group.append(...actions)
      li.append(group)
    }
    return li
  }
  function meter(label, n, max, value, tone) {
    const wrap = element('div', null, 'exp-meter')
    const row = element('div')
    row.append(element('span', label), element('b', value))
    const bar = element('progress', null, tone)
    bar.max = max
    bar.value = n
    bar.setAttribute('aria-label', label)
    wrap.append(row, bar)
    return wrap
  }
  function local(list) {
    if (context.waterSource && sources[context.waterSource]) {
      const source = sources[context.waterSource]
      list.append(
        line(
          source.name,
          source.item === 'water'
            ? '井水可直接饮用，每次取 0.5 L。'
            : '野外取水留到炉边煮沸，可消除游戏中的污染。',
          [act('装半升', 'fill'), act('就地饮水', 'sourceDrink')],
        ),
      )
    }
    if (context.fire) {
      const actions = []
      for (const id of ['dirtyWater', 'riverWater'])
        if (pack.items[id]) actions.push(act('煮' + items[id].name, 'boil', id))
      for (const id of cookable())
        actions.push(act('烤' + (id === 'rawMeat' ? '兽肉' : items[id].name), 'cook', id))
      list.append(
        line(
          '炉灶与营火',
          actions.length ? '每次处理一份材料。' : '可在这里煮野外取的水、烤生肉。',
          actions,
        ),
      )
    }
    if (aid) charity(list)
    if (!context.waterSource && !context.fire && !aid)
      list.append(line('附近没有补给点', '可在城内与居民交谈，到井边取水，或沿河岸找水。'))
  }
  function charity(list) {
    const actions = [act(aid.key === 'beggar' ? '请求分食' : '领取赠礼', 'receiveAid')]
    if (aid.key === 'beggar') actions.push(act('递一只包子', 'offerAid'))
    list.append(line(aid.title, aid.detail, actions))
  }
  function market(list) {
    const shop = marketFor(context)
    if (!context.merchant || !shop) {
      list.append(line('前往集市', '靠近城里的商贩，可查看当地货单与收购价。'))
      return
    }
    list.append(line(shop.name, shop.craft))
    if (aid) charity(list)
    if (atButcher) {
      const cuts = cookable()
      list.append(
        line(
          '后灶加工',
          '交一份可食生肉，取回一份相应的熟食。',
          cuts.map((id) => act('烤' + items[id].name, 'cook', id)),
        ),
      )
    }
    for (const [product, recipe] of recipesFor(context)) {
      const needed = Object.entries(recipe.materials).map(
        ([id, qty]) => items[id].name + ' ' + (pack.items[id] || 0) + '/' + qty,
      )
      list.append(
        line(
          '工坊 · ' + items[product].name,
          needed.join('　'),
          [act('委托制作', 'craft', product)],
          product,
        ),
      )
    }
    const exchange = shop.barter
    if (exchange)
      list.append(
        line(
          '以物易物',
          items[exchange.take].name +
            ' × ' +
            exchange.qty +
            '　兑换　' +
            items[exchange.give].name +
            ' × ' +
            exchange.count,
          [act('兑换', 'barter')],
        ),
      )
    for (const [id, price] of Object.entries(shop.stock)) {
      const info = ['每件 ' + format(items[id].volume) + ' L', ...attributes(items[id])]
      list.append(
        line(items[id].name, info.join(' · '), [act('买入 · ' + price + ' 券', 'buy', id)], id),
      )
    }
    const absent = []
    for (const [id, price] of Object.entries(shop.buys)) {
      if (pack.items[id])
        list.append(
          line(
            '收购 · ' + items[id].name,
            '持有 ' + pack.items[id],
            [act('卖出 · ' + price + ' 券', 'sell', id)],
            id,
          ),
        )
      else absent.push(items[id].name + ' ' + price + ' 券')
    }
    if (absent.length) {
      const details = element('details', null, 'exp-prices')
      details.append(element('summary', '本店其他收购价'), element('p', absent.join('　·　')))
      list.append(details)
    }
  }
  function render() {
    const prior = panel.querySelector('.exp-list')?.scrollTop || 0
    const s = expeditionStats(pack)
    const head = element('div', null, 'exp-summary')
    head.append(
      meter('行囊容量', s.volume, s.capacity, format(s.volume) + ' / ' + s.capacity + ' L', ''),
      meter('饱食', s.food, 100, Math.ceil(s.food) + '%', 'exp-food'),
      meter('水分', s.water, 100, Math.ceil(s.water) + '%', 'exp-water'),
    )
    const stat = element('div', null, 'exp-stats')
    for (const [k, v] of [
      ['负重', format(s.weight) + ' kg'],
      ['攻击', '+' + s.attackBonus],
      ['减伤', s.armor + '%'],
      ['步速', Math.round(s.speed * 100) + '%'],
      ['耐力恢复', Math.round(s.stamina * 100) + '%'],
      ['行券', s.currency],
    ])
      stat.append(element('span', k + '　' + v))
    if (s.sickness > 0)
      stat.append(element('span', '腹部不适　' + format(s.sickness) + ' 小时', 'exp-ill'))
    const nav = element('nav', null, 'exp-tabs')
    nav.setAttribute('aria-label', '行囊分栏')
    for (const [key, name] of [
      ['bag', '物资'],
      ['gear', '穿戴'],
      ['local', '就地补给'],
      ['market', '集市'],
    ]) {
      const b = button(name, () => {
        tab = key
        feedback = ''
        state.drop = ''
        render()
        panel.querySelector('.exp-list').scrollTop = 0
        panel.querySelector('[data-tab="' + key + '"]').focus({ preventScroll: true })
      })
      b.dataset.tab = key
      b.setAttribute('aria-pressed', String(tab === key))
      nav.append(b)
    }
    const out = element('p', feedback, 'exp-feedback' + (success ? '' : ' exp-ill'))
    out.setAttribute('role', 'status')
    const list = element('div', null, 'exp-list')
    if (tab === 'market') market(list)
    else if (tab === 'local') local(list)
    else
      inventoryGrid(list, pack, context, state, {
        render,
        trigger,
        attributes,
        gearOnly: tab === 'gear',
      })
    const ration = element(
      'small',
      '平常一天约需 4 只包子和 2 L 水。快跑、攀爬更费口粮，旱热时饮水消耗更快。',
      'exp-rations',
    )
    panel.replaceChildren(head, stat, nav, out, list, ration)
    list.scrollTop = prior
  }
  render()
  return { refresh: render }
}
