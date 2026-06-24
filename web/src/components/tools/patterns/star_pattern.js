export const arch_star_pattern = {
  id: 'star_pattern',
  name: 'Star pattern',
  categories: ["Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/star_pattern.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 760,
    height: 760,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Star pattern',
      description: 'Patrón de pavimento o suelo tipo Star pattern. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Star pattern',
      description: 'Paving or flooring pattern type Star pattern. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Star pattern',
      description: 'Padrão de pavimento ou piso tipo Star pattern. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
