export const arch_domino_paving = {
  id: 'domino_paving',
  name: 'Domino paving',
  categories: ["Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/domino_paving.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 850,
    height: 680,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Domino paving',
      description: 'Patrón de pavimento o suelo tipo Domino paving. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Domino paving',
      description: 'Paving or flooring pattern type Domino paving. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Domino paving',
      description: 'Padrão de pavimento ou piso tipo Domino paving. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
