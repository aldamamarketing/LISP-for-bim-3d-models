export const arch_interlocking_pattern = {
  id: 'interlocking_pattern',
  name: 'Interlocking pattern',
  categories: ["Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/interlocking_pattern.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 340,
    height: 490,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Interlocking pattern',
      description: 'Patrón de pavimento o suelo tipo Interlocking pattern. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Interlocking pattern',
      description: 'Paving or flooring pattern type Interlocking pattern. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Interlocking pattern',
      description: 'Padrão de pavimento ou piso tipo Interlocking pattern. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
