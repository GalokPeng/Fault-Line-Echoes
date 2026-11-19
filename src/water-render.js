import * as T from 'three'
import {
  biomes,
  clamp,
  heightAt,
  gridData,
  gridDivisions,
  riverX,
  waterAt,
  waterSurfaceData,
  hash,
} from './biomes.js'
import { photoSet } from './landscape-assets.js'
import { outcrops, stage } from './water-profile.js'

// A short train of impact rings is retained in world space after a swimmer passes.
const disturbance = `
uniform vec4 impacts[4];uniform float clock;uniform float saltLake;
vec3 footRipples(vec2 pos){
 vec3 sum=vec3(0.);
 for(int i=0;i<4;i++){
   vec4 hit=impacts[i];float age=clock-hit.z;
   if(hit.w<=0. || age<0. || age>3.2)continue;
   vec2 d=pos-hit.xy;float dist=length(d);
   float wave=dist-.32-age*1.85,env=exp(-8.*wave*wave)*exp(-age*1.2)*hit.w;
   float phase=wave*6.6;
   sum.x+=env*sin(phase);
   sum.yz+=d/max(.04,dist)*env*(6.6*cos(phase)-16.*wave*sin(phase));
 }
 return sum;
}`
const vertex = `
attribute vec4 hydraulics;attribute vec4 channelFrame;
varying vec4 frame;
varying vec4 hydro;varying vec3 worldP;
varying vec2 surfaceSlope;
${disturbance}
#include <fog_pars_vertex>
void main(){
 frame=channelFrame;hydro=hydraulics;worldP=(modelMatrix*vec4(position,1.)).xyz;
 float depth=max(0.,hydro.x),speed=length(hydro.yz);
 // The two wave trains use the reach's flow rather than the global clock as
 // a spatially varying phase. They crossfade before the next cycle begins.
 vec2 velocity=vec2(hydro.y-frame.z*hydro.z,hydro.z)+vec2(.016,.073)*saltLake;
 float t=fract(clock*.105),u=fract(t+.5),blend=abs(2.*t-1.);
 vec2 p=frame.xy-velocity*t/.105,q=frame.xy-velocity*u/.105+vec2(8.3,14.4);
 vec2 k1=vec2(.43,.91),k2=vec2(-.77,1.42);
 float h1=dot(p,k1)+.32*sin(.27*p.x),h2=dot(p,k2)+.47*cos(.19*p.y);
 float q1=dot(q,k1)+.32*sin(.27*q.x),q2=dot(q,k2)+.47*cos(.19*q.y);
 float wave=mix(.73*sin(h1)+.27*sin(h2),.73*sin(q1)+.27*sin(q2),blend);
 vec2 grad=mix(.73*k1*cos(h1)+.27*k2*cos(h2),.73*k1*cos(q1)+.27*k2*cos(q2),blend);
 float shore=smoothstep(.02,1.02,depth);
 float amplitude=min(depth*.18,(.080+.033*min(speed,3.5)+.072*hydro.w)*mix(1.,.17,saltLake))*shore;
 vec3 impact=footRipples(worldP.xz);
 float ring=min(.095,depth*.13)*shore;
 worldP.y+=wave*amplitude+impact.x*ring;
 surfaceSlope=vec2(grad.x,grad.y-frame.z*grad.x)*amplitude;
 vec4 mvPosition=viewMatrix*vec4(worldP,1.);gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`
