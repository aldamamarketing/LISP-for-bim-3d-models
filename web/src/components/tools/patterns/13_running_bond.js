export const arch_13_running_bond = {
  id: '13_running_bond',
  name: '1/3 Running Bond',
  category: 'Brick Bond',
  controlsType: 'rectangular',
  iconUrl: '/patterns/13_running_bond.svg',
  controls: ['width', 'height', 'joint'],
  defaults: {
    width: 400,
    height: 100,
    joint: 0,
    rows: 6,
    columns: 4
  },
  generateSvgRenderer: params => {
    const w = params.width || 400;
    const h = params.height || 100;
    const th = h * 3;
    const shift = w / 3;
    let paths = `
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h * 2}" x2="${w}" y2="${h * 2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="${shift}" y1="${h}" x2="${shift}" y2="${h * 2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${shift * 2}" y1="${h * 2}" x2="${shift * 2}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w,
      h: th,
      paths
    };
  }
};
