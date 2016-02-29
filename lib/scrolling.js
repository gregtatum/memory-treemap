const LERP_SPEED = 0.5;
const ZOOM_SPEED = 0.01;
const DEBOUNCE_RATE = 100;
const TRANSLATE_EPSILON = 1;
const ZOOM_EPSILON = 0.001;
const LINE_SCROLL_MODE = 1;
const debounce = require('debounce');

function lerp(a, b, t) {
  return a * ( 1 - t ) + b * t;
}

function createUpdateLoop (window, container, scroll) {
  let isLooping = false;

  function update () {
    let scrollChanging = Math.abs(scroll.smoothZoom - scroll.zoom) > ZOOM_EPSILON;
    let translateChanging = (
      Math.abs(scroll.smoothTranslateX - scroll.translateX) > TRANSLATE_EPSILON ||
      Math.abs(scroll.smoothTranslateY - scroll.translateY) > TRANSLATE_EPSILON
    );

    isLooping = scrollChanging || translateChanging;

    if(scrollChanging) {
      scroll.smoothZoom = lerp(scroll.smoothZoom, scroll.zoom, LERP_SPEED);
    } else {
      scroll.smoothZoom = scroll.zoom;
    }

    if(translateChanging) {
      scroll.smoothTranslateX = lerp(scroll.smoothTranslateX, scroll.translateX, LERP_SPEED);
      scroll.smoothTranslateY = lerp(scroll.smoothTranslateY, scroll.translateY, LERP_SPEED);
    } else {
      scroll.smoothTranslateX = scroll.translateX;
      scroll.smoothTranslateY = scroll.translateY;
    }

    let zoom = 1 + scroll.smoothZoom;
    container.style.transform = `translate(${scroll.smoothTranslateX}px, ${scroll.smoothTranslateY}px) scale(${zoom})`;

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

function keepInView (window, scroll) {
  let overdrawX = (scroll.width - window.innerWidth) / 2;
  let overdrawY = (scroll.height - window.innerHeight) / 2;

  scroll.translateX = Math.max(-overdrawX, Math.min(overdrawX, scroll.translateX));
  scroll.translateY = Math.max(-overdrawY, Math.min(overdrawY, scroll.translateY));

  // scroll.offsetX = (window.innerWidth * (scroll.zoom + 1) - window.innerWidth) + scroll.translateX;
  // scroll.offsetY = (window.innerHeight * (scroll.zoom + 1) - window.innerHeight) + scroll.translateY;

  scroll.offsetX = scroll.width - window.innerWidth - scroll.translateX * 2;
  scroll.offsetY = scroll.height - window.innerHeight - scroll.translateY * 2;

}

function setDragHandlers (window, container, scroll, changed, update) {
  function startDrag () {
    scroll.isDragging = true;
    container.style.cursor = 'grabbing';
  }

  function stopDrag () {
    scroll.isDragging = false;
    container.style.cursor = 'grab';
  }

  function drag (event) {
    event.preventDefault()

    let prevMouseX = scroll.mouseX;
    let prevMouseY = scroll.mouseY;

    scroll.mouseX = event.clientX;
    scroll.mouseY = event.clientY;

    if(!scroll.isDragging) {
      return;
    }

    scroll.translateX += scroll.mouseX - prevMouseX;
    scroll.translateY += scroll.mouseY - prevMouseY;

    keepInView(window, scroll);

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

// Account for the various mouse wheel event types, per pixel or per line
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

function setScrollHandlers(window, scroll, changed, update) {

  window.addEventListener('wheel', function mouseWheel (event) {
    event.preventDefault();

    if(scroll.isDragging) {
      return;
    }


    // Update the zoom level
    let scrollDelta = getScrollDelta(window, event);
    let prevZoom = scroll.zoom;
    scroll.zoom = Math.max(0, scroll.zoom - scrollDelta * ZOOM_SPEED);
    let deltaZoom = scroll.zoom - prevZoom;

    // Calculate the updated width and height
    let prevHeight = window.innerHeight * (1 + prevZoom);
    let prevWidth = window.innerWidth * (1 + prevZoom);
    scroll.height = window.innerHeight * (1 + scroll.zoom);
    scroll.width = window.innerWidth * (1 + scroll.zoom);
    let deltaWidth = scroll.width - prevWidth;
    let deltaHeight = scroll.height - prevHeight;

    // Set mouse position to range [-1, 1]
    let mouseRangeX = scroll.mouseX / window.innerWidth * 2 - 1;
    let mouseRangeY = scroll.mouseY / window.innerHeight * 2 - 1;

    // Offset the translate by half the change in size, and the position of
    // the mouse on the screen
    scroll.translateX -= deltaWidth * 0.5 * mouseRangeX;
    scroll.translateY -= deltaHeight * 0.5 * mouseRangeY;

    // Keep the canvas in range of the window
    keepInView(window, scroll);
    changed();
    update();
  }, false);
}

module.exports = function handleScrolling (window, container) {

  let scroll = {
    isDragging: false,
    smoothZoom: 0,
    smoothTranslateX: 0,
    smoothTranslateY: 0,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    width: window.innerWidth,
    height: window.innerHeight,
    zoom: 0,
    translateX: 0,
    translateY: 0,
    offsetX: 0,
    offsetY: 0,
    onChange: function noop () {},
  };

  let changed = debounce(() => scroll.onChange(), DEBOUNCE_RATE);

  let update = createUpdateLoop(window, container, scroll);
  setDragHandlers(window, container, scroll, changed, update);
  setScrollHandlers(window, scroll, changed, update);
  update();

  return scroll;
}
