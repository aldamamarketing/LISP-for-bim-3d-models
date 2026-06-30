export const arch_split_rectangle_pattern = {
  id: 'split_rectangle_pattern',
  name: 'Split rectangle pattern',
  categories: ["Paving","Parquetry","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/split_rectangle_pattern.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 180,
    height: 250,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Split rectangle pattern',
      description: 'Patrón de pavimento o suelo tipo Split rectangle pattern. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Split rectangle pattern',
      description: 'Paving or flooring pattern type Split rectangle pattern. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Split rectangle pattern',
      description: 'Padrão de pavimento ou piso tipo Split rectangle pattern. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
