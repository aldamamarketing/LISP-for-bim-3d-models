export const arch_stack = {
  id: 'stack',
  name: 'Stack',
  categories: ["Brick Bond","Paving","Geometric","Roofing"],
  controlsType: 'lines',
  iconUrl: '/patterns/stack.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 200,
    height: 200,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Stack',
      description: 'Patrón de mampostería tipo Stack. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Stack',
      description: 'Masonry pattern type Stack. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Stack',
      description: 'Padrão de alvenaria tipo Stack. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
