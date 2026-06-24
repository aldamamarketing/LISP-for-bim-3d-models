export const arch_isosceles = {
  id: 'isosceles',
  name: 'Isosceles',
  categories: ["Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/isosceles.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 400,
    height: 693,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Isosceles',
      description: 'Patrón de sombreado tipo Isosceles. Uso general para representación CAD geométrica.'
    },
    en: {
      name: 'Isosceles',
      description: 'Hatch pattern type Isosceles. General use for geometric CAD representation.'
    },
    pt: {
      name: 'Isosceles',
      description: 'Padrão de hachura tipo Isosceles. Uso geral para representação CAD geométrica.'
    }
  }
};
