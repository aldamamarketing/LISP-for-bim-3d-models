export const arch_common = {
  id: 'common',
  name: 'Common',
  categories: ["Brick Bond","Paving","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/common.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 300,
    height: 400,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Common',
      description: 'Patrón de mampostería tipo Common. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Common',
      description: 'Masonry pattern type Common. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Common',
      description: 'Padrão de alvenaria tipo Common. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
