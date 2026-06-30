export const arch_polygonal_mirrored_pattern = {
  id: 'polygonal_mirrored_pattern',
  name: 'Polygonal mirrored pattern',
  categories: ["Geometric","Random"],
  controlsType: 'lines',
  iconUrl: '/patterns/polygonal_mirrored_pattern.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 300,
    height: 600,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Polygonal mirrored pattern',
      description: 'Patrón de sombreado tipo Polygonal mirrored pattern. Uso general para representación CAD geométrica.'
    },
    en: {
      name: 'Polygonal mirrored pattern',
      description: 'Hatch pattern type Polygonal mirrored pattern. General use for geometric CAD representation.'
    },
    pt: {
      name: 'Polygonal mirrored pattern',
      description: 'Padrão de hachura tipo Polygonal mirrored pattern. Uso geral para representação CAD geométrica.'
    }
  }
};
