export const arch_mazelike_pattern = {
  id: 'mazelike_pattern',
  name: 'Mazelike pattern',
  categories: ["Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/mazelike_pattern.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 480,
    height: 480,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Mazelike pattern',
      description: 'Patrón de pavimento o suelo tipo Mazelike pattern. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Mazelike pattern',
      description: 'Paving or flooring pattern type Mazelike pattern. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Mazelike pattern',
      description: 'Padrão de pavimento ou piso tipo Mazelike pattern. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
