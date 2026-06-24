export const arch_monk_bond = {
  id: 'monk_bond',
  name: 'Monk Bond',
  categories: ["Brick Bond"],
  controlsType: 'lines',
  iconUrl: '/patterns/monk_bond.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 5000,
    height: 1000,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Monk Bond',
      description: 'Patrón de mampostería tipo Monk Bond. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Monk Bond',
      description: 'Masonry pattern type Monk Bond. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Monk Bond',
      description: 'Padrão de alvenaria tipo Monk Bond. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
