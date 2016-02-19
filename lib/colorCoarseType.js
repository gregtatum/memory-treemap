const TYPES = [ "objects", "other", "strings", "scripts" ];
// The factors determine how much the hue shifts
const TYPE_FACTOR = TYPES.length * 3;
const DEPTH_FACTOR = -10;
const SIBLING_FACTOR = 1
const H = 0.5;
const S = 0.6;
const L = 0.9;

function findCoarseTypeIndex (node) {
  let index = TYPES.indexOf(node.name);
  return index === -1 ? findCoarseTypeIndex(node.parent) : index;
}

function siblingColor (node) {
  let siblings = node.parent.children;
  let unitIndex = siblings.indexOf(node) / siblings.length;
  return unitIndex * SIBLING_FACTOR;
}

function depthColor (node) {
  return Math.min(1, node.depth / DEPTH_FACTOR);
}

function typeColor (node) {
  return findCoarseTypeIndex(node) / TYPE_FACTOR;
}

module.exports = function colorCoarseType (node) {
  let h = Math.min(1, H + typeColor(node));
  let s = Math.min(1, S);
  let l = Math.min(1, L + depthColor(node));

  return [h, s, l];
}
