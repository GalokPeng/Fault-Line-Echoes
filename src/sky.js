import * as T from 'three'

const vertex = `varying vec3 dir;
uniform mat3 orientation;uniform vec2 viewScale;
void main(){dir=orientation*vec3(position.xy*viewScale,-1.);gl_Position=vec4(position.xy,.999999,1.);}`
const fragment = `varying vec3 dir;
uniform vec3 sun; uniform vec3 tint; uniform float clock; uniform sampler2D panorama; uniform float loaded;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec3 d=normalize(dir);float h=max(d.y,0.);
float day=smoothstep(-.18,.26,sun.y), dusk=1.-smoothstep(.02,.42,abs(sun.y));
vec3 horiz=mix(vec3(.055,.082,.14),tint,day);horiz=mix(horiz,vec3(.94,.49,.28),dusk*.65);
vec3 top=mix(vec3(.009,.021,.056),vec3(.18,.47,.67),day);
vec3 col=mix(horiz,top,pow(h,.51));float alignment=max(dot(d,sun),0.);
col+=vec3(1.,.68,.35)*(pow(alignment,24.)*.16+pow(alignment,500.)*.72+smoothstep(.99975,.99992,alignment)*1.8);
float moon=max(dot(d,-sun),0.);col+=vec3(.55,.67,.84)*(smoothstep(.9997,.99991,moon)+pow(moon,150.)*.15)*(1.-day);
vec2 uv=vec2(fract(atan(d.z,d.x)/6.2831853+.5+clock*.00011),asin(clamp(d.y,-1.,1.))/3.14159265+.5);
vec3 photo=texture2D(panorama,uv).rgb;
float veil=smoothstep(-.04,.15,d.y);
vec3 skyPhoto=mix(horiz,photo, .54+.46*veil);
skyPhoto=mix(skyPhoto,skyPhoto*vec3(1.27,.78,.57),dusk*.70);
col=mix(col,skyPhoto,loaded*day*.96);
float stars=step(.998,hash(floor(d.xz/(h+.6)*720.)))*(1.-day)*smoothstep(.02,.3,h);
gl_FragColor=vec4(col+stars*.64,1.);
#include <colorspace_fragment>
}`

export function makeSky(scene, id) {
  const warm = id === 'salt' || id === 'gorge'
  const uniforms = {
    sun: { value: new T.Vector3() },
    tint: { value: new T.Color(warm ? 0xe9c298 : 0xb3d3ca) },
    clock: { value: 0 },
    orientation: { value: new T.Matrix3() },
    viewScale: { value: new T.Vector2() },
    panorama: { value: null },
    loaded: { value: 0 },
  }
  const photo = new T.TextureLoader().load('/sky/' + (warm ? 'highveld' : 'cloudbank') + '.webp', () => {
    uniforms.loaded.value = 1
  })
  photo.colorSpace = T.SRGBColorSpace
  photo.wrapS = T.RepeatWrapping
  uniforms.panorama.value = photo
  const sky = new T.Mesh(
    new T.PlaneGeometry(2, 2),
    new T.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      depthWrite: false,
      depthTest: false,
    }),
  )
  sky.renderOrder = -1000
  sky.frustumCulled = false
  sky.material.addEventListener('dispose', () => photo.dispose())
  scene.add(sky)
  const hemi = new T.HemisphereLight(0xddecff, warm ? 0xa67853 : 0x5b6949, 1.55)
  const light = new T.DirectionalLight(0xffe4b8, 2)
  light.castShadow = true
  Object.assign(light.shadow.camera, { left: -72, right: 72, top: 72, bottom: -72, near: 0.4, far: 270 })
  light.shadow.mapSize.set(1024, 1024)
  light.shadow.normalBias = 0.05
  light.shadow.bias = -0.00018
  light.shadow.camera.updateProjectionMatrix()
  scene.add(hemi, light, light.target)
  const fog = new T.Color(),
    night = new T.Color('#26334c'),
    dayFog = new T.Color(warm ? '#ddba96' : '#abc5b3')
  scene.fog = new T.FogExp2(dayFog, id === 'rain' ? 0.00185 : 0.00155)
  return function tick(camera, hour, time) {
    const angle = ((hour - 6) / 24) * Math.PI * 2
    const sun = uniforms.sun.value.set(Math.cos(angle) * 0.75, Math.sin(angle), -0.42).normalize()
    const daylight = T.MathUtils.smoothstep(sun.y, -0.18, 0.26)
    uniforms.clock.value = time
    camera.updateMatrixWorld()
    uniforms.orientation.value.setFromMatrix4(camera.matrixWorld)
    const sy = Math.tan((camera.fov * Math.PI) / 360)
    uniforms.viewScale.value.set(sy * camera.aspect, sy)
    const high = camera.position.y > 65
    light.target.position.set(
      high ? 0 : camera.position.x,
      high ? 12 : camera.position.y - 1,
      high ? 0 : camera.position.z,
    )
    light.position.copy(light.target.position).addScaledVector(sun, 130)
    light.intensity = 0.18 + daylight * 2.2
    light.color.set(sun.y > 0.24 ? 0xffebcc : 0xffbd81)
    hemi.intensity = 0.4 + daylight * 1.38
    scene.fog.color.copy(fog.copy(night).lerp(dayFog, daylight))
    return daylight
  }
}
