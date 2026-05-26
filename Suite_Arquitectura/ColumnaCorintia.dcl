ColumnaCorintia : dialog {
    label = "Generador de Columna Corintia 3D";
    
    : boxed_column {
        label = "Parámetros Generales";
        
        : edit_box {
            key = "alt_total";
            label = "Altura Total:";
            edit_width = 12;
        }
        
        : toggle {
            key = "tog_auto";
            label = "Usar proporciones clásicas automáticas";
            value = "1";
        }
    }
    
    : boxed_column {
        label = "Desglose de Secciones";
        
        : edit_box {
            key = "alt_base";
            label = "Altura Base (5%):";
            edit_width = 12;
            is_enabled = false;
        }
        
        : edit_box {
            key = "alt_fuste";
            label = "Altura Fuste (83%):";
            edit_width = 12;
            is_enabled = false;
        }
        
        : edit_box {
            key = "alt_capitel";
            label = "Altura Capitel (12%):";
            edit_width = 12;
            is_enabled = false;
        }
    }
    
    ok_cancel;
}