import * as T from 'three'

export function wristRig(arms, look) {
  const groups = [],
    flashes = []
  const trim = new T.MeshStandardMaterial({ color: look.trim, roughness: 0.7 })
  const dark = new T.MeshStandardMaterial({ color: look.trousers, roughness: 0.86 })
  const glow = new T.MeshBasicMaterial({
    color: look.glow,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
  })
  for (let i = 0; i < 2; i++) {
    const g = new T.Group()
    arms[i].add(g)
    groups.push(g)
    const side = i ? 1 : -1
    function mesh(geometry, mat, x, y, z) {
      const m = new T.Mesh(geometry, mat)
      m.position.set(x, y, z)
      g.add(m)
      return m
    }
    function ring(y, radius, thickness, material = trim) {
      const m = mesh(new T.TorusGeometry(radius, thickness, 5, 12), material, 0, y, 0.107)
      m.rotation.x = Math.PI / 2
    }
    if (look.role === 'leaf') {
      ring(0.103, 0.074, 0.009)
      const ribbon = mesh(new T.BoxGeometry(0.028, 0.148, 0.013), trim, -side * 0.05, 0.024, 0.168)
      ribbon.rotation.z = side * 0.42
    } else if (look.role === 'stone') {
      for (const offset of [-0.039, 0, 0.039]) {
        const m = mesh(new T.BoxGeometry(0.033, 0.155, 0.029), offset ? dark : trim, offset, 0.024, 0.18)
        m.rotation.x = 0.04
      }
    } else if (look.role === 'tide') {
      ring(0.061, 0.08, 0.011)
      ring(0.106, 0.073, 0.008)
      const face = mesh(new T.CylinderGeometry(0.033, 0.033, 0.012, 12), dark, 0, 0.065, 0.189)
      face.rotation.x = Math.PI / 2
      const needle = mesh(new T.BoxGeometry(0.01, 0.039, 0.008), trim, 0, 0.061, 0.201)
      needle.rotation.z = -0.52
    } else {
      ring(0.088, 0.078, 0.009, dark)
      for (let j = 0; j < 3; j++) {
        const m = mesh(
          new T.BoxGeometry(0.063, 0.014, 0.012),
          trim,
          -side * 0.025,
          0.005 + j * 0.03,
          0.184,
        )
        m.rotation.z = side * 0.5
      }
    }
    for (let k = 0; k < look.pattern; k++) {
      const stitch = mesh(
        new T.BoxGeometry(0.009, 0.034, 0.012),
        trim,
        (k - (look.pattern - 1) / 2) * 0.015,
        -0.074,
        0.183,
      )
      stitch.rotation.z = side * 0.35
    }
    const flash = mesh(
      new T.TorusGeometry(0.071, 0.005, 5, look.role === 'beam' ? 4 : 14),
      glow,
      0,
      0.21,
      0.07,
    )
    flash.rotation.x = -0.63
    flash.visible = false
    flashes.push(flash)
  }
  return {
    flash(i, strength) {
      const f = flashes[i]
      f.visible = strength > 0.1
      f.scale.setScalar(0.5 + strength * 0.85)
    },
    dispose() {
      for (const g of groups) {
        g.removeFromParent()
        g.traverse((m) => m.geometry?.dispose())
      }
      trim.dispose()
      dark.dispose()
      glow.dispose()
    },
  }
}
