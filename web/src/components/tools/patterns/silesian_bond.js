export const arch_silesian_bond = {
  id: 'silesian_bond',
  name: 'Silesian Bond',
  categories: ["Brick Bond"],
  controlsType: 'lines',
  iconUrl: '/patterns/silesian_bond.svg',
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
      name: 'Silesian Bond',
      description: 'Patrón de mampostería tipo Silesian Bond. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Silesian Bond',
      description: 'Masonry pattern type Silesian Bond. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Silesian Bond',
      description: 'Padrão de alvenaria tipo Silesian Bond. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
