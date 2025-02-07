import * as THREE from 'three';
import { getRandomColor } from "./utils.js";

const sceneMiddle = new THREE.Vector3(0, 0, 0);

// Функция для добавления физики в зависимости от геометрии
const addPhysics = (world, geoType, size, x, y, z, RAPIER) => {
  let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z);
  let rigid = world.createRigidBody(rigidBodyDesc);
  let colliderDesc;

  switch (geoType) {
    case 'sphere':
      colliderDesc = RAPIER.ColliderDesc.ball(size).setDensity(size * 1.0);
      break;
    case 'box':
      const halfSize = size / 2;
      colliderDesc = RAPIER.ColliderDesc.cuboid(halfSize, halfSize, halfSize).setDensity(size * 1.0);
      break;
    case 'cylinder':
      colliderDesc = RAPIER.ColliderDesc.cylinder(size / 2, size / 2).setDensity(size * 1.0);
      break;
    case 'capsule':
      colliderDesc = RAPIER.ColliderDesc.capsule(size / 2, size / 2).setDensity(size * 1.0);
      break;
    case 'cone':
      colliderDesc = RAPIER.ColliderDesc.cone(size / 2, size).setDensity(size * 1.0);
      break;
    case 'polyhedron':
      colliderDesc = RAPIER.ColliderDesc.ball(size).setDensity(size * 1.0);
      break;
    default:
      console.warn('Неизвестная геометрия для физики: ', geoType);
      return null;
  }

  world.createCollider(colliderDesc, rigid);
  return rigid;
};

// Генерация сферы с физикой
const generateSphere = (world, RAPIER) => {
  const size = 0.1 + Math.random() * 0.25;
  const range = 2;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;

  const color = getRandomColor();
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);

  // Добавляем физику
  const rigid = addPhysics(world, 'sphere', size, x, y, z, RAPIER);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0x000, wireframe: true });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.001);
  mesh.add(wireMesh);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }

  return { mesh, rigid, update };
};

// Генерация куба с физикой
const generateCube = (world, RAPIER) => {
  const size = 0.1 + Math.random() * 0.25;
  const range = 2;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;

  const color = getRandomColor();
  const geo = new THREE.BoxGeometry(size, size, size);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);

  // Добавляем физику
  const rigid = addPhysics(world, 'box', size, x, y, z, RAPIER);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0x000, wireframe: true });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.001);
  mesh.add(wireMesh);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }

  return { mesh, rigid, update };
};

// Пример генерации цилиндра с физикой
const generateCylinder = (world, RAPIER) => {
  const size = 0.1 + Math.random() * 0.25;
  const range = 2;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;

  const color = getRandomColor();
  const geo = new THREE.CylinderGeometry(size / 2, size / 2, size, 32);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);

  // Добавляем физику
  const rigid = addPhysics(world, 'cylinder', size, x, y, z, RAPIER);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0x000, wireframe: true });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.001);
  mesh.add(wireMesh);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }

  return { mesh, rigid, update };
};

// Генерация октаэдра с физикой
const generateOctahedron = (world, RAPIER) => {
  const size = 0.1 + Math.random() * 0.25;
  const range = 2;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;

  const color = getRandomColor();
  const geo = new THREE.OctahedronGeometry(size);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);

  // Добавляем физику как многограннику
  const rigid = addPhysics(world, 'polyhedron', size, x, y, z, RAPIER);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0x000, wireframe: true });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.001);
  mesh.add(wireMesh);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }

  return { mesh, rigid, update };
};

// Генерация икосаэдра с физикой
const generateIcosahedron = (world, RAPIER) => {
  const size = 0.1 + Math.random() * 0.25;
  const range = 2;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;

  const color = getRandomColor();
  const geo = new THREE.IcosahedronGeometry(size);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);

  // Добавляем физику как многограннику
  const rigid = addPhysics(world, 'polyhedron', size, x, y, z, RAPIER);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0x000, wireframe: true });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.001);
  mesh.add(wireMesh);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }

  return { mesh, rigid, update };
};

// Генерация тетраэдра с физикой
const generateTetrahedron = (world, RAPIER) => {
  const size = 0.1 + Math.random() * 0.25;
  const range = 2;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;

  const color = getRandomColor();
  const geo = new THREE.TetrahedronGeometry(size);
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);

  // Добавляем физику как многограннику
  const rigid = addPhysics(world, 'polyhedron', size, x, y, z, RAPIER);

  const wireMat = new THREE.MeshBasicMaterial({ color: 0x000, wireframe: true });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  wireMesh.scale.setScalar(1.001);
  mesh.add(wireMesh);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }

  return { mesh, rigid, update };
};

const geometryGenerators = [
  generateCube,
  generateSphere,
  generateCylinder,
  generateOctahedron,
  generateIcosahedron,
  generateTetrahedron,
];

const generateRandomGeometry = (world, RAPIER) => {
  const randomIndex = Math.floor(Math.random() * geometryGenerators.length);
  return geometryGenerators[randomIndex](world, RAPIER);
};

export { generateRandomGeometry }
