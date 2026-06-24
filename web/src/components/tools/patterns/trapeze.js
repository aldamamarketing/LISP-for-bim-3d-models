export const arch_trapeze = {
  id: 'trapeze',
  name: 'Trapeze',
  categories: ["Paving","Geometric","Roofing"],
  controlsType: 'lines',
  iconUrl: '/patterns/trapeze.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 600,
    height: 173,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Trapeze',
      description: 'Patrón de cubierta. Uso recomendado en planta de techos arquitectónicos.'
    },
    en: {
      name: 'Trapeze',
      description: 'Roofing pattern. Recommended for architectural roof plan views.'
    },
    pt: {
      name: 'Trapeze',
      description: 'Padrão de cobertura. Uso recomendado em plantas de telhados arquitetônicos.'
    }
  }
};
