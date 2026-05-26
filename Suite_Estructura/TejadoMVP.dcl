TejadoMVP_Main : dialog {
    label = "Gerador de Telhados MVP - TM Digital (V4.0)";
    width = 62;
    
    : boxed_column {
        label = "Dimensões da Água (Esticar/Encolher)";
        : row {
            : edit_box { key = "dim_x"; label = "Largura Total (X) mm:"; edit_width = 10; }
            : edit_box { key = "dim_y"; label = "Profundidade (Y) mm:"; edit_width = 10; }
        }
    }

    : boxed_column {
        label = "Aleros (Beirais Independentes)";
        : row {
            : edit_box { key = "a_esq"; label = "Esquerdo (-X):"; value = "0"; edit_width = 8; }
            : edit_box { key = "a_dir"; label = "Direito (+X):"; value = "0"; edit_width = 8; }
        }
        : row {
            : edit_box { key = "a_inf"; label = "Frente (-Y):"; value = "0"; edit_width = 8; }
            : edit_box { key = "a_sup"; label = "Cumeira (+Y):"; value = "0"; edit_width = 8; }
        }
        : popup_list { key = "ref_z"; label = "Plano Z:"; 
                       list = "Pelo Topo (Face da Telha)\nPela Base do Tablado\nPelo Fundo do Caibro"; }
    }

    : boxed_column {
        label = "Estrutura e Fechamento";
        : row {
            : edit_box { key = "v_largura"; label = "Caibro L:"; value = "50"; edit_width = 6; }
            : edit_box { key = "v_altura"; label = "Caibro A:"; value = "150"; edit_width = 6; }
            : edit_box { key = "v_espaco"; label = "Espaço:"; value = "600"; edit_width = 6; }
        }
        : row {
            : edit_box { key = "e_espessura"; label = "OSB (mm):"; value = "15"; edit_width = 6; }
            : edit_box { key = "t_espessura"; label = "Telha (mm):"; value = "50"; edit_width = 6; }
        }
        : toggle { key = "corte_prumo"; label = "Corte do Beiral a Prumo (Vertical)"; value = "1"; }
    }
    
    : boxed_row {
        : toggle { key = "duas_aguas"; label = "Gerar 2ª Água (Espelhar na Cumeira)"; value = "0"; }
    }

    : row {
        alignment = centered;
        : button { key = "accept"; label = "Desenhar / Atualizar"; is_default = true; width = 20; }
        : button { key = "cancel"; label = "Cancelar"; is_cancel = true; width = 15; }
    }
}