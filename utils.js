import * as THREE from "three";

const colorsArray = [
  new THREE.Color(0x9160e6), // фиолетовый
  new THREE.Color(0xffeb23), // желтый
  new THREE.Color(0xffffff)  // белый
];

const getRandomColor = () => {
  const randomHue = Math.random() * 360; // Случайный оттенок (0-360)
  const randomSaturation = Math.random() * 100; // Случайная насыщенность (0-100%)
  const randomLightness = 10 + Math.random() * 90; // Случайная яркость (0-100%)

  const randomColor = new THREE.Color(`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`);

  return randomColor;
};

const pickRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * colorsArray.length);
  return colorsArray[randomIndex];
};

export { getRandomColor, pickRandomColor, colorsArray }
