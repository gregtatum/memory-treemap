/**
 * Create 2 canvases and contexts for drawing onto, 1 main canvas, and 1 zoom
 * canvas. See draw.js for more information on why.
 */
let debounce = require('debounce');

const DEBOUNCE_RATE = 100;
const FULLSCREEN_STYLE = {
  width: '100%',
  height: '100%',
  position: 'absolute',
};


/**
 * Create the containing div
 *
 * @param  {Window} window
 * @return {HTMLDivElement}
 */
function createContainingDiv (window) {
  let div = window.document.createElement('div');
  Object.assign(div.style, FULLSCREEN_STYLE);
  document.body.appendChild(div);
  return div;
}


/**
 * Create a canvas and context
 *
 * @param  {Window} window
 * @param  {HTMLDivElement} div
 * @param  {String} className
 * @return {Object} { canvas, ctx }
 */
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


/**
 * Resize the canvases' resolutions, and fires out the onResize callback
 *
 * @param  {Window} window
 * @param  {Object} canvases
 */
function handleResizes (window, canvases) {
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


/**
 * Create the canvases, resize handlers, and return references to them all
 *
 * @param  {Window} window
 * @return {Object}
 */
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

  handleResizes(window, canvases);

  return canvases;
}