const fragment = `
varying vec3 worldP;varying vec4 hydro;varying vec4 frame;
uniform float daylight;varying vec2 surfaceSlope;
${disturbance}
uniform vec3 tint;uniform vec3 sunlight;uniform sampler2D panorama;uniform sampler2D brokenFoam;uniform float envReady;
#include <fog_pars_fragment>
float hash2(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+1.),f.x),f.y);}
vec3 wave(vec2 p,float detail){
 // These coordinates follow the channel itself. Rotating metre-scale patterns
 // by a varying per-pixel flow direction would shear large world coordinates.
 float bend=noise2(p*vec2(.31,.22))*3.9+noise2(p*vec2(.89,.57))*.78;
 float waveA=sin(p.y*3.24+p.x*1.02+bend);
 float waveB=sin(p.y*5.37-p.x*1.78-2.1*bend);
 float cross=sin(p.x*3.21+p.y*.73+1.6*bend);
 float detailX=(noise2(p*vec2(3.1,4.7))-.5)*.52;
 float streak=noise2(p*vec2(1.77,.60)+vec2(.93*bend,0.));
 return vec3(.40*cross+.21*waveB+detailX*detail,.46*waveA+.28*waveB,.36*streak+.64*noise2(p*vec2(3.17,1.31)+vec2(bend*.48,0.)));
}
void main(){
 float depth=max(0.,hydro.x),speed=length(hydro.yz),foam=hydro.w;
 vec2 streamFlow=vec2(hydro.y-frame.z*hydro.z,hydro.z)+vec2(.018,.075)*saltLake;
 float distance=length(cameraPosition-worldP);
 float detail=1.-smoothstep(14.,74.,distance);
 float a=fract(clock*.18),b=fract(a+.5),w=abs(a*2.-1.);
 vec3 ripple=mix(wave(frame.xy-streamFlow*(a/.18),detail),wave(frame.xy-streamFlow*(b/.18)+vec2(21.,13.),detail),w);
 // Mipmapped centimetre-scale bubbles break up broad white-water streaks.
 vec2 uv1=(frame.xy-streamFlow*a/.18)*vec2(.47,.37),uv2=(frame.xy-streamFlow*b/.18)*vec2(.47,.37)+vec2(.31,.53);
 vec3 micro=mix(texture2D(brokenFoam,uv1).rgb,texture2D(brokenFoam,uv2).rgb,w);
 ripple.xy+=(micro.gb-.5)*detail*.34;
 float rough=(.081+.057*foam+.010*min(speed,3.))*mix(1.,.47,saltLake)*(.28+.72*detail);
 vec3 disturbance=footRipples(worldP.xz);
 vec2 slope=surfaceSlope+disturbance.yz*.064*smoothstep(0.,.54,depth);
 vec3 normal=normalize(vec3(-slope.x+rough*ripple.x,1.,frame.w-slope.y+rough*(ripple.y-frame.z*ripple.x)));
 vec3 eye=normalize(cameraPosition-worldP);bool above=gl_FrontFacing;
 vec3 refl=reflect(-eye,normal);
 vec2 skyUV=vec2(fract(atan(refl.z,refl.x)/6.283185+.5+clock*.00011),asin(clamp(max(.025,refl.y),0.,1.))/3.14159+.5);
 vec3 sky=mix(vec3(.22,.35,.39),texture2D(panorama,skyUV).rgb,envReady*.72);
 sky=mix(vec3(.045,.075,.13),sky,daylight);
 float fres=.045+.67*pow(1.-clamp(abs(dot(eye,normal)),0.,1.),3.8);
 vec3 shallow=mix(vec3(.21,.30,.19),vec3(.35,.50,.35),saltLake);
 vec3 body=mix(shallow,tint*.78,1.-exp(-depth*.88));
 body*=mix(.20,1.,daylight);
 vec3 color=mix(body,sky,above?fres:.14);
 float glint=pow(max(0.,dot(refl,sunlight)),91.)+pow(max(0.,dot(refl,sunlight)),530.)*1.4;
 color+=vec3(1.,.90,.68)*glint*daylight*.52;
 float crest=smoothstep(.49,.80,ripple.z+abs(ripple.x)*.07);
 float edge=1.-smoothstep(.02,.28,depth);
 float filaments=smoothstep(.20,.69,micro.r);
 float bubbles=clamp(foam*crest*(.095+.76*filaments)+edge*crest*.14,0.,.85)*(1.-saltLake);
 bubbles=clamp(bubbles+.12*max(0.,disturbance.x),0.,.82);
 color=mix(color,vec3(.79,.86,.79)*mix(.28,1.,daylight),bubbles);
 float alpha=clamp(.17+.61*(1.-exp(-depth*.86))+fres*.47+bubbles*.57,.10,.94);
 if(!above){color=mix(tint,sky,.21)*mix(.26,.82,daylight);alpha=.50;}
 gl_FragColor=vec4(color,alpha*smoothstep(0.,.055,depth));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`

