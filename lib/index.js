const draw = require('./draw')
const census = require('./census1.json')

function createAndPrepCanvas (window) {
  let document = window.document;
  let canvas = window.document.createElement('canvas');
  Object.assign(canvas.style, {
    width: '100%',
    height: '100%',
    position: 'absolute'
  })
  document.body.appendChild(canvas);

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  }
	window.addEventListener('resize', resize, false);
	resize();

  const ctx = canvas.getContext('2d');

  return { canvas, ctx };
}

function init (window) {
	let { canvas, ctx } = createAndPrepCanvas(window);
	draw(window, window.d3, census, canvas, ctx);
}

init(window);
