export const weave = {
  id: 'weave',
  name: 'Weave (Cinta Entrelazada)',
  category: 'Fabric',
  controlsType: 'weave',
  iconUrl: '/patterns/basketweave.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 400,
    height: 400,
    joint: 0,
    rows: 3,
    columns: 3
  },
  generateSvgRenderer: params => {
    const s = params.width || 400;
    const t = params.height || 400;
    const ts = t + s;
    const cycle = 2 * ts;
    const paths = `
        <!-- Vertical 1 (Izquierda) -->
        <line x1="0" y1="0" x2="0" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${2 * t + s}" x2="0" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="0" x2="${t}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="${2 * t + s}" x2="${t}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Horizontal 1 (Arriba) -->
        <line x1="${t}" y1="0" x2="${cycle}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="${t}" x2="${cycle}" y2="${t}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Horizontal 2 (Abajo) -->
        <line x1="0" y1="${ts}" x2="${ts}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${2 * t + s}" y1="${ts}" x2="${cycle}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${ts + t}" x2="${ts}" y2="${ts + t}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${2 * t + s}" y1="${ts + t}" x2="${cycle}" y2="${ts + t}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Vertical 2 (Derecha) -->
        <line x1="${ts}" y1="${t}" x2="${ts}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${ts + t}" y1="${t}" x2="${ts + t}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Compensación de bordes para que las líneas exteriores no se vean más delgadas (1px vs 2px) -->
        <line x1="${cycle}" y1="0" x2="${cycle}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${cycle}" y1="${2 * t + s}" x2="${cycle}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="${cycle}" x2="${cycle}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w: cycle,
      h: cycle,
      baseUnit: ts,
      paths
    };
  }
};
