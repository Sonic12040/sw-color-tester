/**
 * DOM Utilities — Unified HTML → DOM construction.
 *
 * Every HTML string produced by templates.js passes through one of these
 * factories so controllers always receive real DOM nodes they can append,
 * diff, or attach listeners to *before* injection into the live tree.
 */

/** Reusable <template> element — avoids creating one per call. */
const _tmpl = document.createElement("template");

/**
 * Parse an HTML string into a single DOM element.
 * @param {string} html - HTML markup containing exactly one root element.
 * @returns {Element} The first element child of the parsed markup.
 */
export function parseHTML(html) {
  _tmpl.innerHTML = html;
  return _tmpl.content.firstElementChild;
}

/**
 * Parse an HTML string that contains multiple sibling root elements
 * into a DocumentFragment.
 * @param {string} html - HTML markup with one or more root elements.
 * @returns {DocumentFragment} Fragment containing all parsed nodes.
 */
export function parseHTMLFragment(html) {
  _tmpl.innerHTML = html;
  const frag = document.createDocumentFragment();
  while (_tmpl.content.firstChild) {
    frag.appendChild(_tmpl.content.firstChild);
  }
  return frag;
}

/**
 * Parse SVG inner content (e.g. `<path>`, `<line>`) into correctly-namespaced
 * DOM nodes. Wraps the markup in a temporary `<svg>` so the HTML parser
 * switches to the SVG namespace, then extracts the children.
 * @param {string} svgContent - SVG child markup (paths, lines, circles, etc.).
 * @returns {DocumentFragment} Fragment with SVG-namespaced nodes.
 */
export function parseSVGContent(svgContent) {
  _tmpl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
  const svg = _tmpl.content.firstElementChild;
  const frag = document.createDocumentFragment();
  while (svg.firstChild) {
    frag.appendChild(svg.firstChild);
  }
  return frag;
}
