/**
 * Funciones de integración y clientes de Supabase
 * Centraliza clientes, esquemas y helpers de sanitización
 */

const dbs = {};

window.cleanNumber = (val) => {
    if (typeof val === 'number') return val;
    const cleanStr = String(val || '').replace(/\D/g, '');
    const num = Number(cleanStr);
    return isNaN(num) ? 0 : num;
};

try {
    const env = window.ENV || {};

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        console.error("Faltan variables en window.ENV. Asegúrate de incluir config.js.");
    } else {
        const getBaseUrl = (url) => url ? url.split('/rest/v1/')[0] : 'https://placeholder.supabase.co';
        const createClient = (url) => window.supabase.createClient(getBaseUrl(url), env.SUPABASE_ANON_KEY);
        
        dbs.clientes_b2b = createClient(env.SUPABASE_URL);
        dbs.cod_ciudades = createClient(env.SUPABASE_URL);
        dbs.cod_tiendas = createClient(env.SUPABASE_URL);
        dbs.cupones_generados = createClient(env.SUPABASE_URL);
        dbs.cupones_reclamados = createClient(env.SUPABASE_URL);
        dbs.usuarios = createClient(env.SUPABASE_URL);
        
        window.dbs = dbs;
    }
} catch (e) {
    console.error('Error al inicializar Supabase:', e);
}
