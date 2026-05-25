/**
 * Pride trail WebGL hero background.
 * Initial effect concept and shaders: Sabo Sugi (https://www.reddit.com/user/CollectionBulky1564/)
 * Site integration and adaptations: Greg Miller / Compass Detroit — see README Attribution.
 */
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

/** Cap render resolution for battery/thermals (renderer antialias replaces SMAA). */
const MAX_DPR = 1.25

const TRAIL_TUBULAR_SEGMENTS = 96
const FLOOR_GRID_SEGMENTS = 400
const FOREGROUND_BLUR_SAMPLES = 16

const DEFAULT_CONFIG = {
  dpr: MAX_DPR,
  exposure: 3.6505,
  brightness: 4.0131,
  bloomStrength: 0.2025,
  bloomRadius: 0.294,
  bloomThreshold: 0.0,
  speedMultiplier: 0.1,
  inverseMotion: false,
  linesCount: 60,
  dotDensity: 70,
  dotSize: 0.25,
  dotSpeed: 1.5,
  blurStrength: 3.5,
  arcRadius: 10.0,
  bendStartZ: -150.0,
  floorLength: 132.75,
  wallHeight: 200.0,
  // Gilbert Baker rainbow (7 stripes — trails pick randomly among these)
  color0: '#E40303', // red
  color1: '#FF8C00', // orange
  color2: '#FFED00', // yellow
  color3: '#008026', // green
  color4: '#004DFF', // blue
  color5: '#732982', // indigo
  color6: '#750787', // violet
}

const TRAIL_COLOR_COUNT = 7

/** Relative weights for color0–color6 (lower = fewer trails). */
const TRAIL_COLOR_WEIGHTS = [1, 1, 0.3, 1, 1, 1, 1]

function resolveDpr(requested = MAX_DPR) {
  const deviceDpr =
    typeof window === 'undefined' ? requested : window.devicePixelRatio || 1
  return Math.min(requested, deviceDpr, MAX_DPR)
}

function pickTrailColorIndex() {
  const total = TRAIL_COLOR_WEIGHTS.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < TRAIL_COLOR_WEIGHTS.length; i++) {
    r -= TRAIL_COLOR_WEIGHTS[i]
    if (r <= 0) return i
  }
  return TRAIL_COLOR_COUNT - 1
}

class CycCurve extends THREE.Curve {
  constructor(x, zStart, zBend, radius, yEnd) {
    super()
    this.x = x
    this.zStart = zStart
    this.zBend = zBend
    this.radius = radius
    this.yEnd = yEnd

    this.L_flat = Math.abs(zStart - (zBend + radius))
    this.L_arc = Math.PI * radius * 0.5
    this.L_up = Math.max(0.1, yEnd - radius)
    this.totalLength = this.L_flat + this.L_arc + this.L_up
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const d = t * this.totalLength
    let py = 0
    let pz = 0

    if (d <= this.L_flat) {
      pz = this.zStart - d
    } else if (d <= this.L_flat + this.L_arc) {
      const norm = (d - this.L_flat) / this.L_arc
      const eased = norm * norm * (3.0 - 2.0 * norm)
      const angle = (norm * 0.4 + eased * 0.6) * (Math.PI * 0.5)
      py = this.radius * (1.0 - Math.cos(angle))
      pz = this.zBend + this.radius - Math.sin(angle) * this.radius
    } else {
      py = this.radius + (d - (this.L_flat + this.L_arc))
      pz = this.zBend
    }
    return optionalTarget.set(this.x, py, pz)
  }
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uSpeed;
  uniform float uOffset;
  uniform float uTailLength;
  uniform float uIntensityMultiplier;
  uniform float uBendUv;
  uniform float uIsReflection;
  uniform float uDotDensity;
  uniform float uDotSize;
  uniform float uDotSpeed;
  uniform float uBrightness;
  uniform float uDirection;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float t = fract(uTime * uSpeed * uDirection + uOffset);
    float dist = fract((t - vUv.x) * uDirection + 1.0);

    float baseAlpha = smoothstep(uTailLength, 0.0, dist);
    baseAlpha = pow(max(0.0, baseAlpha), 1.2);

    vec3 viewDir = normalize(vViewPosition);
    float fresnel = abs(dot(normalize(vNormal), viewDir));
    float edgeSoftness = smoothstep(0.0, 0.02, fresnel);
    baseAlpha *= edgeSoftness;

    float core = pow(max(0.0, baseAlpha), 3.0) * 1.5;

    float movingUV = vUv.x - (uTime * uSpeed * uDotSpeed * uDirection) - uOffset;
    float signalPos = movingUV * uDotDensity;
    float dotId = floor(signalPos);
    float dotLocal = fract(signalPos);

