const LERP_SPEED = 0.5;
const ZOOM_SPEED = 0.01;
const DEBOUNCE_RATE = 100;
const TRANSLATE_EPSILON = 1;
const ZOOM_EPSILON = 0.001;
const LINE_SCROLL_MODE = 1;
const debounce = require('debounce');

/**
 * Linearly interpolate between 2 numbers
 *
 * @param {Number} a
 * @param {Number} b
 * @param {Number} t
 *        A value of 0 returns a, and 1 returns b
 * @return {Number}
 */
function lerp(a, b, t) {
  return a * ( 1 - t ) + b * t;
}

/**
 * Returns an update loop. This loop smoothly updates the visualization when
 * actions are performed. Once the animations have reached their target values
 * the animation loop is stopped.
 *
 * @param {Window} window
 * @param {HTMLElement} container
 * @param {Object} dragZoom
 *        The values that represent the current dragZoom state
 */
function createUpdateLoop (window, container, dragZoom) {
  let isLooping = false;

  function update () {
    let scrollChanging = Math.abs(dragZoom.smoothZoom - dragZoom.zoom) > ZOOM_EPSILON;
    let translateChanging = (
      Math.abs(dragZoom.smoothTranslateX - dragZoom.translateX) > TRANSLATE_EPSILON ||
      Math.abs(dragZoom.smoothTranslateY - dragZoom.translateY) > TRANSLATE_EPSILON
    );

    isLooping = scrollChanging || translateChanging;

    if(scrollChanging) {
      dragZoom.smoothZoom = lerp(dragZoom.smoothZoom, dragZoom.zoom, LERP_SPEED);
    } else {
      dragZoom.smoothZoom = dragZoom.zoom;
    }

    if(translateChanging) {
      dragZoom.smoothTranslateX = lerp(dragZoom.smoothTranslateX, dragZoom.translateX, LERP_SPEED);
      dragZoom.smoothTranslateY = lerp(dragZoom.smoothTranslateY, dragZoom.translateY, LERP_SPEED);
    } else {
      dragZoom.smoothTranslateX = dragZoom.translateX;
      dragZoom.smoothTranslateY = dragZoom.translateY;
    }

    let zoom = 1 + dragZoom.smoothZoom;
    container.style.transform = `translate(${dragZoom.smoothTranslateX}px, ${dragZoom.smoothTranslateY}px) scale(${zoom})`;

    if(isLooping) {
      window.requestAnimationFrame(update)
    }
  }

  return function restartLoopingIfStopped () {
    if(!isLooping) {
      update();
    }
  }
}


/**
 * Keep the dragging and zooming within the view
 *
 * @param  {Window} window
 * @param  {Object} dragZoom
 */
function keepInView (window, dragZoom) {
  let overdrawX = (dragZoom.width - window.innerWidth) / 2;
  let overdrawY = (dragZoom.height - window.innerHeight) / 2;

  dragZoom.translateX = Math.max(-overdrawX, Math.min(overdrawX, dragZoom.translateX));
  dragZoom.translateY = Math.max(-overdrawY, Math.min(overdrawY, dragZoom.translateY));

  dragZoom.offsetX = dragZoom.width - window.innerWidth - dragZoom.translateX * 2;
  dragZoom.offsetY = dragZoom.height - window.innerHeight - dragZoom.translateY * 2;
}


/**
 * Sets handlers for when the user drags on the canvas. It will update current
 * dragZoom state with a new translate values.
 *
 * @param  {Window} window
 * @param  {HTMLElement} container
 * @param  {Object} dragZoom
 * @param  {Function} changed
 * @param  {Function} update
 */
function setDragHandlers (window, container, dragZoom, changed, update) {
  function startDrag () {
    dragZoom.isDragging = true;
    container.style.cursor = 'grabbing';
  }

  function stopDrag () {
    dragZoom.isDragging = false;
    container.style.cursor = 'grab';
  }

  function drag (event) {
    event.preventDefault()

    let prevMouseX = dragZoom.mouseX;
    let prevMouseY = dragZoom.mouseY;

    dragZoom.mouseX = event.clientX;
    dragZoom.mouseY = event.clientY;

    if(!dragZoom.isDragging) {
      return;
    }

    dragZoom.translateX += dragZoom.mouseX - prevMouseX;
    dragZoom.translateY += dragZoom.mouseY - prevMouseY;

    keepInView(window, dragZoom);

    changed();
    update();
  }

  container.addEventListener('mousedown', startDrag, false);
  container.addEventListener('touchstart', startDrag, false);

  container.addEventListener('mouseup', stopDrag, false);
  container.addEventListener('mouseout', stopDrag, false);
  container.addEventListener('touchend', stopDrag, false);

  container.addEventListener('mousemove', drag, false);
  container.addEventListener('touchmove', drag, false);

}


