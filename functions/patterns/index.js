// Generado automáticamente - Secretos del Hatch Engine

const PATTERN_GENERATORS = {
  "line": s => {
  return `*Line_${s}, Líneas Paralelas\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${s}\n`;
},
  "net": s => {
  return `*Net_${s}, Rejilla Ortogonal\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${s}\n` + `90, 0,0, 0,${s}\n`;
},
  "weave": (s, t, j) => {
  const step = 2 * (t + s);
  const dash = t + 2 * s;
  return `*Weave_${t}x${s}, Cinta Entrelazada (Weave)\n` + `; Generado por LispCentral Hatch Builder\n` + `90, 0,-${s}, 0,${step}, ${dash},-${t}\n` + `90, ${t},-${s}, 0,${step}, ${dash},-${t}\n` + `0, ${t},0, 0,${step}, ${dash},-${t}\n` + `0, ${t},${t}, 0,${step}, ${dash},-${t}\n` + `0, -${s},${t + s}, 0,${step}, ${dash},-${t}\n` + `0, -${s},${2 * t + s}, 0,${step}, ${dash},-${t}\n` + `90, ${t + s},${t}, 0,${step}, ${dash},-${t}\n` + `90, ${2 * t + s},${t}, 0,${step}, ${dash},-${t}\n`;
},
  "chevron": (w, h) => {
  const tw = w;
  const th = h;
  const angleRad = Math.atan2(th, tw);
  const angle = angleRad * (180 / Math.PI);
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const dX = th * sinA;
  const dY = th * cosA;
  const dash = w / cosA;
  const space = -(2 * tw - w) / cosA;
  const yPeak = h;
  return `*Chevron_${w}x${h}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `${angle}, 0,0, ${dX},${dY}, ${dash},${space}\n` + `-${angle}, ${tw},${yPeak}, ${-dX},${dY}, ${dash},${space}\n` + `90, 0,0, 0,${tw}\n` + `90, ${w},0, 0,${tw}\n`;
},
  "common": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const halfTw = tw / 2;
  const totalH = th * 6;
  let pat = `*Common_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  for (let i = 0; i < 5; i++) {
    let offsetX = i % 2 !== 0 ? halfTw : 0;
    pat += `90, ${offsetX},${i * th}, 0,${tw}, ${h},-${totalH - h}\n`;
  }
  pat += `90, 0,${5 * th}, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${halfTw / 2},${5 * th}, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${halfTw},${5 * th}, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${halfTw + halfTw / 2},${5 * th}, 0,${tw}, ${h},-${totalH - h}\n`;
  return pat;
},
  "cubic": (s, unused, j) => {
  const ts = s + j;
  return `*Cubic_${s}x${s}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${ts}\n` + `90, 0,0, 0,${ts}\n`;
},
  "cubic3d": (s, unused, j) => {
  const w = s * Math.sqrt(3);
  const h = s * 3;
  const offset = s * Math.sqrt(3) / 2;
  const vStroke = s - j;
  const vSpace = -(2 * s + j);
  const dStroke = s - j;
  const dSpace = -(2 * s + j);
  return `*Cubic3D_${s}_J${j}, LispCentral 3D Cubic Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `90, 0,0, ${offset},${s * 1.5}, ${vStroke},${vSpace}\n` + `90, ${offset},${s * 0.5}, ${offset},${s * 1.5}, ${vStroke},${vSpace}\n` + `30, 0,0, 0,${s * 1.5}, ${dStroke},${dSpace}\n` + `30, 0,${s}, 0,${s * 1.5}, ${dStroke},${dSpace}\n` + `150, 0,0, 0,${s * 1.5}, ${dStroke},${dSpace}\n` + `150, 0,${s}, 0,${s * 1.5}, ${dStroke},${dSpace}\n`;
},
  "flemish": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const hw = w / 2 + j;
  const stepX = tw + hw;
  return `*Flemish_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n` + `90, 0,0, 0,${th * 2}, ${h},-${th * 2 - h}\n` + `90, ${tw},0, 0,${th * 2}, ${h},-${th * 2 - h}\n` + `90, ${stepX / 2},${th}, 0,${th * 2}, ${h},-${th * 2 - h}\n` + `90, ${stepX / 2 + tw},${th}, 0,${th * 2}, ${h},-${th * 2 - h}\n`;
},
  "herringbone": (w, h, j) => {
  const blockW = w + j;
  const blockH = h + j;
  const stepX = (blockW + blockH) / Math.sqrt(2);
  const stepY = stepX;
  return `*Herringbone_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `45, 0,0, ${stepX},${stepY}, ${w},-${blockH}\n` + `135, 0,0, ${stepX},${stepY}, ${w},-${blockH}\n` + `45, 0,${h + j}, ${stepX},${stepY}, ${w},-${blockH}\n` + `135, ${w + j},0, ${stepX},${stepY}, ${w},-${blockH}\n`;
},
  "stack": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  return `*Stack_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n` + `90, 0,0, 0,${tw}\n`;
},
  "stretcher": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const halfTw = tw / 2;
  return `*Stretcher_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n` + `90, 0,0, ${th},${halfTw}, ${h},-${th}\n`;
},
  "english_bond": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const halfTw = tw / 2;
  const totalH = th * 2;
  let pat = `*EnglishBond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  pat += `90, 0,0, 0,${tw}, ${h},-${totalH - h}\n`;
  const qTw = tw / 4;
  pat += `90, ${qTw},${th}, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${qTw + halfTw},${th}, 0,${tw}, ${h},-${totalH - h}\n`;
  return pat;
},
  "13_running_bond": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const shift = tw / 3;
  const totalH = th * 3;
  let pat = `*13_Running_Bond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  pat += `90, 0,0, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift},${th}, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift * 2},${th * 2}, 0,${tw}, ${h},-${totalH - h}\n`;
  return pat;
},
  "14_running_bond": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const shift = tw / 4;
  const totalH = th * 4;
  let pat = `*14_Running_Bond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  pat += `90, 0,0, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift},${th}, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift * 2},${th * 2}, 0,${tw}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift * 3},${th * 3}, 0,${tw}, ${h},-${totalH - h}\n`;
  return pat;
},
  "double_stretcher": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const halfTw = tw / 2;
  const totalH = th * 4;
  let pat = `*DoubleStretcher_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  pat += `90, 0,0, 0,${totalH}, ${h * 2 + j},-${totalH - (h * 2 + j)}\n`;
  pat += `90, ${halfTw},${th * 2}, 0,${totalH}, ${h * 2 + j},-${totalH - (h * 2 + j)}\n`;
  return pat;
},
  "triple_stretcher": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const halfTw = tw / 2;
  const totalH = th * 6;
  let pat = `*TripleStretcher_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  pat += `90, 0,0, 0,${totalH}, ${h * 3 + 2 * j},-${totalH - (h * 3 + 2 * j)}\n`;
  pat += `90, ${halfTw},${th * 3}, 0,${totalH}, ${h * 3 + 2 * j},-${totalH - (h * 3 + 2 * j)}\n`;
  return pat;
},
  "monk_bond": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const totalW = tw * 2.5;
  const totalH = th * 2;
  let pat = `*MonkBond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  pat += `90, 0,0, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${tw},0, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${tw * 2},0, 0,${totalW}, ${h},-${totalH - h}\n`;
  const shift = totalW / 2;
  pat += `90, ${shift},${th}, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift + tw},${th}, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift + tw * 2},${th}, 0,${totalW}, ${h},-${totalH - h}\n`;
  return pat;
},
  "silesian_bond": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const totalW = tw * 3.5;
  const totalH = th * 2;
  let pat = `*SilesianBond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}\n`;
  pat += `90, 0,0, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${tw},0, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${tw * 2},0, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${tw * 3},0, 0,${totalW}, ${h},-${totalH - h}\n`;
  const shift = totalW / 2;
  pat += `90, ${shift},${th}, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift + tw},${th}, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift + tw * 2},${th}, 0,${totalW}, ${h},-${totalH - h}\n`;
  pat += `90, ${shift + tw * 3},${th}, 0,${totalW}, ${h},-${totalH - h}\n`;
  return pat;
},
  "basketweave": (s, unused, j) => {
  const ts = s + j;
  const th = ts * 2;
  return `*Basketweave_${s}x${s}_J${j}, LispCentral Basketweave Hatch\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${ts * 2}\n` + `0, 0,${ts}, 0,${ts * 2}\n` + `90, 0,0, 0,${ts * 2}\n` + `90, ${ts},0, 0,${ts * 2}\n` + `90, ${ts / 2},0, 0,${ts * 2}, ${s},-${ts + j}\n` + `90, ${ts * 1.5},${ts}, 0,${ts * 2}, ${s},-${ts + j}\n` + `0, ${ts},${ts / 2}, 0,${ts * 2}, ${s},-${ts + j}\n` + `0, 0,${ts * 1.5}, 0,${ts * 2}, ${s},-${ts + j}\n`;
},
  "hexagonal": (s, unused, j) => {
  const H = s * Math.sqrt(3);
  return `*Hexagonal_${s}_J${j}, Panal de abejas geométrico\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, ${1.5 * s},${H / 2}, ${s},${-2 * s}\n` + `60, ${s},0, ${1.5 * s},${H / 2}, ${s},${-2 * s}\n` + `120, 0,0, ${1.5 * s},${H / 2}, ${s},${-2 * s}\n`;
},
  "octagon_square": (s, unused, j) => {
  const a = s / Math.SQRT2;
  const W = s + 2 * a;
  return `*OctagonSquare_${s}_J${j}, Mosaico Victoriano\n` + `; Generado por LispCentral Hatch Builder\n` + `0, ${a},0, 0,${W}, ${s},${-(W - s)}\n` + `90, 0,${a}, 0,${W}, ${s},${-(W - s)}\n` + `45, ${a + s},0, 0,${W}, ${s},${-W}\n` + `135, ${a},0, 0,${W}, ${s},${-W}\n`;
},
  "double_flemish": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const totalW = 2.5 * tw;
  const shift = 0.75 * tw;
  return `*DoubleFlemish_${w}x${h}_J${j}, Aparejo Flamenco Doble\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${tw},0, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${2 * tw},0, 0,${th}, ${w / 2},${j + totalW - w / 2}\n` + `90, 0,0, ${th},0, ${h},${j}\n` + `90, ${tw},0, ${th},0, ${h},${j}\n` + `90, ${2 * tw},0, ${th},0, ${h},${j}\n` + `90, ${2.5 * tw},0, ${th},0, ${h},${j}\n` + `0, ${shift},${th / 2}, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${shift + tw},${th / 2}, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${shift + 2 * tw},${th / 2}, 0,${th}, ${w / 2},${j + totalW - w / 2}\n` + `90, ${shift},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + tw},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + 2 * tw},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + 2.5 * tw},${th / 2}, ${th},0, ${h},${j}\n`;
},
  "triple_flemish": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const totalW = 3.5 * tw;
  const shift = 1.25 * tw;
  return `*TripleFlemish_${w}x${h}_J${j}, Aparejo Flamenco Triple\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${tw},0, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${2 * tw},0, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${3 * tw},0, 0,${th}, ${w / 2},${j + totalW - w / 2}\n` + `90, 0,0, ${th},0, ${h},${j}\n` + `90, ${tw},0, ${th},0, ${h},${j}\n` + `90, ${2 * tw},0, ${th},0, ${h},${j}\n` + `90, ${3 * tw},0, ${th},0, ${h},${j}\n` + `90, ${3.5 * tw},0, ${th},0, ${h},${j}\n` + `0, ${shift},${th / 2}, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${shift + tw},${th / 2}, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${shift + 2 * tw},${th / 2}, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${shift + 3 * tw},${th / 2}, 0,${th}, ${w / 2},${j + totalW - w / 2}\n` + `90, ${shift},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + tw},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + 2 * tw},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + 3 * tw},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + 3.5 * tw},${th / 2}, ${th},0, ${h},${j}\n`;
},
  "gothic_bond": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const totalW = 1.5 * tw;
  const shift = 0.25 * tw;
  return `*GothicBond_${w}x${h}_J${j}, Aparejo Gótico\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${tw},0, 0,${th}, ${w / 2},${j + totalW - w / 2}\n` + `90, 0,0, ${th},0, ${h},${j}\n` + `90, ${tw},0, ${th},0, ${h},${j}\n` + `90, ${1.5 * tw},0, ${th},0, ${h},${j}\n` + `0, ${shift},${th / 2}, 0,${th}, ${w},${j + totalW - w}\n` + `0, ${shift + tw},${th / 2}, 0,${th}, ${w / 2},${j + totalW - w / 2}\n` + `90, ${shift},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + tw},${th / 2}, ${th},0, ${h},${j}\n` + `90, ${shift + 1.5 * tw},${th / 2}, ${th},0, ${h},${j}\n`;
},
  "english_cross_bond": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const totalW = tw;
  const totalH = 4 * th;
  return `*EnglishCrossBond_${w}x${h}_J${j}, Aparejo Cruzado Inglés\n` + `; Generado por LispCentral Hatch Builder\n` + `; Fila 1: Sogas\n` + `0, 0,0, 0,${totalH}, ${w},${j}\n` + `90, 0,0, ${totalH},0, ${h},${j}\n` + `90, ${tw},0, ${totalH},0, ${h},${j}\n` + `; Fila 2: Tizones\n` + `0, 0,${th}, 0,${totalH}, ${w / 2},${j + w / 2 + j}\n` + `0, ${0.5 * tw},${th}, 0,${totalH}, ${w / 2},${j + w / 2 + j}\n` + `90, 0,${th}, ${totalH},0, ${h},${j}\n` + `90, ${0.5 * tw},${th}, ${totalH},0, ${h},${j}\n` + `; Fila 3: Sogas desplazadas\n` + `0, ${0.5 * tw},${2 * th}, 0,${totalH}, ${w},${j}\n` + `90, ${0.5 * tw},${2 * th}, ${totalH},0, ${h},${j}\n` + `90, ${1.5 * tw},${2 * th}, ${totalH},0, ${h},${j}\n` + `; Fila 4: Tizones\n` + `0, 0,${3 * th}, 0,${totalH}, ${w / 2},${j + w / 2 + j}\n` + `0, ${0.5 * tw},${3 * th}, 0,${totalH}, ${w / 2},${j + w / 2 + j}\n` + `90, 0,${3 * th}, ${totalH},0, ${h},${j}\n` + `90, ${0.5 * tw},${3 * th}, ${totalH},0, ${h},${j}\n`;
},
  "double_herringbone": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const step = (tw * 2 + th) / Math.SQRT2;
  return `*DoubleHerringbone_${w}x${h}_J${j}, Doble Espiga\n` + `; Generado por LispCentral Hatch Builder\n` + `45, 0,0, 0,${step}, ${w},${-(w + 2 * th)}\n` + `45, ${th / Math.SQRT2},${-th / Math.SQRT2}, 0,${step}, ${w},${-(w + 2 * th)}\n` + `135, ${th / Math.SQRT2},${th / Math.SQRT2}, 0,${step}, ${w},${-(w + 2 * th)}\n` + `135, 0,${th * Math.SQRT2}, 0,${step}, ${w},${-(w + 2 * th)}\n` + `135, ${tw / Math.SQRT2},${tw / Math.SQRT2}, 0,${step}, ${h},${-(w + 2 * th - h)}\n` + `135, ${(tw + th) / Math.SQRT2},${(tw - th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 2 * th - h)}\n` + `45, ${-(tw - th) / Math.SQRT2},${(tw + th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 2 * th - h)}\n` + `45, ${-tw / Math.SQRT2},${(tw + 2 * th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 2 * th - h)}\n`;
},
  "triple_herringbone": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const step = (tw * 2 + 2 * th) / Math.SQRT2;
  return `*TripleHerringbone_${w}x${h}_J${j}, Triple Espiga\n` + `; Generado por LispCentral Hatch Builder\n` + `45, 0,0, 0,${step}, ${w},${-(w + 3 * th)}\n` + `45, ${th / Math.SQRT2},${-th / Math.SQRT2}, 0,${step}, ${w},${-(w + 3 * th)}\n` + `45, ${2 * th / Math.SQRT2},${-2 * th / Math.SQRT2}, 0,${step}, ${w},${-(w + 3 * th)}\n` + `135, ${2 * th / Math.SQRT2},${2 * th / Math.SQRT2}, 0,${step}, ${w},${-(w + 3 * th)}\n` + `135, ${th / Math.SQRT2},${3 * th / Math.SQRT2}, 0,${step}, ${w},${-(w + 3 * th)}\n` + `135, 0,${4 * th / Math.SQRT2}, 0,${step}, ${w},${-(w + 3 * th)}\n` + `135, ${tw / Math.SQRT2},${tw / Math.SQRT2}, 0,${step}, ${h},${-(w + 3 * th - h)}\n` + `135, ${(tw + th) / Math.SQRT2},${(tw - th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 3 * th - h)}\n` + `135, ${(tw + 2 * th) / Math.SQRT2},${(tw - 2 * th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 3 * th - h)}\n` + `45, ${-(tw - 2 * th) / Math.SQRT2},${(tw + 2 * th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 3 * th - h)}\n` + `45, ${-(tw - th) / Math.SQRT2},${(tw + 3 * th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 3 * th - h)}\n` + `45, ${-tw / Math.SQRT2},${(tw + 4 * th) / Math.SQRT2}, 0,${step}, ${h},${-(w + 3 * th - h)}\n`;
},
  "diamond": s => {
  return `*Diamond_${s}, Rombo a 45 grados\n` + `; Generado por LispCentral Hatch Builder\n` + `45, 0,0, 0,${s}\n` + `135, 0,0, 0,${s}\n`;
},
  "triangle": s => {
  const h = s * Math.sqrt(3) / 2;
  return `*Triangle_${s}, Triangulos equiláteros\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${h}\n` + `60, 0,0, 0,${h}\n` + `120, 0,0, 0,${h}\n`;
},
  "windmill": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const W = tw + th;
  return `*Windmill_${w}x${h}_J${j}, Molino de Viento\n` + `; Generado por LispCentral Hatch Builder\n` + `; Horizontales largas\n` + `0, 0,0, 0,${W}, ${w},${-(W - w)}\n` + `0, ${tw},${th}, 0,${W}, ${w},${-(W - w)}\n` + `; Horizontales cortas\n` + `0, 0,${h}, 0,${W}, ${w},${-(W - w)}\n` + `0, ${tw},${th + h}, 0,${W}, ${w},${-(W - w)}\n` + `; Verticales largas\n` + `90, ${tw},0, 0,${W}, ${w},${-(W - w)}\n` + `90, ${tw + th},${tw}, 0,${W}, ${w},${-(W - w)}\n` + `; Verticales cortas\n` + `90, ${tw - h},0, 0,${W}, ${w},${-(W - w)}\n` + `90, ${tw + th - h},${tw}, 0,${W}, ${w},${-(W - w)}\n`;
},
  "hopscotch": (w, h, j) => {
  const tw = w + j;
  const th = h + j;
  const W = tw + th;
  return `*Hopscotch_${w}x${h}_J${j}, Rayuela\n` + `; Generado por LispCentral Hatch Builder\n` + `0, 0,0, 0,${W}, ${w},${-th}\n` + `0, 0,${w}, 0,${W}, ${w},${-th}\n` + `0, ${tw},${tw}, 0,${W}, ${h},${-tw}\n` + `0, ${tw},${tw + h}, 0,${W}, ${h},${-tw}\n` + `90, 0,0, 0,${W}, ${w},${-th}\n` + `90, ${w},0, 0,${W}, ${w},${-th}\n` + `90, ${tw},${tw}, 0,${W}, ${h},${-tw}\n` + `90, ${tw + h},${tw}, 0,${W}, ${h},${-tw}\n`;
},
};

exports.generatePatternString = function(archetypeId, params) {
  const generator = PATTERN_GENERATORS[archetypeId];
  if (!generator) throw new Error("Archetype not found: " + archetypeId);
  // Los arquetipos reciben los params en orden de `controls` (w, h, j) o como los esperen.
  // Para simplificar, aquí inyectaremos los params según las propiedades.
  // En realidad, HatchEngine frontend los pasaba por orden de args. Necesitamos que el frontend envíe un array ordenado, o aplicar lógica aquí.
  return generator(...params);
};
