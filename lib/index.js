const setupDraw = require('./draw');
const startDragZoom = require('./dragZoom');
const createCanvases = require('./canvases');
const census = require('./census1.json');

/**
 * Initialize the treemap components
 *
 * @param  {Window} window
 */
function init (window) {

  let canvases = createCanvases(window);
  let dragZoom = startDragZoom(window, canvases.container);

	let draw = setupDraw(
    window,
    window.d3,
    census,
    canvases,
    dragZoom
  );
}

init(window);
