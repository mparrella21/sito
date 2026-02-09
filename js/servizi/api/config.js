

const DOMAIN = "192.168.72.107:32413";

// Modificare con https se viene attivato, mettere if??
const PROTOCOL = "http";

// Costanti da richiamare
export const BASE_URL = `${PROTOCOL}://${DOMAIN}`;
export const API_URL = `${BASE_URL}/api`;

// Un helper per le immagini se sono in una cartella specifica
export const ASSETS_URL = `${API_URL}/media/static/upload/`;
