varying vec2 vUv;

void main() {
  vUv = uv;  // Передаем стандартный атрибут uv в varying переменную
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
