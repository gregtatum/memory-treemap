const setupDraw = require('./draw');
const scrolling = require('./scrolling');
const createCanvases = require('./canvases');
const census = require('./census1.json');


/**
 * Initialize the treemap components
 *
 * @param  {Window} window
 */
function init (window) {

  let canvases = createCanvases(window);
  let scroll = scrolling(window, canvases.container);

	let draw = setupDraw(
    window,
    window.d3,
    census,
    canvases,
    scroll
  );
}

init(window);
