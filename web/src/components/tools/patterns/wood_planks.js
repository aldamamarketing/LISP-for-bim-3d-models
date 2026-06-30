export const arch_wood_planks = {
  id: 'wood_planks',
  name: 'Wood Planks',
  description: 'Parametric Wood Planks Pattern',
  category: 'General',
  iconUrl: '/patterns/wood_planks.svg',
  defaults: {
    width: 200,
    height: 200,
    gapX: 0,
    gapY: 0
  },
  params: [
    { id: 'width', label: 'Plank Width', type: 'number', min: 50, max: 1000, value: 200, unit: 'mm' },
    { id: 'height', label: 'Plank Height', type: 'number', min: 10, max: 200, value: 50, unit: 'mm' },
    { id: 'offset', label: 'Stagger Offset', type: 'number', min: 0, max: 100, value: 50, unit: '%' }
  ],
  generate: (p) => {
    let lines = [];
    
    // Horizontal lines (boards)
    lines.push(`0, 0,0, 0,${p.height}`);
    
    // Vertical lines (staggered joints)
    let staggerX = p.width * (p.offset / 100);
    lines.push(`90, 0,0, ${p.height},${p.width}, ${p.height},-${p.height}`);
    lines.push(`90, ${staggerX},${p.height / 2}, ${p.height},${p.width}, ${p.height},-${p.height}`);
    
    return lines;
  }
};
