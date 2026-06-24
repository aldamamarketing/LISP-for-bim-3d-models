export const arch_mosaic_tile = {
  id: 'mosaic_tile',
  name: 'Mosaic tile',
  categories: ["Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/mosaic_tile.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 448,
    height: 448,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Mosaic tile',
      description: 'Patrón de pavimento o suelo tipo Mosaic tile. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Mosaic tile',
      description: 'Paving or flooring pattern type Mosaic tile. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Mosaic tile',
      description: 'Padrão de pavimento ou piso tipo Mosaic tile. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
