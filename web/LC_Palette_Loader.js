if (typeof Acad !== 'undefined') {
    Acad.Application.addPalette("Command Palette", "file:///Z:/Autocad%20Config/LISP/web/inspector_unified.html?token=lc_key_S5ggQl1Gk4f3&hwid=DESKTOP-UAMQ784@TM PROJETOS");
    Acad.Editor.writeMessage("\n[\U+2714] LispCentral Palette carregada com sucesso.\n");
} else {
    console.error("[\U+274C] Error: API de JavaScript de AutoCAD no detectada.");
}
