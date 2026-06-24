export const arch_random_bond = {
  id: 'random_bond',
  name: 'Random Bond',
  categories: ["Brick Bond"],
  controlsType: 'lines',
  iconUrl: '/patterns/random_bond.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 2000,
    height: 2000,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Random Bond',
      description: 'Patrón de mampostería tipo Random Bond. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Random Bond',
      description: 'Masonry pattern type Random Bond. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Random Bond',
      description: 'Padrão de alvenaria tipo Random Bond. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
