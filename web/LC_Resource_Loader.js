if (typeof Acad !== 'undefined') {
    try { Acad.Application.removePalette('LispCentral Recursos'); } catch(e) {}
    Acad.Application.addPalette("LispCentral Recursos", "Z:/Autocad Config/LISP/web/LC_Resource_Wrapper.html");
    Acad.Editor.writeMessage("\n[\U+2714] Resource Palette pronta.\n");
} else {
    console.error("[\U+274C] API de JavaScript não detectada.");
}
