const colorCoarseType = require('./colorCoarseType');
const { hslToStyle } = require('@tatumcreative/color')
const debounce = require('debounce');

function configureTreemap (d3, canvas, config, ratio) {
  let treemap = d3.layout.treemap()
    .size([canvas.width, canvas.height])
    .sticky(true)
    .padding([
      config.padding[0] * ratio + config.fontSize * config.fontLineHeight,
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

/*
    parent - the parent node, or null for the root.
    children - the array of child nodes, or null for leaf nodes.
    value - the node value, as returned by the value accessor.
    depth - the depth of the node, starting at 0 for the root.
    area - the computed pixel area of this node. (TODO: remove?)
    x - the minimum x-coordinate of the node position.
    y - the minimum y-coordinate of the node position.
    z - the orientation of this cell’s subdivision, if any. (TODO: remove?)
    dx - the x-extent of the node position.
    dy - the y-extent of the node position.
*/

function reduceParentOffsets(node, borderWidth, config, ratio, sum = 0) {
  if(node.parent && node.parent.depth !== 0) {
    sum += borderWidth(node.parent) + config.fontSize * config.fontLineHeight * ratio;
    return reduceParentOffsets(node.parent, borderWidth, config, ratio, sum);
  }
  return sum;
}

function drawText (ctx, node, config, borderWidth, parentOffset, ratio) {
  let { x, y, dx, dy } = node;
  let pixelArea = node.area / ratio * ratio;
  let margin = borderWidth(node) * 1.5 + ratio * config.textMargin;

  let innerWidth = dx - margin * 2
  let text = node.name;
  let size = ctx.measureText(text)

  if(size.width < innerWidth && config.fontSize * config.fontLineHeight < dy) {
    ctx.fillStyle = config.textColor;
    ctx.fillText(node.name, x + margin, y + margin);
  }
}

function drawBox (ctx, node, config, borderWidth, parentOffset, ratio) {
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
    let parentOffset = reduceParentOffsets(node, borderWidth, config, ratio);
    drawBox(ctx, node, config, borderWidth, parentOffset, ratio);
    drawText(ctx, node, config, borderWidth, parentOffset, ratio)
  }
}

module.exports = function setupDraw (window, d3, census, canvas, ctx) {
  let config = {
    textMargin: 2,
    textColor: "#000000",
    lineWidth: 0,
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
}
