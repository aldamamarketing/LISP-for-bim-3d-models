export const arch_english_bond = {
  id: 'english_bond',
  name: 'English Bond',
  categories: ["Brick Bond"],
  controlsType: 'lines',
  iconUrl: '/patterns/english_bond.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 2000,
    height: 1000,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'English Bond',
      description: 'Patrón de mampostería tipo English Bond. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'English Bond',
      description: 'Masonry pattern type English Bond. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'English Bond',
      description: 'Padrão de alvenaria tipo English Bond. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
