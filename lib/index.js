const debounce = require('debounce');
const setupDraw = require('./draw');
const scrolling = require('./scrolling');
const createCanvases = require('./canvases');
const census = require('./census1.json');

function init (window) {

  let canvases = createCanvases(window);
  let scroll = scrolling(window, canvases.container);

	let draw = setupDraw(
    window,
    window.d3,
    census,
    canvases.main.canvas,
    canvases.main.ctx,
    scroll
  );
}

init(window);
