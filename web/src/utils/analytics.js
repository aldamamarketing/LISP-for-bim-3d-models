/**
 * Módulo centralizado de Analytics para LispCentral.
 * Usa Firebase Analytics (GA4) bajo el capó.
 * Todas las funciones fallan silenciosamente si analytics no está disponible.
 */
import { logEvent, setUserProperties } from "firebase/analytics";
import { getFirebaseAnalytics } from "../firebase";

/**
 * Dispara un evento GA4 personalizado.
 * Seguro para SSR — nunca lanza errores.
 */
export const trackEvent = async (eventName, params = {}) => {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, {
        ...params,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.debug("[LC Analytics]", error.message);
  }
};

/**
 * Configura propiedades persistentes del usuario (plan, tenant, rol).
 */
export const setUserProps = async (props) => {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      setUserProperties(analytics, props);
    }
  } catch (error) {
    console.debug("[LC Analytics]", error.message);
  }
};

// --- Eventos pre-definidos ---

// Landing page CTAs
export const trackCtaClick = (ctaName, location = "landing") =>
  trackEvent("cta_click", { cta_name: ctaName, location });

// Scroll hasta sección visible (IntersectionObserver)
export const trackSectionView = (sectionName) =>
  trackEvent("section_view", { section_name: sectionName });

// Herramientas IA (Icon, Hatch, Linetype generators)
export const trackToolStart = (toolName) =>
  trackEvent("tool_use_start", { tool_name: toolName });

export const trackToolGenerate = (toolName, params = {}) =>
  trackEvent("tool_generate", { tool_name: toolName, ...params });

export const trackToolExport = (toolName, format) =>
  trackEvent("tool_export", { tool_name: toolName, format });

// Documentación
export const trackDocView = (docSlug) =>
  trackEvent("doc_view", { doc_slug: docSlug });

// Auth
export const trackSignup = (method = "google") =>
  trackEvent("sign_up", { method });

export const trackLogin = (method = "google") =>
  trackEvent("login", { method });

// Dashboard SaaS
export const trackLispUpload = (tenantId) =>
  trackEvent("lisp_upload", { tenant_id: tenantId });

export const trackSeatChange = (tenantId, seats) =>
  trackEvent("seat_change", { tenant_id: tenantId, seats });

// Inicializa analytics + auto-track page_view en Astro pages
export const initPageTracking = async () => {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  // Track page view con path completo
  trackEvent("page_view", {
    page_path: window.location.pathname,
    page_title: document.title,
    page_referrer: document.referrer || "direct",
  });
};
