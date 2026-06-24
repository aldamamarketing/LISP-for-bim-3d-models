export const arch_triple_stretcher = {
  id: 'triple_stretcher',
  name: 'Triple Stretcher',
  categories: ["Paving","Brick Bond","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/triple_stretcher.svg',
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
      name: 'Triple Stretcher',
      description: 'Patrón de mampostería tipo Triple Stretcher. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Triple Stretcher',
      description: 'Masonry pattern type Triple Stretcher. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Triple Stretcher',
      description: 'Padrão de alvenaria tipo Triple Stretcher. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