let bubblePixels
function foamTexture() {
  const size = 128,
    cells = 13
  if (!bubblePixels) {
    bubblePixels = new Uint8Array(size * size * 4)
    const wrap = (n) => (n + cells) % cells
    const points = Array.from({ length: cells * cells }, (_, i) => [
      0.12 + 0.76 * hash(i, 3, 918),
      0.12 + 0.76 * hash(i, 7, 414),
    ])
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const u = (x * cells) / size,
          v = (y * cells) / size,
          i = Math.floor(u),
          j = Math.floor(v)
        let first = 4,
          second = 4,
          dx = 0,
          dy = 0
        for (let b = -1; b <= 1; b++)
          for (let a = -1; a <= 1; a++) {
            const p = points[wrap(j + b) * cells + wrap(i + a)]
            const ex = i + a + p[0] - u,
              ey = j + b + p[1] - v,
              d = ex * ex + ey * ey
            if (d < first) {
              second = first
              first = d
              dx = ex
              dy = ey
            } else if (d < second) second = d
          }
        const edge = clamp(1 - (Math.sqrt(second) - Math.sqrt(first)) / 0.3),
          k = (y * size + x) * 4
        bubblePixels[k] = 255 * edge * edge
        bubblePixels[k + 1] = 128 + Math.round(104 * clamp(dx * 2, -1, 1))
        bubblePixels[k + 2] = 128 + Math.round(104 * clamp(dy * 2, -1, 1))
        bubblePixels[k + 3] = 255
      }
  }
  const tex = new T.DataTexture(bubblePixels, size, size)
  tex.wrapS = tex.wrapT = T.RepeatWrapping
  tex.minFilter = T.LinearMipmapLinearFilter
  tex.magFilter = T.LinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 2
  tex.needsUpdate = true
  return tex
}
function bedMaterial(id) {
  const arid = id === 'salt' || id === 'gorge'
  const texture = typeof document === 'undefined' ? {} : photoSet(arid ? 'desert-rock' : 'forest-rock')
  const mat = new T.MeshStandardMaterial({
    ...texture,
    vertexColors: true,
    roughness: 0.86,
    normalScale: new T.Vector2(0.72, 0.72),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  })
  if (id === 'salt')
    mat.onBeforeCompile = (s) => {
      s.vertexShader =
        'varying vec2 crustP;\n' +
        s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ncrustP=position.xz;')
      s.fragmentShader =
        `
    varying vec2 crustP;
    vec2 saltHash(vec2 p){return fract(sin(vec2(dot(p,vec2(27.1,63.7)),dot(p,vec2(71.2,19.8))))*4375.731);}
    ` +
        s.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
      vec2 cp=crustP*1.2,site=floor(cp),pp=fract(cp);float d1=8.,d2=8.;
      for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
        vec2 cell=vec2(float(i),float(j)),off=cell+vec2(.19)+saltHash(site+cell)*.62-pp;
        float d=dot(off,off);if(d<d1){d2=d1;d1=d;}else d2=min(d2,d);
      }
      float seam=1.-smoothstep(.009,.045,d2-d1);
      diffuseColor.rgb*=1.-.34*seam;`,
        )
    }
  return mat
}
function riverbed(group, id, field) {
  const world = biomes[id],
    r = world.radius,
    n = gridDivisions,
    row = n + 1,
    heights = gridData(id)
  const pos = [],
    uv = [],
    color = [],
    indices = [],
    s = field.spacing
  const selected = new Set()
  for (let c = 0; c < n * n; c++)
    if (field.wetTriangles[c * 2] || field.wetTriangles[c * 2 + 1]) {
      const z = Math.floor(c / n),
        x = c - z * n
      for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++)
          if (x + i >= 0 && x + i < n && z + j >= 0 && z + j < n) selected.add(c + i + j * n)
    }
  if (id === 'salt')
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const z = -r + j * s,
          x = -r + i * s
        if (Math.hypot((x - riverX(id, z)) / 56, (z + 164) / 135) < 1.44) selected.add(j * n + i)
      }
  const palette =
    id === 'salt'
      ? ['#c5af82', '#f2e7c7', '#d5bf9a']
      : id === 'gorge'
        ? ['#7b766c', '#bca484', '#715e55']
        : ['#756e58', '#a99978', '#666e68']
  const gravel = new T.Color(palette[0]),
    bank = new T.Color(palette[1]),
    stone = new T.Color(palette[2]),
    tint = new T.Color()
  const vertices = new Map(),
    rocks = outcrops(world, n)
  function add(k) {
    if (vertices.has(k)) return vertices.get(k)
    const i = k % row,
      j = (k - i) / row,
      x = -r + i * s,
      z = -r + j * s,
      y = heights[k],
      delta = y - field.levels[j]
    let alpha = clamp(1 - Math.max(0, delta - 0.4) / 1.7)
    if (id === 'salt') {
      const pan = Math.hypot((x - riverX(id, z)) / 56, (z + 164) / 135)
      alpha = clamp((1.48 - pan) * 2.6)
    }
    tint.copy(gravel).lerp(bank, clamp((delta + 0.4) / 1.25))
    for (const b of rocks) {
      if (Math.abs(z - b.z) > b.rz * 1.3) continue
      const d = Math.hypot((x - b.x) / b.rx, (z - b.z) / b.rz)
      tint.lerp(stone, clamp((1.23 - d) * 2.7))
    }
    const f = 0.91 + 0.13 * hash(i, j, world.seed),
      v = pos.length / 3
    pos.push(x, y + 0.009, z)
    uv.push(x / 2.8, z / 2.8)
    color.push(tint.r * f, tint.g * f, tint.b * f, alpha)
    vertices.set(k, v)
    return v
  }
  for (const c of selected) {
    const j = Math.floor(c / n),
      i = c - j * n,
      k = j * row + i,
      a = add(k),
      b = add(k + row),
      d = add(k + 1),
      e = add(k + row + 1)
    indices.push(a, b, d, d, b, e)
  }
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  geo.setAttribute('color', new T.Float32BufferAttribute(color, 4))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const bed = new T.Mesh(geo, bedMaterial(id))
  bed.receiveShadow = true
  bed.renderOrder = 1
  bed.name = 'channel-sediment'
  group.add(bed)
}
function shingle(group, id, field) {
  const items = [],
    seed = biomes[id].seed
  for (let j = 0; j < field.shorelines.length; j += 4) {
    const [a, b] = field.shorelines[j]
    for (let i = 0; i < 5; i++) {
      const h = (k) => hash(j * 5 + i, k, seed)
      const t = h(0),
        x = a.x + (b.x - a.x) * t + (h(1) - 0.5) * 4.4,
        z = a.z + (b.z - a.z) * t + (h(2) - 0.5) * 4.4
      const w = waterAt(id, x, z)
      if (w.depth > 0.85 || w.bed > w.level + 0.85) continue
      const s = 0.06 + h(3) ** 2 * (id === 'gorge' ? 0.48 : 0.31)
      items.push([x, w.bed, z, s, h(4) * 6.28, 0.59 + h(5) * 0.54, h(6)])
    }
  }
  if (!items.length) return
  const geo = new T.DodecahedronGeometry(1),
    mat = new T.MeshStandardMaterial({ roughness: 0.74 })
  const pebble = new T.InstancedMesh(geo, mat, items.length),
    o = new T.Object3D(),
    color = new T.Color()
  const pale = new T.Color(id === 'salt' ? '#d1b99a' : '#a49a80'),
    dark = new T.Color(id === 'gorge' ? '#705b48' : '#616854')
  items.forEach(([x, y, z, scale, angle, ratio, shade], i) => {
    o.position.set(x, y + 0.045 * scale, z)
    o.rotation.set(0.18, angle, 0.12)
    o.scale.set(scale, scale * 0.48, scale * ratio)
    o.updateMatrix()
    pebble.setMatrixAt(i, o.matrix)
    pebble.setColorAt(i, color.copy(dark).lerp(pale, shade))
  })
  pebble.name = 'waterline-shingle'
  pebble.receiveShadow = true
  group.add(pebble)
}
function exposedRock(group, id, solids) {
  const world = biomes[id],
    pos = [],
    uv = [],
    colors = [],
    indices = []
  const tint = new T.Color()
  for (const [index, rock] of outcrops(world, gridDivisions).entries()) {
    const { x, z, rx, rz } = rock,
      top = heightAt(id, x, z),
      rings = [],
      floor = top - 0.09
    // Keep the new crown on the existing dry crest. The render contact with
    // moving water still comes exclusively from the submerged collision bed.
    let rxTop = rx * 0.78,
      rzTop = rz * 0.64
    for (let probe = 0; probe < 16; probe++) {
      const a = (probe * Math.PI) / 8,
        dx = Math.cos(a) * rxTop,
        dz = Math.sin(a) * rzTop
      let usable = 1
      for (let t = 0.16; t <= 1.01; t += 0.14)
        if (waterAt(id, x + t * dx, z + t * dz).wet) {
          usable = Math.max(0.22, t - 0.14)
          break
        }
      rxTop *= usable
      rzTop *= usable
    }
    const height = Math.min(0.64, Math.min(rxTop, rzTop) * 0.45)
    if (height < 0.12) continue
    for (let band = 0; band < 4; band++) {
      const ring = [],
        radius = [1, 0.96, 0.73, 0.22][band],
        lift = [-0.12, 0.13, 0.7, 1][band]
      for (let i = 0; i < 9; i++) {
        const a = (2 * Math.PI * i) / 9 + index * 0.72,
          shape = 0.88 + 0.22 * hash(i, index, 833)
        const xx = x + rxTop * radius * shape * Math.cos(a),
          zz = z + rzTop * radius * shape * Math.sin(a)
        const y = heightAt(id, xx, zz) + height * lift
        const k = pos.length / 3
        ring.push(k)
        pos.push(xx, y, zz)
        uv.push(xx / 2.1, zz / 2.1)
        tint
          .set(id === 'gorge' ? '#85715d' : '#7c8076')
          .multiplyScalar(0.82 + 0.25 * hash(i, band, index) + band * 0.045)
        colors.push(tint.r, tint.g, tint.b)
      }
      if (band)
        for (let i = 0; i < 9; i++) {
          const j = (i + 1) % 9,
            old = rings[band - 1]
          indices.push(old[i], ring[i], old[j], old[j], ring[i], ring[j])
        }
      rings.push(ring)
    }
    const tip = rings[3]
    for (let i = 1; i < tip.length - 1; i++) indices.push(tip[0], tip[i + 1], tip[i])
    solids.push({ x, z, y: floor, h: height + 0.09, r: Math.max(0.15, Math.min(rxTop, rzTop) * 0.64) })
  }
  if (!indices.length) return
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const maps =
    typeof document === 'undefined' ? {} : photoSet(id === 'gorge' ? 'desert-rock' : 'forest-rock')
  const mat = new T.MeshStandardMaterial({
    ...maps,
    vertexColors: true,
    roughness: 0.67,
    normalScale: new T.Vector2(0.64, 0.64),
    side: T.DoubleSide,
  })
  const mesh = new T.Mesh(geo, mat)
  mesh.name = 'exposed-channel-rock'
  mesh.castShadow = mesh.receiveShadow = true
  group.add(mesh)
}
// The simulation grid is intentionally coarse. Subdivide its already clipped
// polygons for travelling geometry waves without moving any shoreline vertex.
function surfaceGeometry(field, world) {
  const slices = world.id === 'salt' ? 3 : 4
  const pos = [],
    hydro = [],
    frames = [],
    indices = [],
    unique = new Map()
  for (let o = 0; o < field.positions.length; o += 9) {
    const rows = []
    for (let row = 0; row <= slices; row++) {
      const line = []
      for (let col = 0; col <= slices - row; col++) {
        const a = (slices - row - col) / slices,
          b = row / slices,
          c = col / slices
        const sample = (data, offset, stride, j) =>
          a * data[offset + j] + b * data[offset + stride + j] + c * data[offset + 2 * stride + j]
        const x = sample(field.positions, o, 3, 0),
          y = sample(field.positions, o, 3, 1),
          z = sample(field.positions, o, 3, 2)
        const key = Math.round(x * 1e5) + ',' + Math.round(z * 1e5)
        let vertex = unique.get(key)
        if (vertex === undefined) {
          vertex = pos.length / 3
          unique.set(key, vertex)
          pos.push(x, y, z)
          for (let k = 0; k < 4; k++) hydro.push(sample(field.attributes, (o / 3) * 4, 4, k))
          const cx = world.id === 'salt' ? 0 : riverX(world.id, z)
          const tangent =
            world.id === 'salt' ? 0 : (riverX(world.id, z + 1) - riverX(world.id, z - 1)) * 0.5
          const grade = (stage(world, z - 2) - stage(world, z + 2)) * 0.25
          frames.push(x - cx, z, tangent, grade)
        }
        line.push(vertex)
      }
      rows.push(line)
    }
    for (let r = 0; r < slices; r++)
      for (let c = 0; c < slices - r; c++) {
        indices.push(rows[r][c], rows[r + 1][c], rows[r][c + 1])
        if (c < slices - r - 1) indices.push(rows[r][c + 1], rows[r + 1][c], rows[r + 1][c + 1])
      }
  }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
  g.setAttribute('hydraulics', new T.Float32BufferAttribute(hydro, 4))
  g.setAttribute('channelFrame', new T.Float32BufferAttribute(frames, 4))
  g.setIndex(indices)
  g.computeBoundingSphere()
  return g
}
export function createWater(group, id, ground, solids = []) {
  const field = waterSurfaceData(id)
  ground.userData.wetTiles = field.tileMask
  riverbed(group, id, field)
  shingle(group, id, field)
  exposedRock(group, id, solids)
  const g = surfaceGeometry(field, biomes[id])
  const uniforms = {
    ...T.UniformsUtils.clone(T.UniformsLib.fog),
    clock: { value: 0 },
    daylight: { value: 1 },
    brokenFoam: { value: foamTexture() },
    impacts: { value: Array.from({ length: 4 }, () => new T.Vector4(0, 0, -1, 0)) },
    saltLake: { value: id === 'salt' ? 1 : 0 },
    tint: { value: new T.Color(biomes[id].water) },
    sunlight: { value: new T.Vector3(0.5, 0.8, -0.3).normalize() },
    panorama: { value: null },
    envReady: { value: 0 },
  }
  const water = new T.Mesh(
    g,
    new T.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      fog: true,
      side: T.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  )
  water.material.addEventListener('dispose', () => uniforms.brokenFoam.value.dispose())
  water.name = 'connected-water-surface'
  water.renderOrder = 2
  group.add(water)
  let sky = null,
    actor = null,
    lastPulse = -Infinity,
    cursor = 0
  return {
    setActor(pos, velocity = {}, strength = 1) {
      if (!pos) {
        actor = null
        lastPulse = -Infinity
        return
      }
      actor = {
        x: pos.x,
        z: pos.z,
        speed: Math.hypot(velocity.x || 0, velocity.z || 0),
        strength: clamp(strength),
      }
    },
    update(time, daylight) {
      if (actor && actor.strength > 0 && time - lastPulse > (actor.speed > 0.22 ? 0.36 : 1.33)) {
        const power = actor.strength * clamp(0.19 + actor.speed * 0.17, 0.19, 1)
        uniforms.impacts.value[cursor].set(actor.x, actor.z, time, power)
        cursor = (cursor + 1) % uniforms.impacts.value.length
        lastPulse = time
      }
      if (!sky)
        sky = group.parent?.children.find((o) => o.material?.uniforms?.panorama)?.material.uniforms
      if (sky) {
        uniforms.panorama.value = sky.panorama.value
        uniforms.envReady.value = sky.loaded.value
        uniforms.sunlight.value.copy(sky.sun.value)
      }
      uniforms.clock.value = time
      uniforms.daylight.value = daylight
    },
  }
}
