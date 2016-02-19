const LERP_SPEED = 0.5;
const ZOOM_SPEED = 0.01;
const DEBOUNCE_RATE = 200;
const debounce = require('debounce');

function lerp(a, b, t) {
    return a * ( 1 - t ) + b * t;
}

function startUpdateLoop (window, container, scroll) {
  function update () {
    scroll.smoothZoom = lerp(scroll.smoothZoom, scroll.zoom, LERP_SPEED);
    scroll.smoothTranslateX = lerp(scroll.smoothTranslateX, scroll.translateX, LERP_SPEED);
    scroll.smoothTranslateY = lerp(scroll.smoothTranslateY, scroll.translateY, LERP_SPEED);

    let zoom = 1 + scroll.smoothZoom;
    container.style.transform = `translate(${scroll.smoothTranslateX}px, ${scroll.smoothTranslateY}px) scale(${zoom})`;
    window.requestAnimationFrame(update)
  }
  update();
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

function setDragHandlers (window, container, scroll, changed) {
  function startDrag () {
    scroll.isDragging = true;
    container.style.cursor = 'grabbing';
  }

  function stopDrag () {
    scroll.isDragging = false;
    container.style.cursor = 'grab';
  }

  function drag (event) {
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
    event.preventDefault()
  }

  container.addEventListener('mousedown', startDrag, false);
  container.addEventListener('touchstart', startDrag, false);

  container.addEventListener('mouseup', stopDrag, false);
  container.addEventListener('mouseout', stopDrag, false);
  container.addEventListener('touchend', stopDrag, false);

  container.addEventListener('mousemove', drag, false);
  container.addEventListener('touchmove', drag, false);

}

function setScrollHandlers(window, scroll, changed) {

  window.addEventListener('wheel', function mouseWheel (event) {
    if(scroll.isDragging) {
      return;
    }

    // Update the zoom level
    let prevZoom = scroll.zoom;
    scroll.zoom = Math.max(0, scroll.zoom - event.deltaY * ZOOM_SPEED);
    let deltaZoom = scroll.zoom - prevZoom;

    // Calculate the updated width and height
    let prevHeight = window.innerHeight * (1 + prevZoom);
    let prevWidth = window.innerWidth * (1 + prevZoom);
    scroll.height = window.innerHeight * (1 + scroll.zoom);
    scroll.width = window.innerWidth * (1 + scroll.zoom);
    let deltaWidth = scroll.width - prevWidth;
    let deltaHeight = scroll.height - prevHeight;

    // Figure out the translation
    let overdrawX = (scroll.width - window.innerWidth) / 2;
    let overdrawY = (scroll.height - window.innerHeight) / 2;

    let translateRatioX = (scroll.mouseX + overdrawX - scroll.translateX) / scroll.width;
    let translateRatioY = (scroll.mouseY + overdrawY - scroll.translateY) / scroll.height;

    // let scrollRatioX = (window.innerWidth - scroll.mouseX) / window.innerWidth;
    // let scrollRatioY = (window.innerHeight - scroll.mouseY) / window.innerHeight;

    scroll.translateX -= lerp(-deltaWidth, deltaWidth, translateRatioX);
    scroll.translateY -= lerp(-deltaHeight, deltaHeight, translateRatioY);

    // Keep the canvas in range of the window
    keepInView(window, scroll);

    changed();

    event.preventDefault();
  }, false)
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

  setDragHandlers(window, container, scroll, changed);
  setScrollHandlers(window, scroll, changed);
  startUpdateLoop(window, container, scroll);

  return scroll;
}
