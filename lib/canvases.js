const DEBOUNCE_RATE = 200;
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

function createCanvas(window, div) {
  let canvas = document.createElement('canvas');
  div.appendChild(canvas);
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;

  Object.assign(canvas.style, FULLSCREEN_STYLE);

  const ctx = canvas.getContext('2d');

  return { canvas, ctx };
}

function handleResizes (canvases, draw) {
  function resize() {
    canvases.forEach(({ canvas }) => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
    });
    draw();
  }
  window.addEventListener('resize', debounce(resize, DEBOUNCE_RATE), false);
  resize();
}

module.exports = function createCanvases (window) {
  let container = createContainingDiv(window);

  // This canvas contains all of the treemap
  let main = createCanvas(window, container);

  // This canvas contains only the zoomed in portion, overlayed over the main canvas
  let zoomed = createCanvas(window, container);

  function addRedrawFunction(draw) {
    handleResizes([main, zoomed], draw);
  }

  return { container, main, zoomed, addRedrawFunction };
}
