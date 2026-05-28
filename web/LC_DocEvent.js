if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lc_context_changed'));
    console.log('[LC Event Hub] Cambio de documento activo notificado a las paletas.');
}
