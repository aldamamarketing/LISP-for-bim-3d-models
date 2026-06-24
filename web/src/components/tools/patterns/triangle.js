export const arch_triangle = {
  id: 'triangle',
  name: 'Triangle',
  categories: ["Geometric","Paving"],
  controlsType: 'lines',
  iconUrl: '/patterns/triangle.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 400,
    height: 400,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Triangle',
      description: 'Patrón de pavimento o suelo tipo Triangle. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Triangle',
      description: 'Paving or flooring pattern type Triangle. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Triangle',
      description: 'Padrão de pavimento ou piso tipo Triangle. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
