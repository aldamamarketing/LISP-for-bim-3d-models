const a = `(strcat "\\"" loader-js "\\"")`;
const b = `(write-line (strcat "    Acad.Application.addPalette(\\\"Command Palette\\\", \\\"" *LC-PALETTE-URL* "\\\");") f-js)`;
console.log("A:", a);
console.log("B:", b);