    float distToCenter = length(vec2((dotLocal - 0.5) * 2.0, (fract(vUv.y + 0.5) - 0.5) * 6.0));
    float dotShape = 1.0 - smoothstep(0.0, max(0.001, uDotSize), distToCenter);
    float dotFinal = dotShape * step(0.6, hash(vec2(dotId, uOffset))) * (sin(uTime * 4.0 + hash(vec2(dotId)) * 6.28) * 0.3 + 0.7) * baseAlpha;

    if (uIsReflection > 0.5) {
      float refFade = 1.0 - smoothstep(uBendUv - 0.015, uBendUv, vUv.x);

      baseAlpha *= refFade;
      core *= refFade;
      dotFinal *= refFade * 0.1;
      baseAlpha = pow(max(0.0, baseAlpha), 0.5) * (0.7 + hash(vUv * 300.0 + uTime * 0.05) * 0.3);
      core *= 0.3;
    }

    vec3 trailColor = uColor * (baseAlpha + core * 1.5) * uIntensityMultiplier * uBrightness;
    vec3 rgb = trailColor / max(1.0 - clamp(dotFinal * 1.8, 0.0, 0.95), 0.001) + uColor * dotFinal * 2.5 * uIntensityMultiplier * uBrightness;

    gl_FragColor = vec4(rgb, (baseAlpha + dotFinal) * uIntensityMultiplier);
  }
`

const FOREGROUND_BLUR_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    blurStrength: { value: 3.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float blurStrength;
    varying vec2 vUv;
    void main() {
      float mask = 1.0 - smoothstep(0.0, 0.35, vUv.y);
      float radius = mask * blurStrength;
      if (radius < 0.1) {
        gl_FragColor = texture2D(tDiffuse, vUv);
      } else {
        vec4 color = vec4(0.0);
        float total = 0.0;
        const float GA = 2.3999632;
        for (int i = 0; i < ${FOREGROUND_BLUR_SAMPLES}; i++) {
          float f = float(i);
          float r = sqrt(f) * radius;
          float theta = f * GA;
          vec2 offset = vec2(cos(theta), sin(theta)) * (r / resolution);
          color += texture2D(tDiffuse, vUv + offset);
          total += 1.0;
        }
        gl_FragColor = color / total;
      }
    }
  `,
}

/**
 * Mounts the pride trail WebGL scene inside a DOM container.
 * @param {HTMLElement} container
 * @param {{ showDebugGUI?: boolean, config?: Partial<typeof DEFAULT_CONFIG> }} options
 * @returns {{ setPlaying: (playing: boolean) => void, getPlaying: () => boolean, dispose: () => void }}
 */
