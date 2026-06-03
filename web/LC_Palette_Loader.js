if (typeof Acad !== 'undefined') {
    try { Acad.Application.removePalette('Command Palette'); } catch(e) {}
    Acad.Application.addPalette("Command Palette", "file:///C:/Users/TMPROJ~1/AppData/Local/Temp//LC_Palette.html?v=28288359");
    Acad.Editor.writeMessage("\n[\U+2714] LispCentral Palette pronta.\n");
} else {
    console.error("[\U+274C] API de JavaScript de AutoCAD não detectada.");
}
