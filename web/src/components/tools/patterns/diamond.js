export const arch_diamond = {
  id: 'diamond',
  name: 'Diamond',
  categories: ["Geometric","Paving","Roofing"],
  controlsType: 'lines',
  iconUrl: '/patterns/diamond.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 600,
    height: 100,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Diamond',
      description: 'Patrón de cubierta. Uso recomendado en planta de techos arquitectónicos.'
    },
    en: {
      name: 'Diamond',
      description: 'Roofing pattern. Recommended for architectural roof plan views.'
    },
    pt: {
      name: 'Diamond',
      description: 'Padrão de cobertura. Uso recomendado em plantas de telhados arquitetônicos.'
    }
  }
};
