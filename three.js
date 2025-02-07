import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import { getRandomColor, pickRandomColor } from "./utils.js";
import { generateRandomGeometry } from "./generateGeo.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { RoundedBoxGeometry } from "./RoundedBoxGeometry.js";

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
    this.cude3d = null;
    this.clock;
    this.loader = new OBJLoader();
    this.time = 0;

    this.gap = 0.05;
    this.minY = 0.3;
    this.maxY = 0.8;
    this.amplitude = (this.maxY - this.minY) / 2; // 0.25
    this.offset = this.minY + this.amplitude; // 0.3 + 0.25 = 0.55

    this.rubikCubeGroup = new THREE.Group();

    this.mousePos = new THREE.Vector2(0, 0);

    this.raycaster = new THREE.Raycaster();
    this.intersectedObject = null;

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
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(this.width, this.height);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Включаем тени
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 1);
    this.scene.add(hemiLight);

    // Добавляем источник света, который будет проецировать тени
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    this.scene.add(dirLight);

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
    mesh.position.set(0, 0, 0);
    return mesh;
  }

  // Добавление OrbitControls
  addOrbitControls() {
    return new OrbitControls(this.camera, this.renderer.domElement);
  }

  addObjects() {
    // Создаем группу для кубика Рубика

    const cubeSize = 1;

    // Создаем 27 кубиков и добавляем их в группу
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const geometry = new RoundedBoxGeometry(1, 1, 1, 10, 0.15);
          const material = new THREE.MeshStandardMaterial({
            color: pickRandomColor(),
          });
          const cube = new THREE.Mesh(geometry, material);

          cube.position.set(
            x * (cubeSize + this.gap),
            y * (cubeSize + this.gap),
            z * (cubeSize + this.gap)
          );

          // Включаем проецирование и получение теней для каждого кубика
          cube.castShadow = true;
          cube.receiveShadow = true;
          cube.name = `cube${x}${y}${z}`;

          this.rubikCubeGroup.add(cube);
        }
      }
    }

    // Центрируем группу
    this.rubikCubeGroup.position.set(0, 0, 0);

    this.cude3d = this.rubikCubeGroup;
    this.scene.add(this.cude3d);
    console.log(this.cude3d);
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

    // Обновляем raycaster
    this.raycaster.setFromCamera(this.mousePos, this.camera);

    // Проверяем пересечения с объектами
    const intersects = this.raycaster.intersectObjects(
      this.rubikCubeGroup.children
    );

    if (intersects.length > 0) {
      if (this.intersectedObject !== intersects[0].object) {
        if (this.intersectedObject) {
          // Возвращаем цвет предыдущему объекту
          this.intersectedObject.material.color.set(
            this.intersectedObject.originalColor
          );
        }
        this.intersectedObject = intersects[0].object;
        console.log("intersectedObject", this.intersectedObject);

        this.intersectedObject.originalColor =
          this.intersectedObject.material.color.getHex();
        this.intersectedObject.material.color.set(0x000000); // Меняем цвет на черный
      }
    } else {
      if (this.intersectedObject) {
        // Возвращаем цвет предыдущему объекту
        this.intersectedObject.material.color.set(
          this.intersectedObject.originalColor
        );
        this.intersectedObject = null;
      }
    }
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
    this.time += 0.05;

    if (this.cude3d) {
      // Вращаем группу
      this.cude3d.rotation.y = Math.sin(this.time * 0.05);
      this.cude3d.children[2].position.x = this.animatePosition(
        this.time,
        0.25,
        -1,
        -2
      );

      this.cude3d.children[20].position.y = this.animatePosition(
        this.time,
        0.25,
        -1,
        -2
      );
      this.cude3d.children[24].position.z = this.animatePosition(
        this.time,
        0.25,
        -1 - this.gap,
        -2
      );
      this.cude3d.children[25].position.z = this.animatePosition(
        this.time,
        0.25,
        0,
        -1 + this.gap
      );

    }

    this.cube.rotation.z += delta;
    this.cube.rotation.y += delta;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  animatePosition(time, frequency, min, max) {
    const amplitude = (max - min) / 2;
    const offset = min + amplitude;
    return Math.sin(time * frequency) * amplitude + offset;
  }
}

// Запуск инициализации, передаем id элемента
export default Sketch;

// Чтобы запустить, просто нужно создать экземпляр класса
// const sketch = new Sketch('canvas');
