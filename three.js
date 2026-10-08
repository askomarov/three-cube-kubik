import * as THREE from "three/webgpu";
import { mx_noise_float, uv } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import GUI from "lil-gui";

const MODEL_URL = "/models/rubik.glb";

const MATERIALS = {
  Cube_Purple: { color: 0x6a33f0, roughness: 0.34, noise: true },
  Cube_Edge: { color: 0x1e0e4a, roughness: 0.4, clearcoat: 0.4 },
  Cube_Yellow: { color: 0xffea00, roughness: 0.3, noise: true },
  Cube_TextWhite: { color: 0xffffff, roughness: 0.45, clearcoat: 0.3 },
  Cube_TextLilac: { color: 0xc29bff, roughness: 0.45, clearcoat: 0.3 },
};

const BASE_ROTATION = new THREE.Euler(0.28, 0.22, -0.12);
const IDENTITY_QUAT = new THREE.Quaternion();

const easeInOutSine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const fract = (x) => x - Math.floor(x);
const randRange = (min, max) => min + Math.random() * (max - min);

// 0 → 1 → 0 within the first `active` part of the cycle, rest — pause
const bump = (cycle, active) =>
  cycle < active ? 0.5 - 0.5 * Math.cos((2 * Math.PI * cycle) / active) : 0;

// 0 → 1 (hold) → 0 with eased edges, rest — pause
const plateau = (cycle, rise, hold, fall) => {
  if (cycle < rise) return easeInOutSine(cycle / rise);
  if (cycle < rise + hold) return 1;
  if (cycle < rise + hold + fall)
    return 1 - easeInOutSine((cycle - rise - hold) / fall);
  return 0;
};

class Sketch {
  constructor(containerId, options = {}) {
    this.options = {
      transparent: false,
      gui: true,
      orbit: true,
      wideZoom: 1,
      lookAtY: 0,
      ...options,
    };
    this.isVisible = true;

    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = null;
    this.controls = null;

    this.cube = new THREE.Group();
    this.pieces = [];
    this.timer = new THREE.Timer();

    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();

    this.tmpVec = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();
    this.tmpEuler = new THREE.Euler();

    this.init();
  }

  async init() {
    this.renderer = await this.createRenderer();
    this.controls = this.options.orbit ? this.addOrbitControls() : null;
    this.timer.connect(document);

    this.addEnvironment();
    this.addLight();
    if (this.options.gui && this.controls) this.setupGUI();
    await this.addCube();
    this.addEventListeners();
    this.observeVisibility();
    this.animate();
  }

  createScene() {
    const scene = new THREE.Scene();
    if (!this.options.transparent) {
      scene.background = new THREE.Color(0xf4f2fa);
    }
    return scene;
  }

