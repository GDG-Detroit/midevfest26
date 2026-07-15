/**
 * Hero WebGL background — raymarched "Holo Blinds" interference pattern.
 * Original shader concept: Sabo Sugi (https://codepen.io/sabosugi/pen/azpNzMG)
 * Site integration and adaptations: Greg Miller / Compass Detroit.
 *
 * Colors below are carried over from the source pen as placeholders —
 * swap `color1`/`color2`/`color3` for the final brand palette.
 */
import * as THREE from 'three'

/** Cap render resolution for battery/thermals. */
const MAX_DPR = 1.25

const DEFAULT_CONFIG = {
  dpr: 1.0,
  speed: 0.7,

  // Placeholder palette from the source pen — TODO: swap for brand colors.
  color1: '#0084ff',
  color2: '#8b7404',
  color3: '#ffdd00',

  globalRotX: 0.1,
  globalRotY: 0.03,
  coreSquash: -0.2,
  coreRadius: 2.8322,
  rayCorrection: 0.35,

  // Layer 1 (base gyroid)
  l1Twist: 43.1,
  l1TwistSpeed: 0.2,
  l1Scale: -0.2,
  l1ScaleY: -0.21,
  l1Thickness: 0.1,

  // Layer 2 (secondary gyroid)
  l2Twist: 0.3,
  l2TwistSpeed: -0.4,
  l2Scale: 1.5,
  l2ScaleY: 0.0,
  l2Thickness: 0.06,

  // Raymarching steps
  stepMult: 0.48,
  stepMin: 0.017,
}

