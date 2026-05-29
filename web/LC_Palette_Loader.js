if (typeof Acad !== 'undefined') {
    try { Acad.Application.removePalette('Command Palette'); } catch(e) {}
    Acad.Application.addPalette("Command Palette", "file:///Z:/Autocad%20Config/LISP/web/inspector_unified.html?token={{SEAT_TOKEN}}&hwid=DESKTOP-UAMQ784@TM PROJETOS");
    Acad.Editor.writeMessage("\n[\U+2714] LispCentral Palette pronta.\n");
} else {
    console.error("[\U+274C] API de JavaScript de AutoCAD não detectada.");
}
