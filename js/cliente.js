/**
 * Lógica del panel del cliente B2B
 * Conexión completa con Supabase
 */

let _ccNit = null;
let _cliente = null;
let _cupones = [];
let _reclamos = [];
let _chartCiud = null;
let _chartMasc = null;
let _chartTop = null;

const ESTADO_CLASSES = {
    'Activo': 'bg-indigo-100 text-indigo-700',
    'Reclamado': 'bg-blue-100 text-blue-700',
    'Canjeado': 'bg-emerald-100 text-emerald-700',
    'Vencido': 'bg-rose-100 text-rose-700'
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Revisar sesión existente
    const sessionNit = sessionStorage.getItem('g6_client_nit');
    if (sessionNit) {
        _ccNit = sessionNit;
        mostrarDashboard();
    }

    // 2. Login Form B2B
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nit = document.getElementById('login-nit').value.trim();
            const celular = document.getElementById('login-celular').value.trim();
            const btn = e.target.querySelector('button[type="submit"]');
            
            btn.disabled = true;
            btn.innerHTML = 'Verificando...';

            const numNit = window.cleanNumber ? window.cleanNumber(nit) : Number(nit.replace(/\D/g, ''));
            const numCelular = window.cleanNumber ? window.cleanNumber(celular) : Number(celular.replace(/\D/g, ''));

            try {
                const { data: clientes, error } = await window.dbs.clientes_b2b.from('clientes_b2b')
                    .select('*')
                    .eq('cc_nit', numNit);
                
                if (error) throw error;
                
                const cliente = (clientes || []).find(c => {
                    const dbCel = window.cleanNumber ? window.cleanNumber(c['celular']) : Number(String(c['celular']).replace(/\D/g, ''));
                    return dbCel === numCelular;
                });

                if (cliente) {
                    _ccNit = numNit;
                    _cliente = cliente;
                    sessionStorage.setItem('g6_client_nit', String(numNit));
                    mostrarDashboard();
                } else {
                    alert('NIT o Celular incorrectos. Por favor verifica tus credenciales.');
                }
            } catch(err) {
                alert('Error de conexión: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Ingresar';
            }
        });
    }

    // Formulario de Cupones
    const formCupon = document.getElementById('form-cupon');
    if (formCupon) {
        formCupon.addEventListener('submit', guardarCupon);
    }
});

function logoutCliente() {
    sessionStorage.removeItem('g6_client_nit');
    _ccNit = null;
    _cliente = null;
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
}

async function mostrarDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    // Si no tenemos el cliente en memoria pero hay sesión guardada
    if (!_cliente && _ccNit) {
        const numNit = window.cleanNumber ? window.cleanNumber(_ccNit) : Number(String(_ccNit).replace(/\D/g, ''));
        const { data } = await window.dbs.clientes_b2b.from('clientes_b2b')
            .select('*')
            .eq('cc_nit', numNit)
            .limit(1);
        _cliente = data && data.length > 0 ? data[0] : null;
    }

    if (_cliente) {
        const navTitle = document.getElementById('nav-tipo-negocio');
        if (navTitle) navTitle.textContent = _cliente['negocio'] || 'Mi Panel';

        const logoElement = document.getElementById('nav-business-logo');
        if (logoElement) {
            if (_cliente['url_image']) {
                logoElement.src = _cliente['url_image'];
                logoElement.classList.remove('hidden');
            } else {
                logoElement.src = '';
                logoElement.classList.add('hidden');
            }
        }
    }

    // Cargar listas auxiliares
    loadCiudades('lista-ciudades-c');
    cargarCategorias();

    // Activar primer tab
    switchTab('cupones');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('block');
        el.classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-indigo-600', 'text-indigo-600');
        btn.classList.add('border-transparent', 'text-slate-500');
    });

    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        targetTab.classList.add('block');
    }
    
    const btn = document.getElementById(`btn-tab-${tab}`);
    if (btn) {
        btn.classList.add('active', 'border-indigo-600', 'text-indigo-600');
        btn.classList.remove('border-transparent', 'text-slate-500');
    }

    if (tab === 'cupones') cargarCupones();
    if (tab === 'reclamaciones') cargarReclamaciones();
    if (tab === 'dashboard') cargarAnalytics();
}

