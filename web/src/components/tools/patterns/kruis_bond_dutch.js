export const arch_kruis_bond_dutch = {
  id: 'kruis_bond_dutch',
  name: 'Kruis bond (Dutch)',
  categories: ["Brick Bond","Paving"],
  controlsType: 'lines',
  iconUrl: '/patterns/kruis_bond_dutch.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 400,
    height: 600,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Kruis bond (Dutch)',
      description: 'Patrón de mampostería tipo Kruis bond (Dutch). Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Kruis bond (Dutch)',
      description: 'Masonry pattern type Kruis bond (Dutch). Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Kruis bond (Dutch)',
      description: 'Padrão de alvenaria tipo Kruis bond (Dutch). Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
