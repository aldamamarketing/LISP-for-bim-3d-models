export const arch_fishscale = {
  id: 'fishscale',
  name: 'Fishscale',
  categories: ["Organic","Roofing"],
  controlsType: 'lines',
  iconUrl: '/patterns/fishscale.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 1000,
    height: 1000,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Fishscale',
      description: 'Patrón de cubierta. Uso recomendado en planta de techos arquitectónicos.'
    },
    en: {
      name: 'Fishscale',
      description: 'Roofing pattern. Recommended for architectural roof plan views.'
    },
    pt: {
      name: 'Fishscale',
      description: 'Padrão de cobertura. Uso recomendado em plantas de telhados arquitetônicos.'
    }
  }
};
