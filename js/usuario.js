/**
 * Lógica del panel de Usuario (B2C)
 * Conexión completa con Supabase
 */

let _usuario = null;
let _todosLosCupones = [];
let _reclamoHecho = false;
let _cuponSeleccionado = null;
let _negociosReclamados = new Set();

const MASCOTA_ICON = { 'Perro': '🐕', 'Gato': '🐈', 'Ambos': '🐾' };

document.addEventListener('DOMContentLoaded', () => {
    // 1. Revisar sesión
    const saved = localStorage.getItem('g6_usuario_cupones');
    if (saved) {
        try {
            _usuario = JSON.parse(saved);
            pasoACatalogo();
        } catch(e) {
            localStorage.removeItem('g6_usuario_cupones');
        }
    }

    // 2. Cargar ciudades
    loadCiudades('lista-ciudades-u');

    // Funcionalidad de Pestañas Login/Registro
    window.toggleAuthView = (view) => {
        const btnReg = document.getElementById('tab-registro-btn');
        const btnLog = document.getElementById('tab-login-btn');
        const viewReg = document.getElementById('view-registro');
        const viewLog = document.getElementById('view-login');

        if (!btnReg || !btnLog || !viewReg || !viewLog) return;

        if (view === 'registro') {
            btnReg.className = "flex-1 py-3 text-sm font-bold border-b-2 border-indigo-600 text-indigo-600 transition-colors";
            btnLog.className = "flex-1 py-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors";
            viewReg.classList.remove('hidden');
            viewLog.classList.add('hidden');
        } else {
            btnLog.className = "flex-1 py-3 text-sm font-bold border-b-2 border-indigo-600 text-indigo-600 transition-colors";
            btnReg.className = "flex-1 py-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors";
            viewLog.classList.remove('hidden');
            viewReg.classList.add('hidden');
        }
    };

    // 3. Formulario de Registro
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('btn-registrar');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = 'Procesando...';

            const nombre = document.getElementById('u-nombre').value.trim();
            const celular = document.getElementById('u-celular').value.trim();
            const cc_nit = document.getElementById('u-cc-nit').value.trim();
            const ciudad = document.getElementById('u-ciudad').value.trim();
            const cod_tienda = document.getElementById('u-cod-tienda').value.trim().toUpperCase();
            const mascota = document.querySelector('input[name="mascota"]:checked')?.value || 'Ambos';

            const numCelular = window.cleanNumber ? window.cleanNumber(celular) : Number(celular.replace(/\D/g, ''));
            const numNit = window.cleanNumber ? window.cleanNumber(cc_nit) : Number(cc_nit.replace(/\D/g, ''));

            try {
                // 1. Verificar en usuarios por Celular
                const { data: existCel, error: errCel } = await window.dbs.usuarios.from('usuarios')
                    .select('"Celular"')
                    .eq('Celular', numCelular)
                    .limit(1);
                if (errCel) throw errCel;

                // 2. Verificar en usuarios por CC NIT
                const { data: existNit, error: errNit } = await window.dbs.usuarios.from('usuarios')
                    .select('cc_nit_clientes_b2c')
                    .eq('cc_nit_clientes_b2c', numNit)
                    .limit(1);
                if (errNit) throw errNit;

                // 3. Verificar en cupones_reclamados por Celular
                const { data: existRecCel, error: errRecCel } = await window.dbs.cupones_reclamados.from('cupones_reclamados')
                    .select('"Celular Usuario"')
                    .eq('Celular Usuario', numCelular)
                    .limit(1);
                if (errRecCel) throw errRecCel;

                // 4. Verificar en cupones_reclamados por CC NIT
                const { data: existRecNit, error: errRecNit } = await window.dbs.cupones_reclamados.from('cupones_reclamados')
                    .select('cc_nit_clientes_b2c')
                    .eq('cc_nit_clientes_b2c', numNit)
                    .limit(1);
                if (errRecNit) throw errRecNit;

                const alreadyExists = (existCel && existCel.length > 0) || 
                                      (existNit && existNit.length > 0) || 
                                      (existRecCel && existRecCel.length > 0) ||
                                      (existRecNit && existRecNit.length > 0);

                if (alreadyExists) {
                    alert('Este Celular o Cédula/NIT ya se encuentra registrado en el sistema. Por favor, utiliza la opción "Ya tengo cuenta" para iniciar sesión.');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                    return;
                }

                // Insertar nuevo usuario en tabla usuarios
                const nuevoUsuarioPayload = {
                    'cc_nit_clientes_b2c': numNit,
                    'Celular': numCelular,
                    'Nombre Completo': nombre,
                    'Ciudad': ciudad,
                    'Mascota': mascota,
                    'Cod Tienda': cod_tienda,
                    'Acepto Politica': 'SÍ',
                    'Fecha Registro': new Date().toLocaleDateString('es-CO'),
                    'Total Cupones Reclamados': 0
                };

                const { error: insertErr } = await window.dbs.usuarios.from('usuarios').insert([nuevoUsuarioPayload]);
                if (insertErr) throw insertErr;
                
                _usuario = { 
                    nombre_completo: nombre, 
                    celular: numCelular, 
                    cc_nit_cliente: numNit, 
                    ciudad: ciudad, 
                    mascota: mascota, 
                    cod_tienda: cod_tienda,
                    total_reclamados: 0
                };
                localStorage.setItem('g6_usuario_cupones', JSON.stringify(_usuario));
                
                pasoACatalogo();
            } catch (err) {
                alert('Error al registrar: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // 4. Formulario de Login (Ya tengo cuenta)
    const formLogin = document.getElementById('form-login-usuario');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login-usuario');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = 'Buscando...';

            const celular = document.getElementById('l-celular').value.trim();
            const cc_nit = document.getElementById('l-cc-nit').value.trim();

            const numCelular = window.cleanNumber ? window.cleanNumber(celular) : Number(celular.replace(/\D/g, ''));
            const numNit = window.cleanNumber ? window.cleanNumber(cc_nit) : Number(cc_nit.replace(/\D/g, ''));

            try {
                // 1. Buscar primero en la tabla 'usuarios'
                const { data: existing, error } = await window.dbs.usuarios.from('usuarios')
                    .select('*')
                    .eq('Celular', numCelular)
                    .eq('cc_nit_clientes_b2c', numNit);

                if (error) throw error;

                if (existing && existing.length > 0) {
                    const usr = existing[0];
                    _usuario = { 
                        nombre_completo: usr['Nombre Completo'], 
                        celular: usr['Celular'], 
                        cc_nit_cliente: usr['cc_nit_clientes_b2c'],
                        ciudad: usr['Ciudad'], 
                        mascota: usr['Mascota'] || 'Ambos', 
                        cod_tienda: usr['Cod Tienda'] || '',
                        total_reclamados: usr['Total Cupones Reclamados'] || 0
                    };
                    localStorage.setItem('g6_usuario_cupones', JSON.stringify(_usuario));
                    pasoACatalogo();
                    return;
                }

                // 2. Fallback de Resiliencia: Buscar en 'cupones_reclamados' para usuarios históricos
                const { data: reclamacionesHist, error: errHist } = await window.dbs.cupones_reclamados.from('cupones_reclamados')
                    .select('*')
                    .eq('Celular Usuario', numCelular)
                    .eq('cc_nit_clientes_b2c', numNit)
                    .limit(1);

                if (!errHist && reclamacionesHist && reclamacionesHist.length > 0) {
                    const rec = reclamacionesHist[0];
                    
                    // Auto-migración a tabla usuarios
                    const autoUsuario = {
                        'cc_nit_clientes_b2c': numNit,
                        'Celular': numCelular,
                        'Nombre Completo': rec['Nombre Usuario'] || 'Usuario Registrado',
                        'Ciudad': rec['Ciudad Usuario'] || '',
                        'Mascota': rec['Mascota Usuario'] || 'Ambos',
                        'Acepto Politica': 'SÍ',
                        'Fecha Registro': rec['Fecha Reclamacion'] || new Date().toLocaleDateString('es-CO'),
                        'Total Cupones Reclamados': 1,
                        'Cod Tienda': ''
                    };

                    await window.dbs.usuarios.from('usuarios').insert([autoUsuario]);

                    _usuario = { 
                        nombre_completo: autoUsuario['Nombre Completo'], 
                        celular: numCelular, 
                        cc_nit_cliente: numNit, 
                        ciudad: autoUsuario['Ciudad'], 
                        mascota: autoUsuario['Mascota'], 
                        cod_tienda: '',
                        total_reclamados: 1
                    };
                    localStorage.setItem('g6_usuario_cupones', JSON.stringify(_usuario));
                    pasoACatalogo();
                    return;
                }

                alert('No se encontró una cuenta con esta Cédula/NIT y Celular. Verifica tus datos o regístrate.');

            } catch (err) {
                alert('Error al iniciar sesión: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }
});

async function loadCiudades(datalistId) {
    try {
        const { data, error } = await window.dbs.cod_ciudades.from('cod_ciudades').select('*');
        if (error) throw error;
        
        const dl = document.getElementById(datalistId);
        if (!dl || !data) return;
        dl.innerHTML = data.map(c => `<option value="${c['Ciudad'] || c['ciudad']}"></option>`).join('');
    } catch(e) {
        console.warn('Error cargando ciudades:', e);
    }
}

async function pasoACatalogo() {
    const regView = document.getElementById('registro-view');
    const catView = document.getElementById('catalogo-view');
    if (regView) regView.classList.add('hidden');
    if (catView) catView.classList.remove('hidden');
    
    // Setear ciudad actual en el filtro de ciudad y mascota
    const fMascota = document.getElementById('f-mascota');
    if (fMascota && _usuario && _usuario.mascota && _usuario.mascota !== 'Ambos') {
        fMascota.value = _usuario.mascota;
    }

    // Actualizar Saludo Dinámico
    const saludoEl = document.getElementById('saludo-usuario');
    if (saludoEl && _usuario && _usuario.nombre_completo) {
        const pNombre = _usuario.nombre_completo.split(' ')[0];
        saludoEl.textContent = `¡Hola, ${pNombre}! Estos son tus cupones`;
    }

    await cargarCatalogo();
}

async function cargarCatalogo() {
    const loader = document.getElementById('skeleton-loader');
    const grid = document.getElementById('grid-pub');
    if (loader) loader.classList.remove('hidden');
    if (grid) grid.innerHTML = '';

    try {
        // 1. Obtener cupones activos
        const { data: cupones, error: errCup } = await window.dbs.cupones_generados.from('cupones_generados')
            .select('*')
            .eq('Estado', 'Activo');
        if (errCup) throw errCup;
        
        // 2. Obtener clientes B2B para mapear logos, nombres y redes
        const { data: clientes, error: errCli } = await window.dbs.clientes_b2b.from('clientes_b2b')
            .select('cc_nit, negocio, celular, redes, sitio_web, url_image, direccion, ciudad');
        if (errCli) throw errCli;

        // 3. Obtener historial de reclamaciones de este usuario para bloquear múltiples reclamos por comercio
        const numCelular = window.cleanNumber ? window.cleanNumber(_usuario.celular) : Number(String(_usuario.celular).replace(/\D/g,''));
        const { data: reclamaciones, error: errRec } = await window.dbs.cupones_reclamados.from('cupones_reclamados')
            .select('cc_nit_clientes_b2b')
            .eq('Celular Usuario', numCelular);
        
        if (errRec) {
            console.warn('No se pudo cargar historial de reclamaciones:', errRec.message);
        }

        // Guardar set de NITs de negocios donde ya reclamó
        _negociosReclamados = new Set((reclamaciones || []).map(r => String(r['cc_nit_clientes_b2b'])));

        // Mapear catálogo enriquecido
        _todosLosCupones = (cupones || []).map(c => {
            const clienteObj = (clientes || []).find(cli => cli['cc_nit'] == c['cc_nit_clientes_b2b']);
            return {
                cupon_id: c['Cupon ID'],
                cc_nit_cliente: c['cc_nit_clientes_b2b'],
                titulo: c['Titulo'],
                descripcion: c['Descripcion'],
                tipo: c['Tipo'],
                categoria: c['Categoria'],
                porcentaje_descuento: c['Porcentaje Descuento'],
                mascota: c['Mascota'],
                ciudad: c['Ciudad'] || c['ciudad'] || '',
                fecha_vencimiento: c['Fecha Vencimiento'],
                imagen_url: c['Imagen URL'],
                cantidad_maxima: c['Cantidad Maxima'],
                cantidad_reclamada: c['Cantidad Reclamada'] || 0,
                estado: c['Estado'],
                nombre_negocio: clienteObj ? clienteObj['negocio'] : (c['nombre_cliente_b2b'] || 'Negocio B2B'),
                celular_b2b: clienteObj ? clienteObj['celular'] : '',
                sitio_web: clienteObj ? clienteObj['sitio_web'] : '',
                redes: clienteObj ? clienteObj['redes'] : '',
                url_image_b2b: clienteObj ? clienteObj['url_image'] : '',
                direccion_b2b: clienteObj ? clienteObj['direccion'] : ''
            };
        });
        
        // Poblar select de ciudades únicas en el catálogo
        const ciudades = [...new Set(_todosLosCupones.map(c => c.ciudad).filter(Boolean))].sort();
        const selC = document.getElementById('f-ciudad');
        if (selC) {
            selC.innerHTML = '<option value="">Todas las ciudades</option>';
            ciudades.forEach(cd => {
                selC.innerHTML += `<option value="${cd}">${cd}</option>`;
            });
        }

        if (loader) loader.classList.add('hidden');
        aplicarFiltros();
    } catch(err) {
        if (loader) loader.classList.add('hidden');
        if (grid) grid.innerHTML = `<div class="col-span-full text-center text-rose-500 py-10 font-semibold">Error cargando catálogo: ${err.message}</div>`;
    }
}

function aplicarFiltros() {
    const busqueda = (document.getElementById('f-busqueda')?.value || '').toLowerCase();
    const ciudad = document.getElementById('f-ciudad')?.value || '';
    const mascota = document.getElementById('f-mascota')?.value || '';
    const orden = document.getElementById('f-orden')?.value || '';

    let filtrados = _todosLosCupones.filter(c => {
        const matchStr = !busqueda || c.titulo.toLowerCase().includes(busqueda) || c.nombre_negocio.toLowerCase().includes(busqueda);
        const matchCiud = !ciudad || (c.ciudad && c.ciudad.trim().toLowerCase() === ciudad.trim().toLowerCase());
        const matchMasc = !mascota || (c.mascota && (c.mascota.trim() === mascota.trim() || c.mascota.trim() === 'Ambos'));
        return matchStr && matchCiud && matchMasc;
    });

    if(orden === 'desc-mayor') filtrados.sort((a,b) => b.porcentaje_descuento - a.porcentaje_descuento);
    else if(orden === 'desc-menor') filtrados.sort((a,b) => a.porcentaje_descuento - b.porcentaje_descuento);
    else filtrados.sort((a,b) => String(b.cupon_id).localeCompare(String(a.cupon_id)));

    const countEl = document.getElementById('filtros-count');
    if (countEl) countEl.textContent = `${filtrados.length} cupones disponibles`;
    renderCatalogo(filtrados);
}

function renderCatalogo(lista) {
    const grid = document.getElementById('grid-pub');
    if (!grid) return;

    if (!lista.length) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-10 font-medium">No hay cupones para estos filtros.</div>`;
        return;
    }

    grid.innerHTML = lista.map(c => {
        const mascIcon = MASCOTA_ICON[c.mascota] || '🐾';
        const agotado = c.cantidad_reclamada >= c.cantidad_maxima;
        const yaReclamadoEnNegocio = _negociosReclamados.has(String(c.cc_nit_cliente));
        const yaReclamadoAhora = _reclamoHecho;
        
        let actionBtn = `<button onclick='abrirConfirmacion(${JSON.stringify(c).replace(/'/g, "&apos;")})' class="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all text-sm">Reclamar Cupón</button>`;
        
        if (agotado) {
            actionBtn = `<button class="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed text-sm">Agotado</button>`;
        } else if (yaReclamadoEnNegocio) {
            actionBtn = `<button class="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed text-sm">Ya reclamaste en este negocio</button>`;
        } else if (yaReclamadoAhora) {
            actionBtn = `<button class="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed text-sm">Solo 1 por sesión</button>`;
        }

        const img = c.imagen_url ? `<img src="${c.imagen_url}" class="w-full h-32 object-cover rounded-t-2xl">` : `<div class="w-full h-32 bg-indigo-50 flex items-center justify-center text-4xl rounded-t-2xl">🎫</div>`;

        // Generar enlaces sociales
        let socialLinks = '';
        if (c.sitio_web) {
            const urlWeb = c.sitio_web.startsWith('http') ? c.sitio_web : 'https://' + c.sitio_web;
            socialLinks += `<a href="${urlWeb}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors overflow-hidden" title="Sitio Web"><img src="assets/icons/icon-web.svg" class="w-5 h-5 object-contain"></a>`;
        }
        if (c.celular_b2b) {
            const tel = String(c.celular_b2b).replace(/\D/g, '');
            socialLinks += `<a href="https://wa.me/57${tel}" target="_blank" class="w-8 h-8 flex items-center justify-center rounded-full transition-colors overflow-hidden hover:opacity-80" title="WhatsApp"><img src="assets/icons/icon-whatsapp.svg" class="w-8 h-8 object-cover rounded-full"></a>`;
        }
        
        if (c.direccion_b2b) {
            const mapUrl = c.direccion_b2b.startsWith('http')
                ? c.direccion_b2b
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.direccion_b2b + ', ' + c.ciudad)}`;
            socialLinks += `<a href="${mapUrl}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full transition-colors" title="Ver en Maps"><i data-lucide="map-pin" class="w-4 h-4"></i></a>`;
        }

        if (c.redes) {
            try {
                const redesArr = typeof c.redes === 'string' ? JSON.parse(c.redes) : c.redes;
                if (Array.isArray(redesArr)) {
                    redesArr.forEach(r => {
                        const tipoLow = (r.tipo || '').toLowerCase();
                        let iconSrc = '';
                        if (tipoLow.includes('facebook')) iconSrc = 'assets/icons/icon-facebook.svg';
                        else if (tipoLow.includes('instagram')) iconSrc = 'assets/icons/icon-instagram.svg';
                        else if (tipoLow.includes('tiktok')) iconSrc = 'assets/icons/icon-tiktok.svg';
                        else if (tipoLow.includes('whatsapp')) iconSrc = 'assets/icons/icon-whatsapp.svg';
                        
                        if (iconSrc) {
                            socialLinks += `<a href="${r.url}" target="_blank" class="w-8 h-8 flex items-center justify-center rounded-full overflow-hidden hover:opacity-80 transition-opacity" title="${r.tipo}"><img src="${iconSrc}" class="w-8 h-8 object-cover rounded-full"></a>`;
                        } else if (r.url) {
                            socialLinks += `<a href="${r.url}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-colors" title="${r.tipo || 'Enlace'}"><i data-lucide="link" class="w-4 h-4"></i></a>`;
                        }
                    });
                }
            } catch(e) {}
        }
        const b2bLogo = c.url_image_b2b ? `<img src="${c.url_image_b2b}" class="w-6 h-6 rounded-md object-contain bg-white border border-slate-100">` : '';

        const pct = c.cantidad_maxima > 0 ? Math.min(100, Math.round((c.cantidad_reclamada / c.cantidad_maxima) * 100)) : 0;

        return `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                ${img}
                <div class="p-6 flex-1 flex flex-col">
                    <div class="flex justify-between items-start mb-2">
                        <span class="${agotado ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-700'} px-3 py-1 rounded-full text-xs font-bold">${c.porcentaje_descuento}% OFF</span>
                        <span class="text-2xl">${mascIcon}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 text-lg mb-1 leading-tight">${c.titulo}</h3>
                    <div class="flex items-center gap-2 mb-2">
                        ${b2bLogo}
                        <p class="text-sm font-semibold text-slate-700">${c.nombre_negocio} ${c.ciudad ? '• ' + c.ciudad : ''}</p>
                    </div>
                    ${socialLinks ? `<div class="flex gap-2 mb-4">${socialLinks}</div>` : '<div class="mb-4"></div>'}
                    
                    <div class="mt-auto">
                        <div class="w-full bg-slate-100 rounded-full h-[6px] overflow-hidden mb-2">
                            <div class="h-full ${agotado ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-600 to-emerald-500'}" style="width: ${pct}%"></div>
                        </div>
                        <p class="text-[0.65rem] font-medium text-slate-400 text-right mb-4">${c.cantidad_reclamada} / ${c.cantidad_maxima} reclamados</p>
                        ${actionBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function abrirConfirmacion(cupon) {
    if (_reclamoHecho) return;
    _cuponSeleccionado = cupon;
    
    document.getElementById('conf-titulo').textContent = cupon.titulo;
    document.getElementById('conf-negocio').textContent = cupon.nombre_negocio;
    document.getElementById('conf-img').innerHTML = cupon.imagen_url ? `<img src="${cupon.imagen_url}" class="w-full h-full object-cover">` : '🎫';
    
    document.getElementById('modal-confirmacion').classList.remove('hidden');
}

function cerrarConfirmacion() {
    document.getElementById('modal-confirmacion').classList.add('hidden');
    _cuponSeleccionado = null;
}

const btnReclamarEl = document.getElementById('btn-reclamar');
if (btnReclamarEl) {
    btnReclamarEl.addEventListener('click', async () => {
        if (!_cuponSeleccionado || !_usuario) return;

        const btn = document.getElementById('btn-reclamar');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const numCelular = window.cleanNumber ? window.cleanNumber(_usuario.celular) : Number(String(_usuario.celular).replace(/\D/g,''));
        const numNitUsuario = window.cleanNumber ? window.cleanNumber(_usuario.cc_nit_cliente) : Number(String(_usuario.cc_nit_cliente).replace(/\D/g,''));
        const numNitB2b = window.cleanNumber ? window.cleanNumber(_cuponSeleccionado.cc_nit_cliente) : Number(String(_cuponSeleccionado.cc_nit_cliente).replace(/\D/g,''));

        const payload = {
            'Reclamacion ID': 'REC-' + Math.floor(Math.random() * 900000 + 100000),
            'Cupon ID': _cuponSeleccionado.cupon_id,
            'cc_nit_clientes_b2b': numNitB2b,
            'cc_nit_clientes_b2c': numNitUsuario,
            'nombre_cliente_b2b': _cuponSeleccionado.nombre_negocio,
            'Nombre Usuario': _usuario.nombre_completo,
            'Celular Usuario': numCelular,
            'Ciudad Usuario': _usuario.ciudad,
            'Mascota Usuario': _usuario.mascota,
            'Fecha Reclamacion': new Date().toLocaleDateString('es-CO'),
            'Estado': 'Activo'
        };

        try {
            // 1. Insertar reclamación en cupones_reclamados
            const { error: errInsRec } = await window.dbs.cupones_reclamados.from('cupones_reclamados').insert([payload]);
            if (errInsRec) throw errInsRec;
            
            // 2. Incrementar Cantidad Reclamada en cupones_generados
            const nuevaCant = (_cuponSeleccionado.cantidad_reclamada || 0) + 1;
            await window.dbs.cupones_generados.from('cupones_generados')
                .update({ 'Cantidad Reclamada': nuevaCant })
                .eq('Cupon ID', _cuponSeleccionado.cupon_id);
                
            // 3. Incrementar Total Cupones Reclamados en usuarios
            const nuevoTotalUser = (_usuario.total_reclamados || 0) + 1;
            _usuario.total_reclamados = nuevoTotalUser;
            localStorage.setItem('g6_usuario_cupones', JSON.stringify(_usuario));
            
            await window.dbs.usuarios.from('usuarios')
                .update({ 'Total Cupones Reclamados': nuevoTotalUser })
                .eq('cc_nit_clientes_b2c', numNitUsuario);

            // Marcar negocio como reclamado localmente
            _negociosReclamados.add(String(_cuponSeleccionado.cc_nit_cliente));

            // Mostrar modal de éxito personalizado
            document.getElementById('exito-negocio').textContent = _cuponSeleccionado.nombre_negocio;
            document.getElementById('exito-ciudad').textContent = _cuponSeleccionado.ciudad || '';
            
            const exitoImg = document.getElementById('exito-img');
            if (_cuponSeleccionado.imagen_url) {
                exitoImg.innerHTML = `<img src="${_cuponSeleccionado.imagen_url}" class="w-full h-full object-cover">`;
            } else {
                exitoImg.innerHTML = '🏬';
            }

            // Botón WhatsApp y Ubicación del Negocio B2B
            const containerBtns = document.getElementById('exito-contacto-btn');
            let htmlBtns = '<div class="flex gap-2">';
            if (_cuponSeleccionado.celular_b2b) {
                const tel = String(_cuponSeleccionado.celular_b2b).replace(/\D/g, '');
                htmlBtns += `<a href="https://wa.me/57${tel}" target="_blank" class="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm" title="Contactar por WhatsApp">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.01 2.014c-5.46 0-9.91 4.46-9.91 9.94 0 1.74.45 3.42 1.3 4.92L2 21.99l5.25-1.37c1.46.81 3.09 1.25 4.76 1.25 5.46 0 9.91-4.46 9.91-9.94 0-5.48-4.45-9.916-9.91-9.916zm5.72 14.28c-.24.67-1.37 1.28-1.93 1.35-.51.06-1.16.14-3.32-.76-2.61-1.09-4.28-3.76-4.41-3.94-.13-.17-1.05-1.4-1.05-2.67 0-1.27.66-1.9.9-2.16.22-.24.5-.31.67-.31.17 0 .34 0 .49.01.17 0 .4-.06.63.49.23.56.78 1.91.85 2.05.07.14.12.31.02.51-.09.2-.14.33-.28.5-.13.16-.29.35-.4.48-.13.14-.27.29-.12.55.15.26.66 1.1 1.43 1.78.99.88 1.81 1.15 2.07 1.28.26.13.41.11.56-.06.16-.17.69-.8 8.87-1.08.19-.28.37-.11.53.07.16.5 1.17.5 1.17.5.01-.25.04-.66-.2-.91-.67z"></path></svg>
                </a>`;
            }
            if (_cuponSeleccionado.direccion_b2b) {
                const dirQuery = encodeURIComponent(_cuponSeleccionado.direccion_b2b + ', ' + _cuponSeleccionado.ciudad);
                htmlBtns += `<a href="https://maps.google.com/?q=${dirQuery}" target="_blank" class="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full flex items-center justify-center transition-colors shadow-sm" title="Ver en Mapa">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </a>`;
            }
            htmlBtns += '</div>';
            containerBtns.innerHTML = htmlBtns;
            
            document.getElementById('modal-exito').classList.remove('hidden');
            
            _reclamoHecho = true;
            cerrarConfirmacion();
            await cargarCatalogo(); // Recargar grilla
        } catch (err) {
            alert('Error al reclamar el cupón: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '¡Reclamar!';
        }
    });
}

// Modales
window.abrirTerminos = function() {
    const m = document.getElementById('modal-terminos');
    if (m) m.classList.remove('hidden');
};

window.cerrarTerminos = function() {
    const m = document.getElementById('modal-terminos');
    if (m) m.classList.add('hidden');
};

window.cerrarExito = function() {
    const m = document.getElementById('modal-exito');
    if (m) m.classList.add('hidden');
};