export function createPrideTrailScene(container, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config }
  config.dpr = resolveDpr(config.dpr)
  const showDebugGUI = options.showDebugGUI ?? false

  let scene
  let camera
  let renderer
  let composer
  let bloomPass
  let blurPass
  let outputPass
  let floorMesh
  let gui = null
  let animationId = null
  let isPlaying = true
  let globalTime = 0
  const clock = new THREE.Clock()
  const trailObjects = []
  const trailMaterials = []
  const disposables = []

  function getSize() {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    return { width, height }
  }

  function trackDisposable(resource) {
    disposables.push(resource)
    return resource
  }

  function disposeMaterial(material) {
    if (Array.isArray(material)) {
      material.forEach(disposeMaterial)
      return
    }
    material.dispose()
  }

  function updateGeometries() {
    if (floorMesh.geometry) floorMesh.geometry.dispose()

    const floorGeo = new THREE.PlaneGeometry(1000, 1000, 1, FLOOR_GRID_SEGMENTS)
    floorGeo.rotateX(-Math.PI * 0.5)
    const pos = floorGeo.attributes.position.array

    for (let i = 0; i < pos.length; i += 3) {
      if (pos[i + 2] < config.bendStartZ) {
        const d = config.bendStartZ - pos[i + 2]
        const maxA = config.arcRadius * Math.PI * 0.5
        if (d < maxA) {
          const n = d / maxA
          const a = (n * 0.4 + n * n * (3.0 - 2.0 * n) * 0.6) * (Math.PI * 0.5)
          pos[i + 1] = config.arcRadius * (1.0 - Math.cos(a))
          pos[i + 2] = config.bendStartZ - Math.sin(a) * config.arcRadius
        } else {
          pos[i + 1] = config.arcRadius + (d - maxA)
          pos[i + 2] = config.bendStartZ - config.arcRadius
        }
      }
    }
    floorGeo.computeVertexNormals()
    floorMesh.geometry = floorGeo

    const bendUv =
      Math.abs(config.floorLength - config.bendStartZ) /
      (Math.abs(config.floorLength - config.bendStartZ) +
        Math.PI * config.arcRadius * 0.5 +
        Math.max(0.1, config.wallHeight - config.arcRadius))

    trailObjects.forEach((obj) => {
      const path = new CycCurve(
        obj.startX,
        config.floorLength,
        config.bendStartZ - config.arcRadius,
        config.arcRadius,
        config.wallHeight
      )
      const geo = new THREE.TubeGeometry(
        path,
        TRAIL_TUBULAR_SEGMENTS,
        obj.thickness,
        8,
        false
      )
      if (obj.mesh.geometry) obj.mesh.geometry.dispose()
      obj.mesh.geometry = geo
      obj.refMesh.geometry = geo
      obj.mesh.material.uniforms.uBendUv.value = bendUv
      obj.refMesh.material.uniforms.uBendUv.value = bendUv
    })
  }

  function generateTrails() {
    const group = new THREE.Group()
    scene.add(group)

    for (let i = 0; i < config.linesCount; i++) {
      const normIdx = (i / (config.linesCount - 1)) * 2 - 1
      const linearPos = normIdx
      const expPos = Math.sign(normIdx) * Math.pow(Math.abs(normIdx), 1.2)
      let startX = (linearPos * 0.5 + expPos * 0.5) * 80
      startX += (Math.random() - 0.5) * 2.0

      const thickness = Math.random() * 0.2 + 0.1
      const colorIdx = pickTrailColorIndex()

      const uniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(config[`color${colorIdx}`]) },
        uColorIndex: { value: colorIdx },
        uSpeed: { value: Math.random() * 0.5 + 0.2 },
        uOffset: { value: Math.random() },
        uTailLength: { value: Math.random() * 0.4 + 0.3 },
        uIntensityMultiplier: { value: 1.0 },
        uBendUv: { value: 0.0 },
        uIsReflection: { value: 0.0 },
        uDotDensity: { value: config.dotDensity },
        uDotSize: { value: config.dotSize },
        uDotSpeed: { value: config.dotSpeed },
        uBrightness: { value: config.brightness },
        uDirection: { value: config.inverseMotion ? -1.0 : 1.0 },
      }

      const material = trackDisposable(
        new THREE.ShaderMaterial({
          vertexShader: VERTEX_SHADER,
          fragmentShader: FRAGMENT_SHADER,
          uniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )

      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
      const refMaterial = trackDisposable(material.clone())
      refMaterial.uniforms.uIntensityMultiplier.value = 0.4
      refMaterial.uniforms.uIsReflection.value = 1.0
      const refMesh = new THREE.Mesh(new THREE.BufferGeometry(), refMaterial)
      refMesh.scale.y = -1
      refMesh.position.y = -1.0

      group.add(mesh, refMesh)
      trailMaterials.push(material.uniforms, refMaterial.uniforms)
      trailObjects.push({ mesh, refMesh, startX, thickness })
    }
  }

  function onResize() {
    const { width, height } = getSize()
    if (width === 0 || height === 0) return

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    composer.setSize(width, height)
    blurPass.uniforms.resolution.value.set(
      width * config.dpr,
      height * config.dpr
    )
  }

  function animate() {
    if (!isPlaying) {
      animationId = null
      return
    }
    animationId = requestAnimationFrame(animate)
    globalTime += clock.getDelta() * config.speedMultiplier
    trailMaterials.forEach((m) => {
      m.uTime.value = globalTime
    })
    composer.render()
  }

  function setPlaying(playing) {
    isPlaying = playing
    if (playing) {
      clock.getDelta()
      if (animationId === null) animate()
    } else if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function setupGUI(GUI) {
    gui = new GUI({ title: 'Scene Settings' })

    const sys = gui.addFolder('System')
    sys
      .add(config, 'dpr', 0.5, 2.0, 0.1)
      .name('DPR (Pixel Ratio)')
      .onChange((v) => {
        renderer.setPixelRatio(v)
        composer.setPixelRatio(v)
        onResize()
      })
    sys
      .add(config, 'exposure', 0.1, 5.0)
      .name('Exposure')
      .onChange((v) => {
        renderer.toneMappingExposure = v
      })
    sys
      .add(config, 'brightness', 0.1, 5.0)
      .name('Trail Brightness')
      .onChange((v) => {
        trailMaterials.forEach((m) => {
          m.uBrightness.value = v
        })
      })

    const post = gui.addFolder('Post-Processing (Bloom)')
    post
      .add(config, 'bloomStrength', 0.0, 1.5)
      .name('Strength')
      .onChange((v) => {
        bloomPass.strength = v
      })
    post
      .add(config, 'bloomRadius', 0.0, 1.5)
      .name('Radius')
      .onChange((v) => {
        bloomPass.radius = v
      })
    post
      .add(config, 'bloomThreshold', 0.0, 1.0)
      .name('Threshold')
      .onChange((v) => {
        bloomPass.threshold = v
      })
    post
      .add(config, 'blurStrength', 0.0, 20.0)
      .name('Foreground Blur')
      .onChange((v) => {
        blurPass.uniforms.blurStrength.value = v
      })

    const geom = gui.addFolder('Geometry Settings')
    const upd = () => updateGeometries()
    geom.add(config, 'arcRadius', 10.0, 200.0).name('Arc Radius').onChange(upd)
    geom
      .add(config, 'bendStartZ', -300.0, 100.0)
      .name('Bend Start Z')
      .onChange(upd)
    geom
      .add(config, 'floorLength', 50.0, 500.0)
      .name('Floor Length')
      .onChange(upd)
    geom
      .add(config, 'wallHeight', 50.0, 1000.0)
      .name('Wall Height')
      .onChange(upd)

    const cols = gui.addFolder('Trail Colors')
    for (let i = 0; i < TRAIL_COLOR_COUNT; i++) {
      cols
        .addColor(config, `color${i}`)
        .name(`Color ${i + 1}`)
        .onChange((v) => {
          const c = new THREE.Color(v)
          trailMaterials.forEach((m) => {
            if (m.uColorIndex.value === i) m.uColor.value.copy(c)
          })
        })
    }

    const anim = gui.addFolder('Animation')
    anim.add(config, 'speedMultiplier', 0.0, 1.0).name('Global Speed')
    anim
      .add(config, 'inverseMotion')
      .name('Inverse Motion')
      .onChange((v) => {
        const dir = v ? -1.0 : 1.0
        trailMaterials.forEach((m) => {
          m.uDirection.value = dir
        })
      })

    const dots = gui.addFolder('Signal Dots')
    const setDots = (u, v) =>
      trailMaterials.forEach((m) => {
        m[u].value = v
      })
    dots
      .add(config, 'dotDensity', 10.0, 100.0)
      .name('Density')
      .onChange((v) => setDots('uDotDensity', v))
    dots
      .add(config, 'dotSize', 0.05, 0.5)
      .name('Dot Size')
      .onChange((v) => setDots('uDotSize', v))
    dots
      .add(config, 'dotSpeed', 0.5, 3.0)
      .name('Speed Multiplier')
      .onChange((v) => setDots('uDotSpeed', v))

    gui.close()
  }

  // --- Init ---
  const { width, height } = getSize()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  camera = new THREE.PerspectiveCamera(55, width / height, 1, 2000)
  camera.position.set(0, 20, 140)
  camera.lookAt(0, 20, -50)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(config.dpr)
  renderer.toneMapping = THREE.LinearToneMapping
  renderer.toneMappingExposure = config.exposure
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const renderTarget = trackDisposable(
    new THREE.WebGLRenderTarget(width * config.dpr, height * config.dpr, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    })
  )

  const renderScene = new RenderPass(scene, camera)
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    config.bloomStrength,
    config.bloomRadius,
    config.bloomThreshold
  )

  blurPass = new ShaderPass({ ...FOREGROUND_BLUR_SHADER })
  blurPass.uniforms.blurStrength.value = config.blurStrength
  outputPass = new OutputPass()

  composer = new EffectComposer(renderer, renderTarget)
  composer.setPixelRatio(config.dpr)
  composer.addPass(renderScene)
  composer.addPass(bloomPass)
  composer.addPass(blurPass)
  composer.addPass(outputPass)

  const floorMat = trackDisposable(
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  )
  floorMesh = new THREE.Mesh(new THREE.BufferGeometry(), floorMat)
  floorMesh.position.set(0, -0.5, -0.5)
  floorMesh.renderOrder = 1
  scene.add(floorMesh)

  generateTrails()
  updateGeometries()
  onResize()

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)

  if (showDebugGUI) {
    import('lil-gui').then(({ default: GUI }) => setupGUI(GUI)).catch(() => {})
  }

  // One static frame; loop starts via setPlaying() from LandingSectionPride.
  composer.render()

  return {
    setPlaying,
    getPlaying: () => isPlaying,
    dispose() {
      if (animationId !== null) cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      gui?.destroy()

      trailObjects.forEach((obj) => {
        obj.mesh.geometry?.dispose()
        obj.refMesh.geometry?.dispose()
      })
      floorMesh.geometry?.dispose()

      disposables.forEach(disposeMaterial)
      renderTarget.dispose()
      composer.dispose()
      renderer.dispose()

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}