// ==========================================
// PESTAÑA: CUPONES
// ==========================================
async function cargarCupones() {
    try {
        const numNit = window.cleanNumber ? window.cleanNumber(_ccNit) : Number(String(_ccNit).replace(/\D/g, ''));
        const { data, error } = await window.dbs.cupones_generados.from('cupones_generados')
            .select('*')
            .eq('cc_nit_clientes_b2b', numNit);

        if (error) throw error;
        
        _cupones = (data || []).map(c => ({
            cupon_id: c['Cupon ID'],
            cc_nit_cliente: c['cc_nit_clientes_b2b'],
            nombre_negocio: c['nombre_cliente_b2b'] || (_cliente ? _cliente['negocio'] : ''),
            titulo: c['Titulo'],
            descripcion: c['Descripcion'],
            tipo: c['Tipo'],
            categoria: c['Categoria'],
            porcentaje_descuento: c['Porcentaje Descuento'],
            mascota: c['Mascota'],
            ciudad: c['Ciudad'] || c['ciudad'] || '',
            fecha_vencimiento: c['Fecha Vencimiento'],
            cantidad_maxima: c['Cantidad Maxima'],
            cantidad_reclamada: c['Cantidad Reclamada'] || 0,
            imagen_url: c['Imagen URL'],
            estado: c['Estado']
        }));
        
        // Actualizar stats
        const statActivos = document.getElementById('stat-activos');
        const statAgotados = document.getElementById('stat-agotados');
        if (statActivos) statActivos.textContent = _cupones.filter(c => c.estado === 'Activo').length;
        if (statAgotados) statAgotados.textContent = _cupones.filter(c => c.cantidad_reclamada >= c.cantidad_maxima).length;

        renderCupones();
    } catch (err) {
        console.error(err);
        alert('Error al cargar cupones: ' + err.message);
    }
}

