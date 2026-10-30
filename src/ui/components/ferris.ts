const FERRIS = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 44" class="ferris-art" aria-hidden="true">
  <g fill="#f74c00" stroke="#a52b00" stroke-width="1.5" stroke-linejoin="round">
    <path d="M14 34 l-8 8 M20 36 l-5 7 M50 34 l8 8 M44 36 l5 7" fill="none" stroke-width="3" stroke-linecap="round"/>
    <path d="M10 20 q-9 -9 -1 -16 q0 7 6 9 z"/>
    <path d="M54 20 q9 -9 1 -16 q0 7 -6 9 z"/>
    <ellipse cx="32" cy="26" rx="22" ry="13"/>
  </g>
  <circle cx="25" cy="21" r="4" fill="#fff"/>
  <circle cx="39" cy="21" r="4" fill="#fff"/>
  <circle cx="26" cy="21.5" r="2" fill="#111"/>
  <circle cx="40" cy="21.5" r="2" fill="#111"/>
  <path d="M27 30 q5 4 10 0" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

/** A fresh Ferris SVG, `width` px wide. The markup is a constant, so innerHTML is safe here. */
export function ferrisSvg(width: number): SVGSVGElement {
  const template = document.createElement("template");
  template.innerHTML = FERRIS.trim();
  const svg = template.content.firstElementChild as SVGSVGElement;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(Math.round((width * 44) / 64)));
  return svg;
}
