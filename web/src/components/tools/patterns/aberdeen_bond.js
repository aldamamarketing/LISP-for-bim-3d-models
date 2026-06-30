export const arch_aberdeen_bond = {
  id: 'aberdeen_bond',
  name: 'Aberdeen Bond',
  categories: ["Brick Bond","Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/aberdeen_bond.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 550,
    height: 500,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Aberdeen Bond',
      description: 'Patrón de mampostería tipo Aberdeen Bond. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Aberdeen Bond',
      description: 'Masonry pattern type Aberdeen Bond. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Aberdeen Bond',
      description: 'Padrão de alvenaria tipo Aberdeen Bond. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
