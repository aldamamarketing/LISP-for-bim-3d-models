export const arch_octagon_square = {
  id: 'octagon_square',
  name: 'Octagon Square',
  categories: ["Geometric","Paving"],
  controlsType: 'lines',
  iconUrl: '/patterns/octagon_square.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 155,
    height: 155,
    joint: 0,
    rows: 2,
    columns: 2
  },
  hasBackendEngine: true,
  i18n: {
    es: {
      name: 'Octagon Square',
      description: 'Patrón de pavimento o suelo tipo Octagon Square. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Octagon Square',
      description: 'Paving or flooring pattern type Octagon Square. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Octagon Square',
      description: 'Padrão de pavimento ou piso tipo Octagon Square. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
