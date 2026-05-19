ColumnaACM_Main : dialog {
    label = "Gerador de Coluna ACM - TM Digital";
    width = 60; 
    
    : boxed_column {
        label = "Configuração Global";
        : popup_list { key = "estilo"; label = "Estilo:"; list = "Coríntio\nDórico\nJônico\nModerno ACM\nSalomônico"; }
        : edit_box { key = "alt_total"; label = "Altura Total (mm):"; edit_width = 15; }
        : edit_box { key = "ancho_base"; label = "Largura da Base (mm):"; edit_width = 15; }
    }
    
    : boxed_column {
        label = "Status das Proporções (Sugestão)";
        : text { key = "txt_base"; width = 55; }
        : text { key = "txt_capitel"; width = 55; }
        : text { key = "txt_fuste"; width = 55; }
    }
    
    : boxed_row {
        label = "Módulos e Arremates";
        : button { key = "btn_base"; label = "Configurar Base..."; }
        : button { key = "btn_fuste"; label = "Configurar Fuste..."; }
        : button { key = "btn_capitel"; label = "Configurar Capitel..."; }
    }
    
    : row {
        alignment = centered;
        : button { key = "accept"; label = "OK"; is_default = true; width = 12; }
        : button { key = "cancel"; label = "Cancelar"; is_cancel = true; width = 12; }
    }
}

SubBase : dialog {
    label = "Detalhes e Moldura da Base"; width = 60;
    : popup_list { key = "forma_base"; label = "Geometria:"; list = "Cilíndrica\nQuadrada\nOctogonal"; }
    : edit_box { key = "alt_base"; label = "Altura específica (mm):"; edit_width = 10; }
    : boxed_column { label = "Moldura de Arremate";
        : toggle { key = "mol_base_on"; label = "Ativar moldura perimetral"; }
        : row { : button { key = "sel_mol_base"; label = "Selecionar Polilinha..."; } : text { key = "txt_mol_base"; label = "(Nenhuma)"; } }
        : popup_list { key = "mol_base_borde"; label = "Posição Z:"; list = "Borda Inferior\nBorda Superior"; }
        : popup_list { key = "mol_base_ali"; label = "Alinhamento Y:"; list = "Apoiado (Fundo)\nCentrado\nColgado (Topo)"; }
        : popup_list { key = "mol_base_dir"; label = "Direção X:"; list = "Para Fora\nPara Dentro"; }
    } 
    : row {
        alignment = centered;
        : button { key = "accept"; label = "OK"; is_default = true; width = 12; }
        : button { key = "cancel"; label = "Cancelar"; is_cancel = true; width = 12; }
    }
}

SubFuste : dialog {
    label = "Detalhes do Fuste"; width = 60;
    : popup_list { key = "forma_fuste"; label = "Geometria:"; list = "Cilíndrica\nQuadrada\nOctogonal"; }
    : edit_box { key = "remetimiento"; label = "Remetimento (- mm):"; edit_width = 10; }
    : boxed_column { label = "Moldura de Arremate";
        : toggle { key = "mol_fuste_on"; label = "Ativar moldura perimetral"; }
        : row { : button { key = "sel_mol_fuste"; label = "Selecionar Polilinha..."; } : text { key = "txt_mol_fuste"; label = "(Nenhuma)"; } }
        : popup_list { key = "mol_fuste_borde"; label = "Posição Z:"; list = "Borda Inferior\nBorda Superior"; }
        : popup_list { key = "mol_fuste_ali"; label = "Alinhamento Y:"; list = "Apoiado (Fundo)\nCentrado\nColgado (Topo)"; }
        : popup_list { key = "mol_fuste_dir"; label = "Direção X:"; list = "Para Fora\nPara Dentro"; }
    } 
    : row {
        alignment = centered;
        : button { key = "accept"; label = "OK"; is_default = true; width = 12; }
        : button { key = "cancel"; label = "Cancelar"; is_cancel = true; width = 12; }
    }
}

SubCapitel : dialog {
    label = "Detalhes do Capitel"; width = 60;
    : popup_list { key = "forma_capitel"; label = "Geometria:"; list = "Cilíndrica\nQuadrada\nOctogonal"; }
    : edit_box { key = "alt_capitel"; label = "Altura (mm):"; edit_width = 10; }
    : edit_box { key = "vuelo"; label = "Vuelo (+ mm):"; edit_width = 10; }
    : boxed_column { label = "Moldura de Arremate";
        : toggle { key = "mol_capitel_on"; label = "Ativar moldura perimetral"; }
        : row { : button { key = "sel_mol_capitel"; label = "Selecionar Polilinha..."; } : text { key = "txt_mol_capitel"; label = "(Nenhuma)"; } }
        : popup_list { key = "mol_capitel_borde"; label = "Posição Z:"; list = "Borda Inferior\nBorda Superior"; }
        : popup_list { key = "mol_capitel_ali"; label = "Alinhamento Y:"; list = "Apoiado (Fundo)\nCentrado\nColgado (Topo)"; }
        : popup_list { key = "mol_capitel_dir"; label = "Direção X:"; list = "Para Fora\nPara Dentro"; }
    } 
    : row {
        alignment = centered;
        : button { key = "accept"; label = "OK"; is_default = true; width = 12; }
        : button { key = "cancel"; label = "Cancelar"; is_cancel = true; width = 12; }
    }
}