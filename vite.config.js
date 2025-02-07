import glsl from 'vite-plugin-glsl';

export default {
  base: './',
  root: './',
  server: {
    port: 3000,
    open: true,
  },
  plugins: [glsl()],
};
