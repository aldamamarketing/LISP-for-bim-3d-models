export const arch_windmill = {
  id: 'windmill',
  name: 'Windmill',
  categories: ["Parquetry","Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/windmill.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 300,
    height: 300,
    joint: 0,
    rows: 2,
    columns: 2
  },
  hasBackendEngine: true,
  i18n: {
    es: {
      name: 'Windmill',
      description: 'Patrón de pavimento o suelo tipo Windmill. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Windmill',
      description: 'Paving or flooring pattern type Windmill. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Windmill',
      description: 'Padrão de pavimento ou piso tipo Windmill. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
