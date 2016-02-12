const setupDraw = require('./draw');
const census = require('./census1.json');
const debounce = require('debounce');

function createAndPrepCanvas (window) {
  let document = window.document;
  let canvas = window.document.createElement('canvas');
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  Object.assign(canvas.style, {
    width: '100%',
    height: '100%',
    position: 'absolute'
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  return { canvas, ctx };
}

function handleResizes (canvas, draw) {
  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    draw();
  }
  window.addEventListener('resize', debounce(resize), false);
  resize();
}

function init (window) {
	let { canvas, ctx } = createAndPrepCanvas(window);
	let draw = setupDraw(window, window.d3, census, canvas, ctx);
  handleResizes(canvas, draw);
}

init(window);
