import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import { getRandomColor } from "./utils.js";
import { generateRandomGeometry } from "./generateGeo.js";

class Sketch {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // Основные параметры
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.addOrbitControls();
    this.gravity = null;
    this.world = null;
    this.RAPIER = null;
    this.cube = this.createCube();
    this.clock;

    this.mousePos = new THREE.Vector2(0, 0);

    // Запускаем инициализацию
    this.init();
  }

  async init() {
    // Инициализируем физику и дожидаемся завершения
    // await this.initPhysics();

    this.clock = new THREE.Clock();
    // Добавляем объекты на сцену
    this.addObjects();

    // Обработчики событий
    this.addEventListeners();

    // Добавляем освещение
    this.addLight();

    // Запуск анимации
    this.animate();
  }

  // Создание сцены
  createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x686868);
    return scene;
  }

  // Создание камеры
  createCamera() {
    const fov = 75;
    const aspect = this.width / this.height;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(3, 3, 3);
    return camera;
  }

  // Создание рендера
  createRenderer() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(this.width, this.height);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    if (this.container) {
      this.container.appendChild(renderer.domElement);
    } else {
      console.error(`Элемент с id "${this.containerId}" не найден.`);
    }

    return renderer;
  }

  async initPhysics() {
    this.RAPIER = await RAPIER.init();
    this.gravity = { x: 0.0, y: 0, z: 0.0 };
    this.world = new RAPIER.World(this.gravity);
  }

  addLight() {
    const hemiLight = new THREE.HemisphereLight(0x099ff, 0xaa5500);
    this.scene.add(hemiLight);

    // this.scene.fog = new THREE.FogExp2(0x000000, 0.3);
  }

  createCube() {
    const color = getRandomColor();
    const geo = new THREE.BoxGeometry(1, 1, 1);

    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "extension GL_OES_standard_derivatives : enable",
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      fragmentShader: fragmentShader,
      vertexShader: vertexShader,
    });
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(0,0,0)
    return mesh;
  }

  // Добавление OrbitControls
  addOrbitControls() {
    return new OrbitControls(this.camera, this.renderer.domElement);
  }

  addObjects() {
    this.scene.add(this.cube);
  }

  // Обработчик изменения размеров окна
  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  onMouseMove(evt) {
    this.mousePos.x = (evt.clientX / this.width) * 2 - 1;
    this.mousePos.y = -(evt.clientY / this.height) * 2 + 1;
  }

  // Добавление обработчиков событий
  addEventListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));

    window.addEventListener("mousemove", this.onMouseMove.bind(this), false);
  }

  // Анимация
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    // this.cube.material.uniforms.time.value = delta;

    this.cube.rotation.z += delta;
    this.cube.rotation.y += delta;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Запуск инициализации, передаем id элемента
export default Sketch;

// Чтобы запустить, просто нужно создать экземпляр класса
// const sketch = new Sketch('canvas');