  observeVisibility() {
    const observer = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting;
    });
    observer.observe(this.container);
  }

  createCamera() {
    const camera = new THREE.PerspectiveCamera(
      32,
      this.width / this.height,
      0.1,
      100,
    );
    camera.position.set(8, -0.6, 16);
    camera.lookAt(0, this.options.lookAtY, 0);
    camera.zoom = this.getZoom();
    return camera;
  }

  // на широком контейнере (мобилка) кубик упирается в высоту — приближаем камеру
  getZoom() {
    return this.width > this.height ? this.options.wideZoom : 1;
  }

  async createRenderer() {
    const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });

    renderer.setClearColor(0x000000, this.options.transparent ? 0 : 1);
    renderer.setSize(this.width, this.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    await renderer.init();

    if (this.container) {
      this.container.appendChild(renderer.domElement);
    } else {
      console.error(`Элемент с id "${this.containerId}" не найден.`);
    }

    return renderer;
  }

  addEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    this.scene.environmentIntensity = 0.55;
  }

  addLight() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x3a2470, 0.6);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    this.keyLight.position.set(-4, 6, 7);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -4;
    this.keyLight.shadow.camera.right = 4;
    this.keyLight.shadow.camera.top = 4;
    this.keyLight.shadow.camera.bottom = -4;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.radius = 4;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xc9b8ff, 0.9);
    this.fillLight.position.set(6, -1, 4);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xbd09e1, 2.59);
    this.rimLight.position.set(2, 4, -6);
    this.scene.add(this.rimLight);
  }

  setupGUI() {
    const gui = new GUI({ title: "Tweaks" }).close();

    const global = gui.addFolder("Global");
    global
      .add(this.renderer, "toneMappingExposure", 0, 3, 0.01)
      .name("exposure");
    global
      .add(this.scene, "environmentIntensity", 0, 3, 0.01)
      .name("env intensity");

    this.addCameraFolder(gui);

    const hemi = gui.addFolder("Hemisphere");
    hemi.add(this.hemiLight, "visible").name("enabled").listen();
    hemi.add(this.hemiLight, "intensity", 0, 3, 0.01);
    hemi
      .addColor({ color: this.hemiLight.color.getHex() }, "color")
      .onChange((v) => this.hemiLight.color.set(v));
    hemi
      .addColor({ color: this.hemiLight.groundColor.getHex() }, "color")
      .name("ground")
      .onChange((v) => this.hemiLight.groundColor.set(v));

    this.addDirectionalFolder(gui, "Key", this.keyLight, {
      shadow: true,
    });
    this.addDirectionalFolder(gui, "Fill", this.fillLight);
    this.addDirectionalFolder(gui, "Rim", this.rimLight);
  }

  addCameraFolder(gui) {
    const folder = gui.addFolder("Camera");
    const { camera, controls } = this;

    folder
      .add(camera, "fov", 10, 90, 0.1)
      .onChange(() => camera.updateProjectionMatrix());
    folder
      .add(camera, "near", 0.01, 10, 0.01)
      .onChange(() => camera.updateProjectionMatrix());
    folder
      .add(camera, "far", 10, 500, 1)
      .onChange(() => camera.updateProjectionMatrix());

    const pos = folder.addFolder("position");
    pos.add(camera.position, "x", -30, 30, 0.1).listen();
    pos.add(camera.position, "y", -30, 30, 0.1).listen();
    pos.add(camera.position, "z", -30, 30, 0.1).listen();

    const target = folder.addFolder("target");
    target.add(controls.target, "x", -10, 10, 0.1).listen();
    target.add(controls.target, "y", -10, 10, 0.1).listen();
    target.add(controls.target, "z", -10, 10, 0.1).listen();

    folder.add(controls, "minDistance", 0, 50, 0.1);
    folder.add(controls, "maxDistance", 1, 100, 0.1);
    folder.add(controls, "enableDamping");
    folder.add(controls, "enablePan");
    folder.add(controls, "enableZoom");
    folder.add(controls, "enableRotate");

    folder
      .add(
        {
          reset: () => {
            camera.fov = 32;
            camera.near = 0.1;
            camera.far = 100;
            camera.position.set(6, -0.4, 12);
            camera.updateProjectionMatrix();
            controls.target.set(0, 0, 0);
            controls.update();
            folder.controllersRecursive().forEach((c) => c.updateDisplay());
          },
        },
        "reset",
      )
      .name("Reset");
  }

  addDirectionalFolder(gui, name, light, { shadow = false } = {}) {
    const folder = gui.addFolder(name);
    folder.add(light, "visible").name("enabled");
    folder.add(light, "intensity", 0, 8, 0.01);
    folder
      .addColor({ color: light.color.getHex() }, "color")
      .onChange((v) => light.color.set(v));

    const pos = folder.addFolder("position");
    pos.add(light.position, "x", -20, 20, 0.1);
    pos.add(light.position, "y", -20, 20, 0.1);
    pos.add(light.position, "z", -20, 20, 0.1);

    if (shadow) {
      const sh = folder.addFolder("shadow");
      sh.add(light, "castShadow");
      sh.add(light.shadow, "radius", 0, 16, 0.1);
      sh.add(light.shadow, "normalBias", 0, 0.1, 0.001);
    }

    return folder;
  }

  createMaterial({ color, roughness, clearcoat = 1, noise = false }) {
    const material = new THREE.MeshPhysicalNodeMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat,
      clearcoatRoughness: 0.14,
    });

    if (noise) {
      material.roughnessNode = mx_noise_float(uv().mul(10))
        .mul(0.08)
        .add(roughness);
    }

    return material;
  }

  async addCube() {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    const root = gltf.scene.getObjectByName("RubikCube");

    const materials = Object.fromEntries(
      Object.entries(MATERIALS).map(([name, params]) => [
        name,
        this.createMaterial(params),
      ]),
    );

    root.traverse((child) => {
      if (!child.isMesh) return;
      child.material = materials[child.material.name] ?? child.material;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    [...root.children].forEach((object) => {
      this.pieces.push(this.createPieceState(object));
      this.cube.add(object);
    });

    this.cube.rotation.copy(BASE_ROTATION);
    this.scene.add(this.cube);
  }

  createPieceState(object) {
    const { home, cells, floater } = object.userData;
    const homePos = new THREE.Vector3().fromArray(home);

    if (floater) {
      return {
        object,
        type: "floater",
        home: homePos,
        out: object.position.clone(),
        outQuat: object.quaternion.clone(),
        phase: Math.random() * Math.PI * 2,
        dockPeriod: randRange(9, 13),
        dockOffset: Math.random(),
      };
    }

    const direction = this.pickSlideDirection(cells);

    return {
      object,
      type: direction ? "slider" : "static",
      home: homePos,
      direction,
      amplitude: cells.length > 1 ? randRange(0.3, 0.5) : randRange(0.18, 0.3),
      period: randRange(5, 9),
      offset: Math.random(),
    };
  }

  // piece can only slide outward along a normal of a face lying on the cube surface
  pickSlideDirection(cells) {
    const options = [];

    for (let axis = 0; axis < 3; axis++) {
      for (const sign of [-1, 1]) {
        if (cells.every((cell) => cell[axis] === sign)) {
          options.push(new THREE.Vector3().setComponent(axis, sign));
        }
      }
    }

    // front (+Z) is the text side — prefer it when available
    const front = options.find((dir) => dir.z === 1);
    if (front && Math.random() < 0.6) return front;

    return options[Math.floor(Math.random() * options.length)] ?? null;
  }

  updateSlider(piece, time) {
    const cycle = fract(time / piece.period + piece.offset);
    const shift = bump(cycle, 0.4) * piece.amplitude;

    piece.object.position
      .copy(piece.home)
      .addScaledVector(piece.direction, shift);
  }

  updateFloater(piece, time) {
    const { object, home, out, outQuat, phase } = piece;

    const floatPos = this.tmpVec.set(
      out.x + Math.sin(time * 0.9 + phase) * 0.08,
      out.y + Math.sin(time * 1.15 + phase) * 0.16,
      out.z + Math.cos(time * 0.7 + phase) * 0.07,
    );

    this.tmpEuler.set(
      Math.sin(time * 0.8 + phase) * 0.12,
      Math.sin(time * 0.6 + phase * 1.3) * 0.18,
      Math.cos(time * 0.7 + phase) * 0.1,
    );
    const floatQuat = this.tmpQuat
      .setFromEuler(this.tmpEuler)
      .premultiply(outQuat);

    const cycle = fract(time / piece.dockPeriod + piece.dockOffset);
    const dock = plateau(cycle, 0.14, 0.18, 0.14);

    object.position.lerpVectors(floatPos, home, dock);
    object.quaternion.copy(floatQuat).slerp(IDENTITY_QUAT, dock);
  }

  updateCube(time) {
    this.pointerSmooth.lerp(this.pointer, 0.05);

    this.cube.rotation.set(
      BASE_ROTATION.x +
        Math.sin(time * 0.31) * 0.06 -
        this.pointerSmooth.y * 0.15,
      BASE_ROTATION.y +
        Math.sin(time * 0.23) * 0.18 +
        this.pointerSmooth.x * 0.25,
      BASE_ROTATION.z + Math.sin(time * 0.19) * 0.04,
    );
    this.cube.position.y = Math.sin(time * 0.6) * 0.1;
  }

  addOrbitControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.target.set(0, 0, 0);
    return controls;
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = this.width / this.height;
    this.camera.zoom = this.getZoom();
    this.camera.updateProjectionMatrix();
  }

  onPointerMove(evt) {
    this.pointer.set(
      (evt.clientX / this.width) * 2 - 1,
      -(evt.clientY / this.height) * 2 + 1,
    );
  }

  addEventListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));
    window.addEventListener("pointermove", this.onPointerMove.bind(this));
  }

  animate() {
    this.renderer.setAnimationLoop((timestamp) => {
      this.timer.update(timestamp);
      const time = this.timer.getElapsed();

      if (!this.isVisible) return;

      this.updateCube(time);

      for (const piece of this.pieces) {
        if (piece.type === "slider") this.updateSlider(piece, time);
        else if (piece.type === "floater") this.updateFloater(piece, time);
      }

      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
}

export default Sketch;
