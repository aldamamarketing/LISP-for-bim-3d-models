// ===========================================================================
// TM DIGITAL - INTERFACE DE PAGINAÇÃO DE ACM (V2.2 - PRODUÇÃO)
// ===========================================================================

AcmMVP_Main : dialog {
    label = "TM Digital - Gerador de Fachada ACM";
    
    : row {
        : column {
            : boxed_column {
                label = "Dimensões da Fachada (Área Útil)";
                : edit_box { label = "Largura Total (mm):"; key = "f_largura"; edit_width = 10; }
                : edit_box { label = "Altura Total (mm):"; key = "f_altura"; edit_width = 10; }
            }
            : boxed_column {
                label = "Engenharia da Bandeja";
                : popup_list { label = "Instalação:"; key = "lst_modo"; list = "Bandeja Dobrada (Estrutural)\nChapa Colada (Com Remate)"; }
                : edit_box { label = "Largura Visual (mm):"; key = "b_largura"; edit_width = 10; }
                : edit_box { label = "Altura Visual (mm):"; key = "b_altura"; edit_width = 10; }
                : edit_box { label = "Aba / Remate (mm):"; key = "b_dobra"; edit_width = 10; }
                : edit_box { label = "Fuga/Junta (mm):"; key = "b_fuga"; edit_width = 10; }
                : edit_box { label = "Retorno Esquina (mm):"; key = "b_retorno"; edit_width = 10; }
            }
        }
        : column {
            : boxed_column {
                label = "Paginação e Alinhamento";
                : popup_list { label = "Horizontal:"; key = "lst_just_h"; list = "Esquerda\nCentro\nCentro Deslocado (Meia-Chapa)\nDireita"; }
                : popup_list { label = "Vertical:"; key = "lst_just_v"; list = "Base\nCentro\nCentro Deslocado (Meia-Chapa)\nTopo"; }
                : popup_list { label = "Sentido do Veio (Veta):"; key = "lst_veio"; list = "Vertical\nHorizontal"; }
            }
            : boxed_column {
                label = "Visualização";
                : button { label = ">> VISTA PRÉVIA (Grid 2D) <<"; key = "btn_preview"; }
            }
        }
    }

    : spacer { height = 1; }

    : row {
        alignment = centered;
        : button { label = " APLICAR "; key = "accept"; is_default = true; width = 12; }
        : button { label = " Cancelar "; key = "cancel"; is_cancel = true; width = 12; }
    }
}