function renderCupones() {
    const grid = document.getElementById('grid-cupones');
    if (!grid) return;

    if (!_cupones.length) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-10 font-medium">No tienes cupones creados aún. Haz clic en "➕ Nuevo Cupón" para comenzar.</div>`;
        return;
    }

    grid.innerHTML = _cupones.map(c => {
        const tieneReclamos = c.cantidad_reclamada > 0;
        const img = c.imagen_url ? `<img src="${c.imagen_url}" class="w-full h-32 object-cover rounded-lg mb-4">` : `<div class="w-full h-32 bg-slate-100 flex items-center justify-center text-4xl rounded-lg mb-4">🎁</div>`;
        const pct = c.cantidad_maxima > 0 ? Math.min(100, Math.round((c.cantidad_reclamada / c.cantidad_maxima) * 100)) : 0;

        return `
            <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                ${img}
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg text-slate-800 leading-tight">${c.titulo}</h3>
                    <span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">${c.porcentaje_descuento}% OFF</span>
                </div>
                <div class="text-sm text-slate-500 mb-4 line-clamp-2">${c.descripcion || ''}</div>
                
                <div class="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                    <div class="bg-indigo-600 h-2 rounded-full" style="width: ${pct}%"></div>
                </div>
                <div class="flex justify-between text-xs text-slate-500 mb-4">
                    <span>${c.cantidad_reclamada} reclamados</span>
                    <span>de ${c.cantidad_maxima}</span>
                </div>

                <div class="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span class="text-xs font-mono text-slate-400 font-semibold">${c.cupon_id}</span>
                    <div class="flex gap-2">
                        <button onclick='openModalCupon("edit", ${JSON.stringify(c).replace(/'/g, "&apos;")})' class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">✏️</button>
                        <button onclick="eliminarCupon('${c.cupon_id}', ${tieneReclamos})" class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${tieneReclamos ? 'opacity-50 cursor-not-allowed' : ''}" title="${tieneReclamos ? 'No se puede eliminar porque tiene reclamaciones' : 'Eliminar'}">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// PESTAÑA: RECLAMACIONES
// ==========================================
async function cargarReclamaciones() {
    const tbody = document.getElementById('tbody-reclamos');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-slate-400">Cargando reclamaciones...</td></tr>`;
    }
    
    try {
        const numNit = window.cleanNumber ? window.cleanNumber(_ccNit) : Number(String(_ccNit).replace(/\D/g, ''));
        const { data, error } = await window.dbs.cupones_reclamados.from('cupones_reclamados')
            .select('*')
            .eq('cc_nit_clientes_b2b', numNit);

        if (error) throw error;
        
        _reclamos = (data || []).map(c => ({
            reclamacion_id: c['Reclamacion ID'],
            cupon_id: c['Cupon ID'],
            cc_nit_cliente: c['cc_nit_clientes_b2b'],
            cc_nit_usuario: c['cc_nit_clientes_b2c'],
            nombre_usuario: c['Nombre Usuario'],
            celular_usuario: c['Celular Usuario'] ? String(c['Celular Usuario']) : '',
            ciudad_usuario: c['Ciudad Usuario'] || '',
            mascota_usuario: c['Mascota Usuario'] || '',
            fecha_reclamacion: c['Fecha Reclamacion'],
            estado: c['Estado'] || 'Reclamado'
        }));

        // Actualizar stats
        const statTotal = document.getElementById('stat-total-reclamos');
        const statActivos = document.getElementById('stat-reclamos-activos');
        const statCanjeados = document.getElementById('stat-reclamos-canjeados');
        const statVencidos = document.getElementById('stat-reclamos-vencidos');

        if (statTotal) statTotal.textContent = _reclamos.length;
        if (statActivos) statActivos.textContent = _reclamos.filter(r => r.estado === 'Activo' || r.estado === 'Reclamado').length;
        if (statCanjeados) statCanjeados.textContent = _reclamos.filter(r => r.estado === 'Canjeado').length;
        if (statVencidos) statVencidos.textContent = _reclamos.filter(r => r.estado === 'Vencido').length;

        if (!tbody) return;

        if (!_reclamos.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-slate-500 font-medium">Sin reclamaciones aún.</td></tr>`;
            return;
        }

        tbody.innerHTML = _reclamos.map(row => {
            const estadoCls = ESTADO_CLASSES[row.estado] || ESTADO_CLASSES['Activo'];
            const cuponTitle = _cupones.find(c => c.cupon_id === row.cupon_id)?.titulo || row.cupon_id;
            const telLimpio = row.celular_usuario.replace(/\D/g, '');
            
            return `
                <tr class="hover:bg-indigo-50/50 transition-colors border-b border-slate-100">
                    <td class="p-4 font-mono text-sm font-bold text-indigo-600">${row.reclamacion_id}</td>
                    <td class="p-4 text-sm font-medium text-slate-700">${cuponTitle}</td>
                    <td class="p-4 text-sm font-bold text-slate-800">${row.nombre_usuario}</td>
                    <td class="p-4 text-sm font-mono text-slate-500">
                        ${telLimpio ? `<a href="https://wa.me/57${telLimpio}" target="_blank" class="text-emerald-600 hover:underline font-semibold flex items-center gap-1">📱 ${row.celular_usuario}</a>` : 'Sin celular'}
                    </td>
                    <td class="p-4"><span class="${estadoCls} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${row.estado}</span></td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-rose-500 font-semibold">Error al cargar reclamaciones: ${err.message}</td></tr>`;
        }
    }
}

// ==========================================
// PESTAÑA: ANALYTICS
// ==========================================
async function cargarAnalytics() {
    if (_reclamos.length === 0) {
        await cargarReclamaciones();
    }
    if (_cupones.length === 0) {
        await cargarCupones();
    }

    // A. Por Ciudad
    const porCiudad = {};
    _reclamos.forEach(r => {
        const cd = r.ciudad_usuario || 'Otra';
        porCiudad[cd] = (porCiudad[cd] || 0) + 1;
    });

    // B. Por Mascota
    const porMascota = {};
    _reclamos.forEach(r => {
        const m = r.mascota_usuario || 'Ambos';
        porMascota[m] = (porMascota[m] || 0) + 1;
    });

    // C. Top Cupones
    const recPorCupon = {};
    _reclamos.forEach(r => {
        recPorCupon[r.cupon_id] = (recPorCupon[r.cupon_id] || 0) + 1;
    });
    const topCupones = Object.keys(recPorCupon).map(id => {
        const objC = _cupones.find(c => c.cupon_id === id);
        return { titulo: objC ? objC.titulo : id, count: recPorCupon[id] };
    }).sort((a,b) => b.count - a.count).slice(0, 10);

    const chartConfig = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

    if (_chartCiud) _chartCiud.destroy();
    const elCiud = document.getElementById('chart-ciudades');
    if (elCiud && Object.keys(porCiudad).length > 0) {
        _chartCiud = new Chart(elCiud, {
            type: 'doughnut',
            data: { labels: Object.keys(porCiudad), datasets: [{ data: Object.values(porCiudad), backgroundColor: ['#4f46e5', '#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e'] }] },
            options: chartConfig
        });
    }

    if (_chartMasc) _chartMasc.destroy();
    const elMasc = document.getElementById('chart-mascotas');
    if (elMasc && Object.keys(porMascota).length > 0) {
        _chartMasc = new Chart(elMasc, {
            type: 'pie',
            data: { labels: Object.keys(porMascota), datasets: [{ data: Object.values(porMascota), backgroundColor: ['#f59e0b', '#10b981', '#64748b'] }] },
            options: chartConfig
        });
    }

    if (_chartTop) _chartTop.destroy();
    const elTop = document.getElementById('chart-top-cupones');
    if (elTop && topCupones.length > 0) {
        _chartTop = new Chart(elTop, {
            type: 'bar',
            data: { 
                labels: topCupones.map(c => c.titulo.length > 20 ? c.titulo.substring(0,20)+'...' : c.titulo), 
                datasets: [{ label: 'Reclamos', data: topCupones.map(c => c.count), backgroundColor: '#4f46e5', borderRadius: 4 }] 
            },
            options: { ...chartConfig, indexAxis: 'y' }
        });
    }
}

// ==========================================
// MODAL Y CRUD CUPONES
// ==========================================
function openModalCupon(mode, cupon = null) {
    const form = document.getElementById('form-cupon');
    if (form) form.reset();
    
    if (mode === 'add') {
        document.getElementById('cupon-action').value = 'add_coupon';
        document.getElementById('cupon-id-edit').value = '';
        document.getElementById('modal-cupon-title').textContent = 'Nuevo Cupón';
        
        const hoy = new Date();
        hoy.setDate(hoy.getDate() + 1);
        document.getElementById('c-vencimiento').min = hoy.toISOString().split('T')[0];
    } else {
        document.getElementById('cupon-action').value = 'update_coupon';
        document.getElementById('cupon-id-edit').value = cupon.cupon_id;
        document.getElementById('modal-cupon-title').textContent = 'Editar Cupón';
        
        document.getElementById('c-titulo').value = cupon.titulo || '';
        document.getElementById('c-desc').value = cupon.descripcion || '';
        document.getElementById('c-categoria').value = cupon.categoria || '';
        document.getElementById('c-descuento').value = cupon.porcentaje_descuento || '';
        document.getElementById('c-ciudad').value = cupon.ciudad || '';
        document.getElementById('c-vencimiento').value = cupon.fecha_vencimiento || '';
        document.getElementById('c-cantidad').value = cupon.cantidad_maxima || '';
        document.getElementById('c-imagen').value = cupon.imagen_url || '';
        
        const tipoRadio = document.querySelector(`input[name="c-tipo"][value="${cupon.tipo}"]`);
        if (tipoRadio) tipoRadio.checked = true;
        const mascRadio = document.querySelector(`input[name="c-mascota"][value="${cupon.mascota}"]`);
        if (mascRadio) mascRadio.checked = true;
    }
    document.getElementById('modal-cupon').classList.remove('hidden');
}

function closeModalCupon() {
    document.getElementById('modal-cupon').classList.add('hidden');
}

async function guardarCupon(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-cupon');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const action = document.getElementById('cupon-action').value;
    const numNit = window.cleanNumber ? window.cleanNumber(_ccNit) : Number(String(_ccNit).replace(/\D/g, ''));
    
    const payload = {
        'cc_nit_clientes_b2b': numNit,
        'nombre_cliente_b2b': _cliente ? _cliente['negocio'] : '',
        'Titulo': document.getElementById('c-titulo').value.trim(),
        'Descripcion': document.getElementById('c-desc').value.trim(),
        'Tipo': document.querySelector('input[name="c-tipo"]:checked')?.value || 'Producto',
        'Categoria': document.getElementById('c-categoria').value,
        'Porcentaje Descuento': Number(document.getElementById('c-descuento').value),
        'Mascota': document.querySelector('input[name="c-mascota"]:checked')?.value || 'Ambos',
        'Ciudad': document.getElementById('c-ciudad').value.trim(),
        'Fecha Vencimiento': document.getElementById('c-vencimiento').value,
        'Cantidad Maxima': Number(document.getElementById('c-cantidad').value),
        'Imagen URL': document.getElementById('c-imagen').value.trim(),
        'Estado': 'Activo'
    };

    try {
        let result;
        if (action === 'add_coupon') {
            payload['Cupon ID'] = 'CUP-' + Math.floor(Math.random() * 900000 + 100000);
            payload['Fecha Creacion'] = new Date().toLocaleDateString('es-CO');
            payload['Cantidad Reclamada'] = 0;
            result = await window.dbs.cupones_generados.from('cupones_generados').insert([payload]);
        } else {
            const cupon_id = document.getElementById('cupon-id-edit').value;
            result = await window.dbs.cupones_generados.from('cupones_generados')
                .update(payload)
                .eq('Cupon ID', cupon_id);
        }

        if (result.error) throw result.error;
        
        closeModalCupon();
        await cargarCupones(); // Recargar grilla
    } catch (err) {
        alert('Error al guardar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Guardar Cupón';
    }
}

async function eliminarCupon(cuponId, tieneReclamos) {
    if (tieneReclamos) {
        alert('No se puede eliminar un cupón que ya tiene reclamaciones.');
        return;
    }
    if (!confirm('¿Seguro que deseas eliminar este cupón?')) return;
    
    try {
        const { error } = await window.dbs.cupones_generados.from('cupones_generados').delete().eq('Cupon ID', cuponId);
        if (error) throw error;
        await cargarCupones();
    } catch(err) {
        alert('Error eliminando: ' + err.message);
    }
}

// Helpers
async function loadCiudades(datalistId) {
    try {
        const { data, error } = await window.dbs.cod_ciudades.from('cod_ciudades').select('*');
        if (error) throw error;
        
        const dl = document.getElementById(datalistId);
        if (!dl || !data) return;
        dl.innerHTML = data.map(c => `<option value="${c['Ciudad'] || c['ciudad']}"></option>`).join('');
    } catch(e) {}
}

function cargarCategorias() {
    const cats = ['Peluquería', 'Veterinaria', 'Guardería', 'Comida/Snacks', 'Accesorios', 'Entrenamiento'];
    const sel = document.getElementById('c-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar...</option>';
    cats.forEach(c => {
        sel.innerHTML += `<option value="${c}">${c}</option>`;
    });
}
