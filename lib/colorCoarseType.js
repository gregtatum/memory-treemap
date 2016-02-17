/**
 * Color the boxes in the treemap
 */
 
const TYPES = [ "objects", "other", "strings", "scripts" ];
// The factors determine how much the hue shifts
const TYPE_FACTOR = TYPES.length * 3;
const DEPTH_FACTOR = -10;
const SIBLING_FACTOR = 1
const H = 0.5;
const S = 0.6;
const L = 0.9;

/**
 * Recursively find the index of the coarse type of a node
 *
 * @param  {Object} node
 *         d3 treemap
 * @return {Integer}
 *         index
 */
function findCoarseTypeIndex (node) {
  let index = TYPES.indexOf(node.name);
  if(node.parent) {
    return index === -1 ? findCoarseTypeIndex(node.parent) : index;
  } else {
    return TYPES.indexOf("other");
  }
}

/**
 * Decide a color value for siblings
 *
 * @param  {Object} node
 * @return {Number}
 */
function siblingColor (node) {
  let siblings = node.parent.children;
  let unitIndex = siblings.indexOf(node) / siblings.length;
  return unitIndex * SIBLING_FACTOR;
}

/**
 * Decide a color value for depth
 *
 * @param  {Object} node
 * @return {Number}
 */
function depthColor (node) {
  return Math.min(1, node.depth / DEPTH_FACTOR);
}

/**
 * Decide a color value for type
 *
 * @param  {Object} node
 * @return {Number}
 */
function typeColor (node) {
  return findCoarseTypeIndex(node) / TYPE_FACTOR;
}

/**
 * Color a node
 *
 * @param  {Object} node
 * @return {Array} HSL values ranged 0-1
 */
module.exports = function colorCoarseType (node) {
  let h = Math.min(1, H + typeColor(node));
  let s = Math.min(1, S);
  let l = Math.min(1, L + depthColor(node));

  return [h, s, l];
}
