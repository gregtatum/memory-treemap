let debounce = require('debounce');
const DEBOUNCE_RATE = 100;
const FULLSCREEN_STYLE = {
  width: '100%',
  height: '100%',
  position: 'absolute',
};

function createContainingDiv (window) {
  let div = window.document.createElement('div');
  Object.assign(div.style, FULLSCREEN_STYLE);
  document.body.appendChild(div);
  return div;
}

function createCanvas(window, div, className) {
  let canvas = document.createElement('canvas');
  div.appendChild(canvas);
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.className = className;

  Object.assign(canvas.style, FULLSCREEN_STYLE, {
    pointerEvents: 'none'
  });

  const ctx = canvas.getContext('2d');

  return { canvas, ctx };
}

function handleResizes (canvases) {
  function resize() {
    let width = window.innerWidth * window.devicePixelRatio;
    let height = window.innerHeight * window.devicePixelRatio;

    canvases.main.canvas.width = width;
    canvases.main.canvas.height = height;
    canvases.zoom.canvas.width = width;
    canvases.zoom.canvas.height = height;

    canvases.onResize();
  }
  window.addEventListener('resize', debounce(resize, DEBOUNCE_RATE), false);
  resize();
}

module.exports = function createCanvases (window) {
  let container = createContainingDiv(window);

  // This canvas contains all of the treemap
  let main = createCanvas(window, container, 'main');

  // This canvas contains only the zoomed in portion, overlayed over the main canvas
  let zoom = createCanvas(window, container, 'zoom');

  let canvases = {
    container,
    main,
    zoom,
    onResize: function noop() {}
  };

  handleResizes(canvases);

  return canvases;
}