/**
 * Account for the various mouse wheel event types, per pixel or per line
 *
 * @param  {Window} window
 * @param  {WheelEvent} event
 * @return {Number} The scroll size in pixels
 */
function getScrollDelta (window, event) {
  if(event.deltaMode === LINE_SCROLL_MODE) {
    let fontSize = parseFloat(
      window.getComputedStyle(window.document.body).getPropertyValue('line-height')
    );
    return event.deltaY * fontSize;
  } else {
    return event.deltaY;
  }
}


/**
 * Sets the handlers for when the user scrolls. It updates the dragZoom state and
 * keeps it all within the view. After changing values the changed and update
 * handlers are called
 *
 * @param  {Window} window
 * @param  {Object} dragZoom
 * @param  {Function} changed
 * @param  {Function} update
 */
function setScrollHandlers(window, dragZoom, changed, update) {

  window.addEventListener('wheel', function mouseWheel (event) {
    event.preventDefault();

    if(dragZoom.isDragging) {
      return;
    }

    // Update the zoom level
    let scrollDelta = getScrollDelta(window, event);
    let prevZoom = dragZoom.zoom;
    dragZoom.zoom = Math.max(0, dragZoom.zoom - scrollDelta * ZOOM_SPEED);
    let deltaZoom = dragZoom.zoom - prevZoom;

    // Calculate the updated width and height
    let prevHeight = window.innerHeight * (1 + prevZoom);
    let prevWidth = window.innerWidth * (1 + prevZoom);
    dragZoom.height = window.innerHeight * (1 + dragZoom.zoom);
    dragZoom.width = window.innerWidth * (1 + dragZoom.zoom);
    let deltaWidth = dragZoom.width - prevWidth;
    let deltaHeight = dragZoom.height - prevHeight;

    // Set mouse position to range [-1, 1]
    let mouseRangeX = dragZoom.mouseX / window.innerWidth * 2 - 1;
    let mouseRangeY = dragZoom.mouseY / window.innerHeight * 2 - 1;

    // Offset the translate by half the change in size, and the position of
    // the mouse on the screen
    dragZoom.translateX -= deltaWidth * 0.5 * mouseRangeX;
    dragZoom.translateY -= deltaHeight * 0.5 * mouseRangeY;

    // Keep the canvas in range of the window
    keepInView(window, dragZoom);
    changed();
    update();
  }, false);
}

/**
 * The main entry into dragging and zooming. Defines the dragZoom state, sets
 * the event handlers, and kicks off the update loop.
 *
 * @param  {Window} window
 *         The window element to operate within
 * @param  {HTMLElement} container description
 *         The container for the canvases
 * @return {Object} dragZoom
 *         The main dragZoom state
 */
module.exports = function startDraggingAndZooming (window, container) {

  let dragZoom = {
    isDragging: false,

    // The current mouse position
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,

    // The total size of the visualization after being zoomed, in pixels
    width: window.innerWidth,
    height: window.innerHeight,

    // How much the visualization has been zoomed in
    zoom: 0,

    // The offset of visualization from the container. This is applied after
    // the zoom, and the visualization by default is centered
    translateX: 0,
    translateY: 0,

    // The size of the offset between the top/left of the window, and the
    // top/left of the containing element
    offsetX: 0,
    offsetY: 0,

    // This is the callback after the dragZoom values have been changed, to be
    // set by the consuming code
    onChange: function noop () {},

    // The smoothed values that are animated and eventuallu match the target
    // values
    smoothZoom: 0,
    smoothTranslateX: 0,
    smoothTranslateY: 0
  };

  let changed = debounce(() => dragZoom.onChange(), DEBOUNCE_RATE);

  let update = createUpdateLoop(window, container, dragZoom);
  setDragHandlers(window, container, dragZoom, changed, update);
  setScrollHandlers(window, dragZoom, changed, update);
  update();

  return dragZoom;
}
