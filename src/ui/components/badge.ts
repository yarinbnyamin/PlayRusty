/** A gold medal showing the island number. Only a number is interpolated, so innerHTML is safe. */
export function badgeSvg(islandNumber: number): SVGSVGElement {
  const template = document.createElement("template");
  template.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" class="badge" viewBox="0 0 100 120" width="120" height="144" aria-hidden="true">
  <path d="M30 0 h14 l6 30 l6 -30 h14 l-12 40 h-16 z" fill="#3fb6e0"/>
  <circle cx="50" cy="74" r="40" fill="#f2b632" stroke="#a87700" stroke-width="5"/>
  <circle cx="50" cy="74" r="29" fill="none" stroke="#fff3c4" stroke-width="2"/>
  <text x="50" y="87" text-anchor="middle" font-size="36" font-weight="700" fill="#5a3d00">${Math.trunc(islandNumber)}</text>
</svg>`.trim();
  return template.content.firstElementChild as SVGSVGElement;
}
