export const arch_hexagonal = {
  id: 'hexagonal',
  name: 'Hexagonal',
  categories: ["Roofing","Geometric","Paving"],
  controlsType: 'lines',
  iconUrl: '/patterns/hexagonal.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 346,
    height: 600,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Hexagonal',
      description: 'Patrón de cubierta. Uso recomendado en planta de techos arquitectónicos.'
    },
    en: {
      name: 'Hexagonal',
      description: 'Roofing pattern. Recommended for architectural roof plan views.'
    },
    pt: {
      name: 'Hexagonal',
      description: 'Padrão de cobertura. Uso recomendado em plantas de telhados arquitetônicos.'
    }
  }
};
