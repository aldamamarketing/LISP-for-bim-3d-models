import React from 'react';

/**
 * Contenedor principal de la tarjeta de LispCentral.
 * Define los bordes, colores de fondo y padding estandarizados.
 * 
 * @param {boolean} noPadding - Si es true, elimina el padding interior (útil para listas/tablas)
 * @param {string} className - Clases adicionales de Tailwind
 */
export const Card = ({ children, className = '', noPadding = false }) => {
  return (
    <div className={`flex flex-col h-full bg-surface border border-outline-variant rounded-md overflow-hidden ${className}`}>
      <div className={`flex-1 overflow-hidden flex flex-col ${noPadding ? '' : 'p-5'}`}>
        {children}
      </div>
    </div>
  );
};

/**
 * Cabecera estándar para las tarjetas de LispCentral.
 * 
 * @param {string} title - El título de la tarjeta
 * @param {string} icon - Nombre del icono de Material Symbols (ej. 'account_tree')
 * @param {ReactNode} action - Contenido a renderizar a la derecha (ej. un botón)
 * @param {ReactNode} children - Contenido adicional debajo del título (ej. barra de búsqueda)
 */
export const CardHeader = ({ title, icon, action, children }) => {
  return (
    <div className="p-3 border-b border-outline-variant bg-surface-container-low flex flex-col gap-2 shrink-0">
      <div className="flex justify-between items-center">
        <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
};
