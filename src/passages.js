import * as T from 'three'
import { gateProfile } from './border-sites.js'
import { assetUrl } from './asset-url.js'

const colors = { rain: 0x88d4ae, salt: 0xf9c988, root: 0xadc387, gorge: 0xffab86, capital: 0xe9d9a2 }

export function passageFor(id, gate) {
  if (gate.kind !== 'border') return null
  const city = id === 'capital'
  const nx = city ? Math.sign(gate.x) : 0,
    nz = Math.sign(gate.z)
  return {
    ...gate,
    x: gate.x - (city ? 2.42 * nx : 0),
    z: gate.z - (city ? 2.42 * nz : 0),
    nx,
    nz,
    radius: city ? 6.12 : gateProfile[id].radius,
    spring: city ? 3.75 : gateProfile[id].spring,
  }
}

// Intersect the whole movement segment with the opening, including a dash or a jump.
export function crossedPassage(portals, a, b) {
  for (const g of portals) {
    const before = (a.x - g.x) * g.nx + (a.z - g.z) * g.nz,
      after = (b.x - g.x) * g.nx + (b.z - g.z) * g.nz
    if (before > 0 || after < 0 || after <= before) continue
    const t = -before / (after - before),
      x = a.x + (b.x - a.x) * t - g.x,
      z = a.z + (b.z - a.z) * t - g.z
    const u = x * g.nz - z * g.nx,
      h = a.y + (b.y - a.y) * t - g.y + 0.5
    if (h >= -1.3 && Math.hypot(u, Math.max(0, h - g.spring)) <= g.radius + 0.12) return g
  }
  return null
}

const vertex = `
varying vec2 aperture;
void main(){
  aperture=position.xy;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`
const fragment = `
uniform sampler2D beyond;
uniform vec3 tint;
uniform float clock, radius, spring;
varying vec2 aperture;
float hash(vec2 a){return fract(sin(dot(a,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 p=aperture;
  float t=clock, y=(p.y+.2)/(spring+radius+.2), x=p.x/radius;
  float rim=radius-length(vec2(p.x,max(p.y-spring,0.)));
  float wave=sin(4.*x+1.9*y-.73*t)+.32*sin(9.*x-5.*y+1.3*t);
  vec2 uv=vec2(.5+x*.355,.08+y*.84)+vec2(wave*.012,sin(3.*y+wave+t*.51)*.011);
  vec3 image=texture2D(beyond,clamp(uv,0.,1.)).rgb;
  float veil=pow(.5+.5*sin(7.*x+2.1*wave+3.*y-.8*t),8.);
  vec2 dust=vec2((p.x+sin(p.y*.2+t*.4)*.12)*4.,p.y*3.-t*.9);
  float fleck=(1.-smoothstep(.025,.15,length(fract(dust)-.5)))*step(.86,hash(floor(dust)));
  float edge=exp(-max(rim,0.)*8.)+.48*exp(-max(p.y,0.)*6.);
  float folds=sin(x*10.+y*3.2+1.45*sin(4.3*y-.7*t)+.55*sin(x*5.+t*.48)-t*.86);
  float silk=pow(1.-abs(folds),6.)*(.31+.26*pow(1.-y,2.));
  float current=exp(-13.*abs(fract(y*.82+.14*sin(x*4.+t*.41)-t*.075)-.5));
  vec3 light=mix(image*1.06,tint,.18)+tint*(.065*wave+.16*veil+.97*edge+fleck*.57+silk+current*.14);
  light+=mix(tint,vec3(1.),.48)*exp(-max(rim,0.)*18.)*.69;
  gl_FragColor=vec4(light,.94);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function passageVeils(parent, portals) {
  const loader = new T.TextureLoader()
  const surfaces = portals.map((g) => {
    const shape = new T.Shape(),
      r = g.radius,
      s = g.spring
    shape.moveTo(-r, -0.55)
    shape.lineTo(r, -0.55)
    shape.lineTo(r, s)
    shape.absarc(0, s, r, 0, Math.PI, false)
    shape.lineTo(-r, -0.55)
    const texture = loader.load(assetUrl('/atlas/' + g.to + '.webp'))
    texture.colorSpace = T.SRGBColorSpace
    const uniforms = {
      beyond: { value: texture },
      tint: { value: new T.Color(colors[g.to]) },
      clock: { value: 0 },
      radius: { value: r },
      spring: { value: s },
    }
    const m = new T.Mesh(
      new T.ShapeGeometry(shape, 28),
      new T.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms,
        transparent: true,
        side: T.DoubleSide,
        depthWrite: true,
      }),
    )
    m.position.set(g.x, g.y, g.z)
    m.rotation.y = Math.atan2(-g.nx, -g.nz)
    m.renderOrder = 1
    parent.add(m)
    return m
  })
  return {
    update(time) {
      for (const m of surfaces) m.material.uniforms.clock.value = time
    },
    dispose() {
      for (const m of surfaces) {
        m.removeFromParent()
        m.geometry.dispose()
        m.material.uniforms.beyond.value.dispose()
        m.material.dispose()
      }
    },
  }
}
