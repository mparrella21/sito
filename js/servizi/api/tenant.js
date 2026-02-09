import { getTenantId } from "./autenticazione.js";
import { richiesta } from "./baseServizi.js";
import { API_URL } from "./config.js";

// --- COSTANTI URL ---
const URL_TENANT = `${API_URL}/tenant`;
const URL_PROVINCIA = `${URL_TENANT}/provincia`;
const URL_REGIONE = `${URL_TENANT}/regione`;
const URL_SEARCH = `${URL_TENANT}/search`;
const URL_BOUNDARIES = `${URL_TENANT}/boundaries`;

// --- COSTANTI STORAGE KEYS ---
const KEY_REGIONI = 'cache_regioni';
const KEY_PROVINCE = 'cache_province';
const KEY_TENANTS = 'cache_tenants';

// --- VARIABILI MEMORIA (RAM) ---
let memRegioni = null;
let memProvince = null;
let memTenants = null;

// --- HELPER STORAGE ---
const loadFromCache = (key) => {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};

const saveToCache = (key, data) => {
    sessionStorage.setItem(key, JSON.stringify(data));
};

const clearCache = (key) => {
    sessionStorage.removeItem(key);
};


// ***********************************************************************
// REGIONI
// ***********************************************************************

export const getAllRegioni = async () => {
    // 1) RAM
    if (memRegioni) return structuredClone(memRegioni);

    // 2) Storage
    const cached = loadFromCache(KEY_REGIONI);
    if (cached) {
        memRegioni = cached;
        return structuredClone(cached);
    }

    // 3) Server 
    const result = await richiesta({
        url: URL_REGIONE,
        method: 'GET',
        auth: false
    });

    // 4) Update Cache
    memRegioni = result;
    saveToCache(KEY_REGIONI, result);

    return structuredClone(memRegioni);
};

export const getRegione = async (istat_code) => {
    if (!istat_code) return null;

    // Check lista completa
    if (!memRegioni) memRegioni = loadFromCache(KEY_REGIONI);
    if (memRegioni) {
        const trovato = memRegioni.find(r => r.istat_code == istat_code);
        if (trovato) return structuredClone(trovato);
    }

    // Chiamata diretta
    return await richiesta({
        url: `${URL_REGIONE}/${istat_code}`,
        method: 'GET',
        auth: false
    });
};

// ***********************************************************************
// PROVINCE
// ***********************************************************************

export const getAllProvince = async () => {
    if (memProvince) return structuredClone(memProvince);

    const cached = loadFromCache(KEY_PROVINCE);
    if (cached) {
        memProvince = cached;
        return structuredClone(cached);
    }

    const result = await richiesta({
        url: URL_PROVINCIA,
        method: 'GET',
        auth: false
    });

    memProvince = result;
    saveToCache(KEY_PROVINCE, result);
    return structuredClone(memProvince);
};

export const getProvincia = async (istat_code) => {
    if (!istat_code) return null;

    if (!memProvince) memProvince = loadFromCache(KEY_PROVINCE);
    if (memProvince) {
        const trovato = memProvince.find(p => p.istat_code == istat_code);
        if (trovato) return structuredClone(trovato);
    }

    return await richiesta({
        url: `${URL_PROVINCIA}/${istat_code}`,
        method: 'GET',
        auth: false
    });
};

// ***********************************************************************
// TENANTS (COMUNI)
// ***********************************************************************

export const getAllTenants = async () => {
    if (memTenants) return structuredClone(memTenants);

    const cached = loadFromCache(KEY_TENANTS);
    if (cached) {
        memTenants = cached;
        return structuredClone(cached);
    }

    const result = await richiesta({
        url: URL_TENANT,
        method: 'GET',
        auth: false
    });

    memTenants = result;
    saveToCache(KEY_TENANTS, result);
    return structuredClone(memTenants);
};

export const getTenant = async (id) => {
    if (!id) throw new Error("Id mancante");

    if (!memTenants) memTenants = loadFromCache(KEY_TENANTS);
    if (memTenants) {
        const trovato = memTenants.find(t => t.id == id);
        if (trovato) return structuredClone(trovato);
    }

    return await richiesta({
        url: `${URL_TENANT}/${id}`,
        method: 'GET',
        auth: false
    });
};


export const getTenantByIstatCode = async (istat_code) => {
    if (!istat_code) return null;



}

// ***********************************************************************
// TENANTS - AMMINISTRAZIONE 
// ***********************************************************************

// Helper per pulire la cache RAM e Storage
const invalidateTenantsCache = () => {
    memTenants = null;
    clearCache(KEY_TENANTS);
    cache_ProvinceRegioni = null;
    cache_TenantsProvinceRegioni = null;
};

export const postTenant = async (label, istat_code, provincia_code) => {
    if (!label || !istat_code || !provincia_code) throw new Error("Dati tenant mancanti");

    const body = {
        label: label,
        istat_code: istat_code,
        provincia_code: provincia_code
    };


    const result = await richiesta({
        url: URL_TENANT,
        method: 'POST',
        body: body
    });

    invalidateTenantsCache();
    return result;
};

export const putTenant = async (id, label = null, provincia_code = null) => {
    if (!id || !label || !provincia_code) throw new Error("ID o dati mancanti per update");

    const body = {
        label: label,
        provincia_code: provincia_code
    };

    const result = await richiesta({
        url: `${URL_TENANT}/${id}`,
        method: 'PUT',
        body: body
    });

    invalidateTenantsCache();
    return result;
};

export const deleteTenant = async (id) => {
    if (!id) throw new Error("ID mancante per eliminazione");

    const result = await richiesta({
        url: `${URL_TENANT}/${id}`,
        method: 'DELETE'
    });

    invalidateTenantsCache();
    return result;
};

