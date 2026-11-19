// Screen-space packing keeps names readable even when a well, inn and resident
// stand on the same map pixel. The marker remains at its real world position.
export function placeMapLabels(labels, w, h, measure, blocked = []) {
  const occupied = blocked.slice(),
    placed = []
  for (const m of labels.slice().sort((a, b) => b.priority - a.priority)) {
    if (m.x < 4 || m.x > w - 4 || m.y < 4 || m.y > h - 4) continue
    const width = Math.ceil(measure(m.name)) + 6
    let found = false
    for (const dy of [0, 18, -18, 36, -36, 54, -54]) {
      for (const side of [1, -1]) {
        const left = side === 1 ? m.x + 7 : m.x - 7 - width,
          top = m.y - 16 + dy
        const box = { left, top, right: left + width, bottom: top + 17 }
        if (left < 3 || top < 3 || box.right > w - 3 || box.bottom > h - 3) continue
        if (
          occupied.some(
            (r) =>
              !(
                r.right + 3 < left ||
                box.right + 3 < r.left ||
                r.bottom + 2 < top ||
                box.bottom + 2 < r.top
              ),
          )
        )
          continue
        occupied.push(box)
        placed.push({ ...m, ...box })
        found = true
        break
      }
      if (found) break
    }
  }
  return placed
}
