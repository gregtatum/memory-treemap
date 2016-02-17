const colorCoarseType = require('./colorCoarseType');
const { hslToStyle } = require('@tatumcreative/color')
const debounce = require('debounce');
const ELLIPSIS = '...';
const BYTES = 1024;
const KILOBYTES = Math.pow(BYTES, 2);
const MEGABYTES = Math.pow(BYTES, 3);
const GIGABYTES = Math.pow(BYTES, 4);

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

function configureTreemap (d3, canvas, config, ratio) {
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

function drawText (ctx, node, config, borderWidth, ratio) {
  let { dx, dy, name, totalBytes, totalCount } = node;

  // Start checking to see how much text we can fit in, optimizing for the
  // common case of lots of small leaf nodes
  if (config.fontSize * config.fontLineHeight < dy) {
    let margin = borderWidth(node) * 1.5 + ratio * config.textMargin;
    let x = margin + node.x;
    let y = margin + node.y;
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

function drawBox (ctx, node, config, borderWidth, ratio) {
  let offset = borderWidth(node);
  let color = colorCoarseType(node);

  // Offset the draw so that box strokes don't overlap
  let x = node.x + offset / 2;
  let y = node.y + offset / 2;
  let dx = node.dx - offset;
  let dy = node.dy - offset;

  ctx.fillStyle = hslToStyle(...color, 0.2);
  ctx.fillRect(x, y, dx, dy);

  ctx.strokeStyle = hslToStyle(...color, 1);
  ctx.lineWidth = offset
  ctx.strokeRect(x, y, dx, dy);
}

function drawTreemap (window, canvas, ctx, nodes, config) {
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
    drawBox(ctx, node, config, borderWidth, ratio);
    drawText(ctx, node, config, borderWidth, ratio)
  }
}

module.exports = function setupDraw (window, d3, census, canvas, ctx) {
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


  function draw() {
    // TODO - optimize
    let treemap = configureTreemap(d3, canvas, config, window.devicePixelRatio);
    console.time('treemap()');
    let nodes = treemap(census);
    console.timeEnd('treemap()');

    console.time('drawTreemap');
    drawTreemap(window, canvas, ctx, nodes, config);
    console.timeEnd('drawTreemap');
  }

  window.addEventListener('resize', debounce(draw), false);
  draw();
  return draw;
}
