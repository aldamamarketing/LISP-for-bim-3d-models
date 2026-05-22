if (typeof Acad !== 'undefined') {
    Acad.Application.addPalette("TMD BIM Inspector", "file:///Z:/Autocad%20Config/LISP/web/inspector.html?v=20260522.114719");
    Acad.Editor.writeMessage("\n[\U+2714] TMD WebPalette: Paleta 'TMD BIM Inspector' cargada.\n");
} else {
    console.error("[\U+274C] Error: API de JavaScript de AutoCAD (Acad) no detectada.");
}
