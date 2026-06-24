export const arch_rectangle_split_pattern = {
  id: 'rectangle_split_pattern',
  name: 'Rectangle split pattern',
  categories: ["Paving","Parquetry","Geometric","Random"],
  controlsType: 'lines',
  iconUrl: '/patterns/rectangle_split_pattern.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 125,
    height: 105,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Rectangle split pattern',
      description: 'Patrón de pavimento o suelo tipo Rectangle split pattern. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Rectangle split pattern',
      description: 'Paving or flooring pattern type Rectangle split pattern. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Rectangle split pattern',
      description: 'Padrão de pavimento ou piso tipo Rectangle split pattern. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
