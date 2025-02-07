import * as THREE from "three";

const getRandomColor = () => {
  const randomHue = Math.random() * 360; // Случайный оттенок (0-360)
  const randomSaturation = Math.random() * 100; // Случайная насыщенность (0-100%)
  const randomLightness = 10 + Math.random() * 90; // Случайная яркость (0-100%)

  const randomColor = new THREE.Color(`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`);

  return randomColor;
};

export { getRandomColor }
