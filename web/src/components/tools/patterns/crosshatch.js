export const arch_crosshatch = {
  id: 'crosshatch',
  name: 'Crosshatch',
  categories: ["Parquetry","Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/crosshatch.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 750,
    height: 750,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Crosshatch',
      description: 'Patrón de pavimento o suelo tipo Crosshatch. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Crosshatch',
      description: 'Paving or flooring pattern type Crosshatch. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Crosshatch',
      description: 'Padrão de pavimento ou piso tipo Crosshatch. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
