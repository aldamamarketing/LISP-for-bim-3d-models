export const arch_compass = {
  id: 'compass',
  name: 'Compass',
  categories: ["Geometric","Paving"],
  controlsType: 'lines',
  iconUrl: '/patterns/compass.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 261,
    height: 261,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Compass',
      description: 'Patrón de pavimento o suelo tipo Compass. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Compass',
      description: 'Paving or flooring pattern type Compass. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Compass',
      description: 'Padrão de pavimento ou piso tipo Compass. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