// ***********************************************************************
// SEARCH E GEODATA
// ***********************************************************************

export const searchTenant = async (lat, lon) => {
    if (!lat || !lon) throw new Error("Coordinate (lat/lon) mancanti per individuare il tenant");

    return await richiesta({
        url: URL_SEARCH,
        method: 'GET',
        auth: false,
        body: { lat, lon }
    });
};


const getBoundariesCurrentTenant = async () => {

    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Impossibile ottenere i confinit, nessun tenant selezionato");

    const tenant = await getTenant(tenantId);
    const istat_code = tenant?.istat_code;
    if (!istat_code) {
        console.warn("Tenant trovato ma privo di istat_code");
        return null;
    }


    return await richiesta({
        url: `${URL_BOUNDARIES}/${istat_code}`,
        method: 'GET',
        auth: false
    });
};


export const getBoundaries = async (istat_code) => {
    if (!istat_code) return getBoundariesCurrentTenant();

    return await richiesta({
        url: `${URL_BOUNDARIES}/${istat_code}`,
        method: 'GET',
        auth: false
    });
};


export const getAllBoundaries = async () => {
    const allTenants = await getAllTenants();
    if (!allTenants) return [];

    try {
        const promises = allTenants.map(async (tenant) => {
            if (!tenant.istat_code) return null;
            try {
                const boundary = await getBoundaries(tenant.istat_code);
                return {
                    ...tenant,
                    geometry: boundary.geometry
                };
            } catch {
                // Loggo ma non blocco il flusso generale
                console.warn(`Boundary mancante per ${tenant.nome}`);
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    } catch (e) {
        console.error("Errore critico boundaries", e);
        return [];
    }
};



// ***********************************************************************
// FUNZIONI EXTRA (AGGREGAZIONE)
// ***********************************************************************
// Queste funzioni non fanno chiamate dirette ma usano quelle sopra.
// Gli errori risalgono automaticamente.

let cache_ProvinceRegioni = null;
let cache_TenantsProvinceRegioni = null;

// Recupero tutte le province e tutte le regioni
export const getAllProvinceRegioni = async () => {
    if (cache_ProvinceRegioni) return structuredClone(cache_ProvinceRegioni);

    // Aspettiamo i dati base (se falliscono, l'errore risale)
    const [reg, prov] = await Promise.all([
        getAllRegioni(),
        getAllProvince()
    ]);

    if (!reg || !prov) return [];

    const result = structuredClone(reg);
    result.forEach(r => r.province = []);

    prov.forEach(provincia => {
        const regione = result.find(r => r.istat_code == provincia.regione_code);
        if (regione) regione.province.push(structuredClone(provincia));
    });

    cache_ProvinceRegioni = result;
    return structuredClone(cache_ProvinceRegioni);
};

// Recupero province di una regione
export const getProvinceRegione = async (istat_code) => {
    if (!istat_code) return null;

    // Usa cache aggregata se c'è
    if (cache_ProvinceRegioni) {
        const regione = cache_ProvinceRegioni.find(r => r.istat_code == istat_code);
        if (regione) return structuredClone(regione);
    }

    // Altrimenti costruisci al volo (i dati base vengono dalla cache/server)
    const regioneTarget = await getRegione(istat_code);
    const tutteProvince = await getAllProvince();

    if (!regioneTarget || !tutteProvince) return null;

    const result = structuredClone(regioneTarget);
    result.province = tutteProvince.filter(p => p.regione_code == istat_code);

    return result;
};

// Recupero tutti i comuni, le province e tutte le regioni
export const getAllTenantsProvinceRegioni = async () => {
    if (cache_TenantsProvinceRegioni) return structuredClone(cache_TenantsProvinceRegioni);

    const [baseStructure, allTenants] = await Promise.all([
        getAllProvinceRegioni(),
        getAllTenants()
    ]);

    if (!baseStructure || !allTenants) return [];

    const result = structuredClone(baseStructure);

    // Init array
    result.forEach(reg => {
        if (reg.province) reg.province.forEach(p => p.comuni = []);
    });

    // Popolamento
    allTenants.forEach(comune => {
        const regione = result.find(r => r.istat_code == comune.regione_code);
        if (regione && regione.province) {
            const provincia = regione.province.find(p => p.istat_code == comune.provincia_code);
            if (provincia) provincia.comuni.push(structuredClone(comune));
        }
    });

    cache_TenantsProvinceRegioni = result;
    return structuredClone(cache_TenantsProvinceRegioni);
};

// Recupero comuni di tutte le province di una regione
export const getTenantsProvinceRegione = async (istat_code) => {
    if (!istat_code) return null;

    if (cache_TenantsProvinceRegioni) {
        const reg = cache_TenantsProvinceRegioni.find(r => r.istat_code == istat_code);
        if (reg) return structuredClone(reg);
    }

    const structure = await getProvinceRegione(istat_code);
    const allTenants = await getAllTenants();

    if (!structure || !allTenants) return null;

    structure.province.forEach(p => p.comuni = []);

    allTenants.forEach(comune => {
        if (comune.regione_code == istat_code) {
            const prov = structure.province.find(p => p.istat_code == comune.provincia_code);
            if (prov) prov.comuni.push(structuredClone(comune));
        }
    });

    return structure;
};

// Recupero comuni di una provincia 
export const getTenantsProvincia = async (istat_code) => {
    if (!istat_code) return null;

    const prov = await getProvincia(istat_code);
    const allTenants = await getAllTenants();

    if (!prov || !allTenants) return null;

    const result = structuredClone(prov);
    result.comuni = allTenants.filter(t => t.provincia_code == istat_code);

    return result;
};
