const colorCoarseType = require('./colorCoarseType');
const { hslToStyle } = require('@tatumcreative/color')
const ELLIPSIS = '...';
const BYTES = 1024;
const KILOBYTES = Math.pow(BYTES, 2);
const MEGABYTES = Math.pow(BYTES, 3);
const GIGABYTES = Math.pow(BYTES, 4);
const NO_SCROLL = {
  translateX: 0,
  translateY: 0,
  zoom: 0,
  offsetX: 0,
  offsetY: 0
};

/*
  d3 treemap node properties:

  parent - the parent node, or null for the root.
  children - the array of child nodes, or null for leaf nodes.
  value - the node value, as returned by the value accessor.
  depth - the depth of the node, starting at 0 for the root.
  area - the computed pixel area of this node.
  x - the minimum x-coordinate of the node position.
  y - the minimum y-coordinate of the node position.
  z - the orientation of this cell’s subdivision, if any.
  dx - the x-extent of the node position.
  dy - the y-extent of the node position.
*/

function formatBytes(n) {
  if(n < BYTES) {
    return n + 'B';
  } else if(n < KILOBYTES) {
    return Math.floor(n / BYTES)+ 'KB';
  } else if(n < MEGABYTES) {
    return Math.floor(n / KILOBYTES)+ 'MB';
  } else {
    return Math.floor(n / MEGABYTES)+ 'G';
  }
}

function configureD3Treemap (d3, canvas, config, window) {
  let ratio = window.devicePixelRatio;
  let treemap = d3.layout.treemap()
    .size([canvas.width, canvas.height])
    .sticky(true)
    .padding([
      (config.padding[0] + config.fontSize) * ratio,
      config.padding[1] * ratio,
      config.padding[2] * ratio,
      config.padding[3] * ratio,
    ])
    .value(function(d) { return d.bytes });

  return function depthSortedNodes(census) {
    let nodes = treemap(census);
    nodes.sort((a, b) => { a.depth - b.depth });
    return nodes;
  };
}

function drawTruncatedName (ctx, x, y, innerWidth, name) {
  let truncated = name.substr(0, Math.floor(name.length / 2));
  let formatted = truncated + ELLIPSIS;

  if (ctx.measureText(formatted).width > innerWidth) {
    drawTruncatedName(ctx, x, y, innerWidth, truncated);
  } else {
    ctx.fillText(formatted, x, y);
  }
}

function drawText (ctx, node, config, borderWidth, ratio, scroll) {
  let { dx, dy, name, totalBytes, totalCount } = node;
  let scale = scroll.zoom + 1;
  dx *= scale;
  dy *= scale;

  // Start checking to see how much text we can fit in, optimizing for the
  // common case of lots of small leaf nodes
  if (config.fontSize * config.fontLineHeight < dy) {
    let margin = borderWidth(node) * 1.5 + ratio * config.textMargin;
    let x = margin + node.x * scale - scroll.offsetX;
    let y = margin + node.y * scale - scroll.offsetY;
    let innerWidth = dx - margin * 2;
    let nameSize = ctx.measureText(name).width;

    if (ctx.measureText(ELLIPSIS).width > innerWidth) {
      return;
    }

    ctx.fillStyle = config.textColor;

    // The name is too long, halve it, or only show ellipses
    if (nameSize > innerWidth) {
      //Halve the name as an expediant way to shorten it
      drawTruncatedName(ctx, x, y, innerWidth, name)
    } else {
      let bytesFormatted = formatBytes(totalBytes)
      let countFormatted = `${totalCount} count`;
      let byteSize = ctx.measureText(bytesFormatted).width;
      let countSize = ctx.measureText(countFormatted).width;
      let spaceSize = ctx.measureText(' ').width;

      if (nameSize + byteSize + countSize + spaceSize * 3 > innerWidth) {
        ctx.fillText(`${name}`, x, y);
      } else {
        ctx.fillText(name, x, y);
        ctx.fillStyle = config.textLightColor;
        ctx.fillText(`${bytesFormatted} ${countFormatted}`,
          x + nameSize + spaceSize, y);
      }
    }
  }
}

function drawBox (ctx, node, config, borderWidth, ratio, scroll) {
  let border = borderWidth(node);
  let fill = colorCoarseType(node);
  let stroke = [fill[0], fill[1], fill[2] * 0.5]
  let scale = 1 + scroll.zoom;

  // Offset the draw so that box strokes don't overlap
  let x = scale * node.x - scroll.offsetX + border / 2;
  let y = scale * node.y - scroll.offsetY + border / 2;
  let dx = scale * node.dx - border;
  let dy = scale * node.dy - border;

  ctx.fillStyle = hslToStyle(fill);
  ctx.fillRect(x, y, dx, dy);

  ctx.strokeStyle = hslToStyle(stroke);
  ctx.lineWidth = border
  ctx.strokeRect(x, y, dx, dy);
}

function drawTreemap (window, {canvas, ctx}, nodes, config, scroll) {
  let ratio = window.devicePixelRatio;
  let canvasArea = canvas.width * canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${config.fontSize * ratio}px sans-serif`
  ctx.textBaseline = "top";

  function borderWidth(node) {
    let areaRatio = Math.sqrt(node.area / canvasArea);
    return ratio * Math.max(1, config.lineWidth * areaRatio);
  }

  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if(node.parent === undefined) {
      continue;
    }

    drawBox(ctx, node, config, borderWidth, ratio, scroll);
    drawText(ctx, node, config, borderWidth, ratio, scroll);
  }
}

function positionZoomedCanvas (canvas, scroll) {
  let scale = 1 / (1 + scroll.zoom);
  let x = -scroll.translateX;
  let y = -scroll.translateY;
  canvas.style.transform = `scale(${scale}) translate(${x}px, ${y}px)`;
}

function debugZoomedCanvas ({canvas, ctx}) {
  //Temporarily outline the zoomed canvas
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 10;
  ctx.strokeRect(0,0,canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,0,0,0.5)'
  ctx.fillRect(0,0,canvas.width, canvas.height);
}

module.exports = function setupDraw (window, d3, census, canvases, scroll) {
  let config = {
    textMargin: 2,
    textColor: "#000000",
    textLightColor: 'rgba(0,0,0,0.5)',
    lineWidth: 1,
    textMaxArea: 1000,
    fontSize: 10,
    fontLineHeight: 2,
    padding: [5, 5, 5, 5]
  };

  let getTreemap = configureD3Treemap.bind(null,
    d3, canvases.main.canvas, config, window
  );

  let treemap, nodes;

  function drawFullTreemap() {
    treemap = getTreemap()
    nodes = treemap(census);
    drawTreemap(window, canvases.main, nodes, config, NO_SCROLL);
    drawTreemap(window, canvases.zoom, nodes, config, scroll);
  };

  function drawZoomedTreemap() {
    drawTreemap(window, canvases.zoom, nodes, config, scroll);
    positionZoomedCanvas(canvases.zoom.canvas, scroll);

    // debugZoomedCanvas(canvases.zoom)
  };

  drawFullTreemap()
  canvases.onResize = drawFullTreemap
  scroll.onChange = drawZoomedTreemap
}
