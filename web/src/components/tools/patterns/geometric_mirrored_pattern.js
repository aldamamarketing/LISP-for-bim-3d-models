export const arch_geometric_mirrored_pattern = {
  id: 'geometric_mirrored_pattern',
  name: 'Geometric mirrored pattern',
  categories: ["Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/geometric_mirrored_pattern.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 900,
    height: 900,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Geometric mirrored pattern',
      description: 'Patrón de sombreado tipo Geometric mirrored pattern. Uso general para representación CAD geométrica.'
    },
    en: {
      name: 'Geometric mirrored pattern',
      description: 'Hatch pattern type Geometric mirrored pattern. General use for geometric CAD representation.'
    },
    pt: {
      name: 'Geometric mirrored pattern',
      description: 'Padrão de hachura tipo Geometric mirrored pattern. Uso geral para representação CAD geométrica.'
    }
  }
};