function resolveDpr(requested = DEFAULT_CONFIG.dpr) {
  const deviceDpr =
    typeof window === 'undefined' ? requested : window.devicePixelRatio || 1
  return Math.min(requested, deviceDpr, MAX_DPR)
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  uniform float iTime;
  uniform vec2 iResolution;

  uniform float uSpeed;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  uniform float uGlobalRotX;
  uniform float uGlobalRotY;
  uniform float uCoreSquash;
  uniform float uCoreRadius;
  uniform float uRayCorrection;

  uniform float uL1Twist;
  uniform float uL1TwistSpeed;
  uniform float uL1Scale;
  uniform float uL1ScaleY;
  uniform float uL1Thickness;

  uniform float uL2Twist;
  uniform float uL2TwistSpeed;
  uniform float uL2Scale;
  uniform float uL2ScaleY;
  uniform float uL2Thickness;

  uniform float uStepMult;
  uniform float uStepMin;

  #define MAX_STEPS 42
  #define MAX_DIST 12.8

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  float map(vec3 p) {
    float t = iTime * uSpeed;

    // Global continuous rotation of the entire object
    p.xz *= rot(t * uGlobalRotX);
    p.yz *= rot(t * uGlobalRotY);

    // Core boundary: containment field
    float core = length(vec3(p.x, p.y * uCoreSquash, p.z)) - uCoreRadius;

    // Domain warping & anisotropic scaling (layer 1)
    vec3 q = p;
    q.xz *= rot(q.y * uL1Twist + t * uL1TwistSpeed);
    q *= uL1Scale;
    q.y *= uL1ScaleY;

    float g1 = dot(sin(q), cos(q.yzx));
    float r1 = abs(g1) - uL1Thickness;

    // Secondary layer (layer 2)
    vec3 q2 = p;
    q2.xz *= rot(q2.y * uL2Twist + t * uL2TwistSpeed);
    q2 *= uL2Scale;
    q2.y *= uL2ScaleY;

    float g2 = dot(sin(q2), cos(q2.yzx));
    float r2 = abs(g2) - uL2Thickness;

    // Combine the two gyroids
    float rays = max(r1, r2);
    rays *= uRayCorrection;

    // Confine strictly to the interior of the core boundary
    return max(core, rays);
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0, 0.0, -4.5);
    vec3 rd = normalize(vec3(uv, 1.0));

    float t = iTime * uSpeed;

    float rayT = 0.0;
    vec3 glow = vec3(0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = ro + rd * rayT;
      float d = map(p);

      // Spatial color mixing
      float mixFactor1 = sin(p.y * 2.0 + p.x * 1.5 - t) * 0.5 + 0.5;
      vec3 rayColor = mix(uColor1, uColor2, mixFactor1);

      float mixFactor2 = sin(p.z * 3.0 + t * 2.0) * 0.5 + 0.5;
      rayColor = mix(rayColor, uColor3, mixFactor2);

      // Volumetric accumulation
      float intensity = 0.0018 / (abs(d) + 0.005);
      glow += rayColor * intensity;

      // Step forward using our custom multipliers
      rayT += max(abs(d) * uStepMult, uStepMin);

      if (rayT > MAX_DIST) break;
    }

    // Color grading
    vec3 finalColor = glow * 0.7;
    finalColor = smoothstep(0.0, 1.1, finalColor);
    finalColor = pow(finalColor, vec3(1.05));

    // Vignette effect
    finalColor *= 1.0 - length(uv) * 0.5;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

/**
 * Mounts the hero WebGL scene inside a DOM container.
 * @param {HTMLElement} container
 * @param {{ showDebugGUI?: boolean, config?: Partial<typeof DEFAULT_CONFIG> }} options
 * @returns {{ setPlaying: (playing: boolean) => void, getPlaying: () => boolean, dispose: () => void }}
 */
export function createHeroScene(container, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config }
  config.dpr = resolveDpr(config.dpr)
  const showDebugGUI = options.showDebugGUI ?? false

  let gui = null
  let animationId = null
  let isPlaying = true
  const clock = new THREE.Clock()

  function getSize() {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    return { width, height }
  }

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setPixelRatio(config.dpr)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const uniforms = {
    iTime: { value: 0.0 },
    iResolution: { value: new THREE.Vector2() },

    uSpeed: { value: config.speed },
    uColor1: { value: new THREE.Color(config.color1) },
    uColor2: { value: new THREE.Color(config.color2) },
    uColor3: { value: new THREE.Color(config.color3) },

    uGlobalRotX: { value: config.globalRotX },
    uGlobalRotY: { value: config.globalRotY },
    uCoreSquash: { value: config.coreSquash },
    uCoreRadius: { value: config.coreRadius },
    uRayCorrection: { value: config.rayCorrection },

    uL1Twist: { value: config.l1Twist },
    uL1TwistSpeed: { value: config.l1TwistSpeed },
    uL1Scale: { value: config.l1Scale },
    uL1ScaleY: { value: config.l1ScaleY },
    uL1Thickness: { value: config.l1Thickness },

    uL2Twist: { value: config.l2Twist },
    uL2TwistSpeed: { value: config.l2TwistSpeed },
    uL2Scale: { value: config.l2Scale },
    uL2ScaleY: { value: config.l2ScaleY },
    uL2Thickness: { value: config.l2Thickness },

    uStepMult: { value: config.stepMult },
    uStepMin: { value: config.stepMin },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
  })

  const geometry = new THREE.PlaneGeometry(2, 2)
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  function onResize() {
    const { width, height } = getSize()
    if (width === 0 || height === 0) return

    renderer.setSize(width, height)
    const dpr = renderer.getPixelRatio()
    uniforms.iResolution.value.set(width * dpr, height * dpr)
  }

  function renderFrame() {
    renderer.render(scene, camera)
  }

  function animate() {
    if (!isPlaying) {
      animationId = null
      return
    }
    animationId = requestAnimationFrame(animate)
    uniforms.iTime.value = clock.getElapsedTime()
    renderFrame()
  }

  function setPlaying(playing) {
    isPlaying = playing
    if (playing) {
      if (animationId === null) animate()
    } else if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function setupGUI(GUI) {
    gui = new GUI({ title: 'Scene Settings' })

    gui
      .add(config, 'dpr', 0.1, 2.0, 0.1)
      .name('DPR (Pixel Ratio)')
      .onChange((v) => {
        renderer.setPixelRatio(v)
        onResize()
      })
    gui
      .add(config, 'speed', 0.0, 3.0)
      .name('Global Speed')
      .onChange((v) => {
        uniforms.uSpeed.value = v
      })

    const colorsFolder = gui.addFolder('Colors')
    colorsFolder
      .addColor(config, 'color1')
      .name('Color 1')
      .onChange((v) => uniforms.uColor1.value.set(v))
    colorsFolder
      .addColor(config, 'color2')
      .name('Color 2')
      .onChange((v) => uniforms.uColor2.value.set(v))
    colorsFolder
      .addColor(config, 'color3')
      .name('Color 3')
      .onChange((v) => uniforms.uColor3.value.set(v))

    const shapeFolder = gui.addFolder('Global Shape')
    shapeFolder
      .add(config, 'globalRotX', -1.0, 1.0)
      .name('Rotation X')
      .onChange((v) => (uniforms.uGlobalRotX.value = v))
    shapeFolder
      .add(config, 'globalRotY', -1.0, 1.0)
      .name('Rotation Y')
      .onChange((v) => (uniforms.uGlobalRotY.value = v))
    shapeFolder
      .add(config, 'coreSquash', -2.0, 2.0)
      .name('Core Squash (Y)')
      .onChange((v) => (uniforms.uCoreSquash.value = v))
    shapeFolder
      .add(config, 'coreRadius', 0.1, 5.0)
      .name('Core Radius')
      .onChange((v) => (uniforms.uCoreRadius.value = v))
    shapeFolder
      .add(config, 'rayCorrection', 0.01, 1.0)
      .name('SDF Correction')
      .onChange((v) => (uniforms.uRayCorrection.value = v))

    const layer1Folder = gui.addFolder('Layer 1 (Main Rays)')
    layer1Folder
      .add(config, 'l1Twist', -100.0, 100.0)
      .name('Twist Amount')
      .onChange((v) => (uniforms.uL1Twist.value = v))
    layer1Folder
      .add(config, 'l1TwistSpeed', -2.0, 2.0)
      .name('Twist Speed')
      .onChange((v) => (uniforms.uL1TwistSpeed.value = v))
    layer1Folder
      .add(config, 'l1Scale', -2.0, 2.0)
      .name('Scale Base')
      .onChange((v) => (uniforms.uL1Scale.value = v))
    layer1Folder
      .add(config, 'l1ScaleY', -2.0, 2.0)
      .name('Scale Y')
      .onChange((v) => (uniforms.uL1ScaleY.value = v))
    layer1Folder
      .add(config, 'l1Thickness', 0.0, 0.5)
      .name('Thickness')
      .onChange((v) => (uniforms.uL1Thickness.value = v))

    const layer2Folder = gui.addFolder('Layer 2 (Detail Cuts)')
    layer2Folder
      .add(config, 'l2Twist', -5.0, 5.0)
      .name('Twist Amount')
      .onChange((v) => (uniforms.uL2Twist.value = v))
    layer2Folder
      .add(config, 'l2TwistSpeed', -2.0, 2.0)
      .name('Twist Speed')
      .onChange((v) => (uniforms.uL2TwistSpeed.value = v))
    layer2Folder
      .add(config, 'l2Scale', -5.0, 5.0)
      .name('Scale Base')
      .onChange((v) => (uniforms.uL2Scale.value = v))
    layer2Folder
      .add(config, 'l2ScaleY', -5.0, 5.0)
      .name('Scale Y')
      .onChange((v) => (uniforms.uL2ScaleY.value = v))
    layer2Folder
      .add(config, 'l2Thickness', 0.0, 0.5)
      .name('Thickness')
      .onChange((v) => (uniforms.uL2Thickness.value = v))

    const rayFolder = gui.addFolder('Raymarching System')
    rayFolder
      .add(config, 'stepMult', 0.1, 1.0)
      .name('Step Multiplier')
      .onChange((v) => (uniforms.uStepMult.value = v))
    rayFolder
      .add(config, 'stepMin', 0.001, 0.1)
      .name('Min Step Size')
      .onChange((v) => (uniforms.uStepMin.value = v))

    gui.close()
  }

  // --- Init ---
  onResize()

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)

  if (showDebugGUI) {
    import('lil-gui').then(({ default: GUI }) => setupGUI(GUI)).catch(() => {})
  }

  // One static frame; loop starts via setPlaying() from LandingSectionHero.
  renderFrame()

  return {
    setPlaying,
    getPlaying: () => isPlaying,
    dispose() {
      if (animationId !== null) cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      gui?.destroy()

      geometry.dispose()
      material.dispose()
      renderer.dispose()

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}
