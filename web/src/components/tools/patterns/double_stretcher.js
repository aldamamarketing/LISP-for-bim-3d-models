export const arch_double_stretcher = {
  id: 'double_stretcher',
  name: 'Double Stretcher',
  categories: ["Brick Bond","Geometric"],
  controlsType: 'lines',
  iconUrl: '/patterns/double_stretcher.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 400,
    height: 400,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Double Stretcher',
      description: 'Patrón de mampostería tipo Double Stretcher. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Double Stretcher',
      description: 'Masonry pattern type Double Stretcher. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Double Stretcher',
      description: 'Padrão de alvenaria tipo Double Stretcher. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  }
};
