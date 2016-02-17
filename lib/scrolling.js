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

    let zoom = 1 + scroll.smoothZoom * ZOOM_SPEED;
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

  container.addEventListener('mousedown', startDrag);
  container.addEventListener('touchstart', startDrag);

  container.addEventListener('mouseup', stopDrag);
  container.addEventListener('mouseout', stopDrag);
  container.addEventListener('touchend', stopDrag);

  container.addEventListener('mousemove', drag);
  container.addEventListener('touchmove', drag);

}

function setScrollHandlers(window, scroll, changed) {

  window.addEventListener('wheel', function mouseWheel (event) {
    if(scroll.isDragging) {
      return;
    }

    // Update the zoom level
    let prevZoom = scroll.zoom;
    scroll.zoom = Math.max(0, scroll.zoom - event.deltaY);
    let deltaZoom = scroll.zoom - prevZoom;

    // Calculate the updated width and height
    let prevHeight = window.innerHeight * (1 + prevZoom * ZOOM_SPEED);
    let prevWidth = window.innerWidth * (1 + prevZoom * ZOOM_SPEED);
    scroll.height = window.innerHeight * (1 + scroll.zoom * ZOOM_SPEED);
    scroll.width = window.innerWidth * (1 + scroll.zoom * ZOOM_SPEED);
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
  })
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
    onChange: function noop () {},
  };

  let changed = debounce(() => scroll.onChange(), DEBOUNCE_RATE);

  setDragHandlers(window, container, scroll, changed);
  setScrollHandlers(window, scroll, changed);
  startUpdateLoop(window, container, scroll);

  return scroll;
}
