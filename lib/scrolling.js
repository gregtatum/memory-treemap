const LERP_SPEED = 0.5;
const ZOOM_SPEED = 0.01;

function lerp(a, b, t) {
    return a * ( 1 - t ) + b * t;
}

function startUpdateLoop (window, canvas, scroll) {
  function update () {
    scroll.smoothZoom = lerp(scroll.smoothZoom, scroll.zoom, LERP_SPEED);
    scroll.smoothTranslateX = lerp(scroll.smoothTranslateX, scroll.translateX, LERP_SPEED);
    scroll.smoothTranslateY = lerp(scroll.smoothTranslateY, scroll.translateY, LERP_SPEED);

    let zoom = 1 + scroll.smoothZoom * ZOOM_SPEED;
    canvas.style.transform = `translate(${scroll.smoothTranslateX}px, ${scroll.smoothTranslateY}px) scale(${zoom})`;
    window.requestAnimationFrame(update)
  }
  update();
}

function setDragHandlers (window, canvas, scroll) {
  function startDrag () {
    scroll.isDragging = true;
  }

  function stopDrag () {
    scroll.isDragging = false;
  }

  canvas.addEventListener('mousedown', startDrag);
  window.addEventListener('touchstart', startDrag);

  canvas.addEventListener('mouseup', stopDrag);
  window.addEventListener('mouseout', stopDrag);
  window.addEventListener('touchend', stopDrag);
}

function keepInView (window, scroll) {
  let overdrawX = (scroll.width - window.innerWidth) / 2;
  let overdrawY = (scroll.height - window.innerHeight) / 2;

  scroll.translateX = Math.max(-overdrawX, Math.min(overdrawX, scroll.translateX));
  scroll.translateY = Math.max(-overdrawY, Math.min(overdrawY, scroll.translateY));
}

function setDragHandlers (window, canvas, scroll) {
  function startDrag () {
    scroll.isDragging = true;
    canvas.style.cursor = 'grabbing';
  }

  function stopDrag () {
    scroll.isDragging = false;
    canvas.style.cursor = 'grab';
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
    event.preventDefault()
  }

  window.addEventListener('mousedown', startDrag);
  window.addEventListener('touchstart', startDrag);

  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('mouseout', stopDrag);
  window.addEventListener('touchend', stopDrag);

  window.addEventListener('mousemove', drag);
  window.addEventListener('touchmove', drag);

}

function setScrollHandlers(window, canvas, scroll) {

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

    event.preventDefault();
  })
}

module.exports = function handleScrolling (window, canvas) {
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
    translateY: 0
  };

  setDragHandlers(window, canvas, scroll);
  setScrollHandlers(window, canvas, scroll);
  startUpdateLoop(window, canvas, scroll);
}
