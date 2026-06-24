export const stack = {
  id: 'stack',
  name: 'Stack',
  category: 'Brick Bond',
  controlsType: 'rectangular',
  iconUrl: '/patterns/stack.svg',
  controls: ['width', 'height', 'joint'],
  defaults: {
    width: 400,
    height: 400,
    joint: 0,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const w = params.width || 400;
    const h = params.height || 400;
    const paths = `
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w,
      h,
      paths
    };
  }
};
