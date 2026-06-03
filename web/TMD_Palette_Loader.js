if (typeof Acad !== 'undefined') {
    try { Acad.Application.removePalette('TMD BIM Inspector'); } catch(e) {}
    Acad.Application.addPalette("TMD BIM Inspector", "https://lispcentral.web.app/palette/inspector.html?v=20260603.145412");
    Acad.Editor.writeMessage("\n[\U+2714] TMD WebPalette: Paleta 'TMD BIM Inspector' cargada.\n");
} else {
    console.error("[\U+274C] Error: API de JavaScript de AutoCAD (Acad) no detectada.");
}
