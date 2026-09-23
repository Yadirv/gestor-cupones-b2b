/**
 * Controlador administrativo B2B
 * Integra Tabs, Modales, Gráficas y Comunicación real con GAS.
 */

// Referencias a Charts
let _chartCiud = null;
let _chartMasc = null;
let _chartTop = null;
let _clientes = [];

// ==========================================
// TABS & MODALS
// ==========================================
window.switchTab = (tabId) => {
    document.getElementById('tab-content-clientes').classList.add('hidden');
    document.getElementById('tab-content-dashboard').classList.add('hidden');
    document.getElementById('tab-btn-clientes').classList.remove('text-indigo-600', 'border-indigo-600');
    document.getElementById('tab-btn-clientes').classList.add('text-slate-500', 'border-transparent');
    document.getElementById('tab-btn-dashboard').classList.remove('text-indigo-600', 'border-indigo-600');
    document.getElementById('tab-btn-dashboard').classList.add('text-slate-500', 'border-transparent');
    
    const content = document.getElementById(`tab-content-${tabId}`);
    const btn = document.getElementById(`tab-btn-${tabId}`);
    
    if (content) content.classList.remove('hidden');
    if (btn) {
        btn.classList.remove('text-slate-500', 'border-transparent');
        btn.classList.add('text-indigo-600', 'border-indigo-600');
    }

    if (tabId === 'dashboard') {
        cargarDashboard();
    } else {
        cargarClientes();
    }
};

window.openModal = (id) => {
    const modal = document.getElementById(id);
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.firstElementChild.classList.remove('scale-95');
    }
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.firstElementChild.classList.add('scale-95');
    }
};

window.openModalCliente = (mode, cc_nit = null) => {
    const titulo = document.querySelector('#modal-cliente h3');
    const ccInput = document.getElementById('f-cc-nit');
    
    document.getElementById('form-cliente').reset();
    document.getElementById('form-cliente-msg').innerHTML = '';

    if (mode === 'add') {
        document.getElementById('form-action').value = 'add_client';
        document.getElementById('f-original-cc-nit').value = '';
        titulo.innerText = '➕ Nuevo Cliente B2B';
        ccInput.readOnly = false;
        ccInput.classList.remove('bg-slate-100', 'cursor-not-allowed');
        
        document.getElementById('redes-container').innerHTML = '';
        agregarFilaRedSocial();
        
        document.getElementById('f-logo').value = '';
        document.getElementById('logo-preview-img').classList.add('hidden');
        document.getElementById('logo-preview-placeholder').classList.remove('hidden');
    } else {
        const cliente = _clientes.find(c => c.cc_nit === cc_nit);
        if (!cliente) return;
        
        document.getElementById('form-action').value = 'update_client';
        document.getElementById('f-original-cc-nit').value = cliente.cc_nit;
        titulo.innerText = `✏️ Editar: ${cliente.negocio}`;
        
        document.getElementById('f-negocio').value = cliente.negocio || '';
        document.getElementById('f-contacto').value = cliente.contacto || '';
        document.getElementById('f-cc-nit').value = cliente.cc_nit || '';
        document.getElementById('f-celular').value = cliente.celular || '';
        document.getElementById('f-correo').value = cliente.correo || '';
        document.getElementById('f-direccion').value = cliente.direccion || '';
        document.getElementById('f-ciudad').value = cliente.ciudad || '';
        document.getElementById('f-sitioweb').value = cliente.sitio_web || '';
        
        const redesContainer = document.getElementById('redes-container');
        redesContainer.innerHTML = '';
        if (cliente.redes) {
            try {
                const redesArr = JSON.parse(cliente.redes);
                if (Array.isArray(redesArr)) {
                    redesArr.forEach(r => agregarFilaRedSocial(r.tipo, r.url));
                }
            } catch(e) {
                // Soporte a cadenas antiguas
                agregarFilaRedSocial(cliente.tipo_red || 'Instagram', cliente.redes);
            }
        } else {
            agregarFilaRedSocial();
        }

        document.getElementById('f-logo').value = '';
        const img = document.getElementById('logo-preview-img');
        const placeholder = document.getElementById('logo-preview-placeholder');
        if (cliente.url_image) {
            img.src = cliente.url_image;
            img.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            img.src = '';
            img.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
        
        ccInput.readOnly = false;
        ccInput.classList.remove('bg-slate-100', 'cursor-not-allowed');
        
        const tipoRadio = document.querySelector(`input[name="tipo_establecimiento"][value="${cliente.tipo_establecimiento}"]`);
        if (tipoRadio) {
            tipoRadio.checked = true;
        }
    }
    openModal('modal-cliente');
};

window.previewLogo = (event) => {
    const file = event.target.files[0];
    const img = document.getElementById('logo-preview-img');
    const placeholder = document.getElementById('logo-preview-placeholder');
    if (file) {
        img.src = URL.createObjectURL(file);
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.src = '';
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
};

window.agregarFilaRedSocial = (tipo = 'Instagram', url = '') => {
    const container = document.getElementById('redes-container');
    const row = document.createElement('div');
    row.className = "flex gap-2 items-center row-red-social";
    row.innerHTML = `
        <select class="p-3 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none w-1/3 bg-white field-tipo-red">
            <option value="Instagram" ${tipo === 'Instagram' ? 'selected' : ''}>Instagram</option>
            <option value="Facebook" ${tipo === 'Facebook' ? 'selected' : ''}>Facebook</option>
            <option value="TikTok" ${tipo === 'TikTok' ? 'selected' : ''}>TikTok</option>
            <option value="LinkedIn" ${tipo === 'LinkedIn' ? 'selected' : ''}>LinkedIn</option>
            <option value="Twitter/X" ${tipo === 'Twitter/X' ? 'selected' : ''}>Twitter/X</option>
        </select>
        <input type="text" class="p-3 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none w-full field-url-red" placeholder="@usuario o https://..." value="${url}">
        <button type="button" class="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" onclick="this.parentElement.remove()" title="Quitar">✖</button>
    `;
    container.appendChild(row);
};

// ==========================================
// DATA FETCHING (GAS)
// ==========================================
async function cargarCiudades() {
    try {
        const { data, error } = await window.dbs.cod_ciudades.from('cod_ciudades').select('*');
        if (error) throw error;
        const select = document.getElementById('f-ciudad');
        if (select && data) {
            select.innerHTML = '<option value="">Seleccione una ciudad...</option>' + 
                data.map(c => {
                    const cd = c['Ciudad'] || c['ciudad'] || '';
                    return `<option value="${cd}">${cd}</option>`;
                }).join('');
        }
    } catch(err) {
        console.error("Error cargando ciudades", err);
    }
}

async function cargarClientes() {
    const tbody = document.getElementById('tbody-clientes');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-slate-400">Cargando directorio desde Supabase...</td></tr>`;
    
    try {
        const { data, error } = await window.dbs.clientes_b2b.from('clientes_b2b').select('*');
        if (error) throw error;
        
        _clientes = (data || []).map(c => ({
            negocio: c['negocio'],
            contacto: c['contacto'],
            cc_nit: c['cc_nit']?.toString(),
            celular: c['celular']?.toString(),
            correo: c['correo'],
            tipo_establecimiento: c['canales'],
            fecha_registro: c['creado_en'],
            direccion: c['direccion'],
            ciudad: c['ciudad'],
            sitio_web: c['sitio_web'],
            redes: c['redes'],
            tipo_red: c['tipo_red'],
            url_image: c['url_image']
        }));
        renderClientes(_clientes);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-rose-500">Error de conexión al servidor</td></tr>`;
    }
}

async function cargarDashboard() {
    try {
        // Fetch base data to compute stats
        const [ { data: usuarios }, { data: reclamados }, { count: totalCupones } ] = await Promise.all([
            window.dbs.usuarios.from('usuarios').select('*'),
            window.dbs.cupones_reclamados.from('cupones_reclamados').select('*'),
            window.dbs.cupones_generados.from('cupones_generados').select('*', { count: 'exact', head: true })
        ]);

        const stats = {
            total_usuarios: usuarios?.length || 0,
            total_reclamaciones: reclamados?.length || 0,
            total_cupones: totalCupones || 0,
            por_ciudad: {},
            por_mascota: {},
            top_cupones: []
        };

        // Compute aggregations
        if (usuarios) {
            usuarios.forEach(u => {
                const ciudad = u['Ciudad'] || u['ciudad'] || 'Otro';
                const mascota = u['Mascota'] || 'Otro';
                stats.por_ciudad[ciudad] = (stats.por_ciudad[ciudad] || 0) + 1;
                stats.por_mascota[mascota] = (stats.por_mascota[mascota] || 0) + 1;
            });
        }
        
        if (reclamados) {
            const counts = {};
            reclamados.forEach(r => {
                const id = r['Cupon ID'];
                counts[id] = (counts[id] || 0) + 1;
            });
            stats.top_cupones = Object.keys(counts)
                .map(id => ({ titulo: id, count: counts[id] }))
                .sort((a, b) => b.count - a.count);
        }

        renderDashboard(stats);
    } catch (err) {
        console.error('Error cargando dashboard', err);
    }
}

// ==========================================
// RENDERING
// ==========================================
function renderClientes(lista) {
    const tbody = document.getElementById('tbody-clientes');
    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-slate-400">No hay clientes registrados en la base de datos</td></tr>`;
        return;
    }

    const TIPO_NEGOCIO_MAP = {
        "Veterinaria":    { bg: "bg-blue-50", color: "text-blue-700" },
        "Peluquería Pet": { bg: "bg-purple-50", color: "text-purple-700" },
        "Petshop":        { bg: "bg-emerald-50", color: "text-emerald-700" },
        "Otro Comercio":  { bg: "bg-slate-50", color: "text-slate-700" },
    };

    tbody.innerHTML = lista.map(c => {
        const tipoStyle = TIPO_NEGOCIO_MAP[c.tipo_establecimiento] || { bg: "bg-slate-50", color: "text-slate-700" };
        const cc = c.cc_nit || c.nit || '-';
        const url_compartir = `${window.location.origin}/cliente.html?b2b=${cc}`;
        
        return `
        <tr class="hover:bg-slate-50/50 transition-colors">
          <td class="p-4 font-bold text-slate-900">${c.negocio || '-'}</td>
          <td class="p-4 text-slate-600 font-medium">${c.contacto || '-'}</td>
          <td class="p-4 text-slate-500 font-mono text-sm">${cc}</td>
          <td class="p-4 text-slate-600 text-sm">
            <div class="font-medium">${c.celular || '-'}</div>
            <div class="text-xs text-slate-400">${c.correo || '-'}</div>
          </td>
          <td class="p-4">
            <span class="${tipoStyle.bg} ${tipoStyle.color} px-3 py-1 rounded-full text-xs font-bold border border-current/10">${c.tipo_establecimiento || 'Otro'}</span>
          </td>
          <td class="p-4 text-slate-400 text-xs">${c.fecha_registro || '-'}</td>
          <td class="p-4">
            <div class="flex items-center justify-center gap-2">
              <button onclick="openModalCliente('edit', '${cc}')" class="p-2 bg-slate-50 text-slate-500 hover:bg-slate-800 hover:text-white rounded-lg transition-colors shadow-sm" title="Editar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button onclick="eliminarCliente('${cc}', '${(c.negocio || '').replace(/'/g, "\\'")}')" class="p-2 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-colors shadow-sm" title="Eliminar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
              <button onclick="copiarUrl('${url_compartir}')" class="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors shadow-sm" title="Copiar enlace B2B">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
            </div>
          </td>
        </tr>
        `;
    }).join("");
}

window.filtrarClientes = () => {
    const txt = document.getElementById('search-clientes').value.toLowerCase();
    const filtrados = _clientes.filter(c => 
        (c.negocio || '').toLowerCase().includes(txt) || 
        (c.contacto || '').toLowerCase().includes(txt) ||
        (c.cc_nit || '').toLowerCase().includes(txt)
    );
    renderClientes(filtrados);
};

window.copiarUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
        alert("Enlace B2B único copiado al portapapeles:\n" + url);
    }).catch(err => {
        alert("No se pudo copiar el enlace automáticamente. \nCópielo manualmente: " + url);
    });
};

// ==========================================
// CRUD OPERATIONS
// ==========================================
window.guardarCliente = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-cliente');
    const msg = document.getElementById('form-cliente-msg');
    const action = document.getElementById('form-action').value;
    const cc_nit = parseInt(document.getElementById('f-cc-nit').value.trim());
    
    btn.disabled = true;
    btn.innerHTML = `⏳ Guardando...`;
    msg.className = "text-sm text-center font-medium mt-2 text-indigo-600";
    msg.innerText = "Procesando...";

    const redesElements = document.querySelectorAll('.row-red-social');
    const redesArray = [];
    redesElements.forEach(row => {
        const tipo = row.querySelector('.field-tipo-red').value;
        const url = row.querySelector('.field-url-red').value.trim();
        if (url) redesArray.push({ tipo, url });
    });
    
    const redesStr = JSON.stringify(redesArray);

    try {
        const logoFile = document.getElementById('f-logo').files[0];
        let uploadedLogoUrl = null;
        if (logoFile) {
            msg.innerText = "Subiendo logo...";
            const ext = logoFile.name.split('.').pop();
            const filePath = `${cc_nit}_${Date.now()}.${ext}`;
            const { error: uploadError } = await window.dbs.clientes_b2b.storage
                .from('logos_b2b')
                .upload(filePath, logoFile, { cacheControl: '3600', upsert: false });
            
            if (uploadError) throw uploadError;
            
            const { data: publicUrlData } = window.dbs.clientes_b2b.storage
                .from('logos_b2b')
                .getPublicUrl(filePath);
            uploadedLogoUrl = publicUrlData.publicUrl;
        }

        msg.innerText = "Guardando en base de datos...";

        const payload = {
            'negocio': document.getElementById('f-negocio').value.trim(),
            'contacto': document.getElementById('f-contacto').value.trim(),
            'cc_nit': cc_nit,
            'celular': parseInt(document.getElementById('f-celular').value.trim()),
            'correo': document.getElementById('f-correo').value.trim(),
            'canales': document.querySelector('input[name="tipo_establecimiento"]:checked').value,
            'direccion': document.getElementById('f-direccion').value.trim(),
            'ciudad': document.getElementById('f-ciudad').value,
            'sitio_web': document.getElementById('f-sitioweb').value.trim(),
            'redes': redesStr
        };

        if (action === 'add_client') {
            payload['creado_en'] = new Date().toLocaleDateString('es-CO');
        }

        if (uploadedLogoUrl) payload['url_image'] = uploadedLogoUrl;
        if (redesArray.length > 0) payload['tipo_red'] = redesArray[0].tipo;
        
        let result;
        if (action === 'add_client') {
            result = await window.dbs.clientes_b2b.from('clientes_b2b').insert([payload]);
        } else {
            // Update client
            const originalCC = parseInt(document.getElementById('f-original-cc-nit').value.trim());
            result = await window.dbs.clientes_b2b.from('clientes_b2b')
                .update(payload)
                .eq('cc_nit', originalCC);
        }

        if (result.error) throw result.error;

        msg.className = "text-sm text-center font-bold mt-2 text-emerald-600";
        msg.innerText = action === 'add_client' ? "✅ Cliente B2B guardado correctamente." : "✅ Cliente B2B actualizado correctamente.";
        document.getElementById('form-cliente').reset();
        setTimeout(() => {
            closeModal('modal-cliente');
            cargarClientes(); // Recargar la tabla automáticamente
            msg.innerText = "";
        }, 1500);
    } catch (err) {
        msg.className = "text-sm text-center font-bold mt-2 text-rose-500";
        msg.innerText = "❌ Error al guardar: " + err.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `💾 Guardar Cliente`;
    }
};

window.eliminarCliente = async (cc_nit, nombre) => {
    if (!confirm(`¿Eliminar el cliente "${nombre}" (${cc_nit})?\nEsta acción no se puede deshacer.`)) return;
    
    try {
        const { error } = await window.dbs.clientes_b2b.from('clientes_b2b')
            .delete()
            .eq('cc_nit', parseInt(cc_nit));
            
        if (error) throw error;
        cargarClientes();
    } catch (err) {
        alert("Error al eliminar: " + err.message);
    }
};

// ==========================================
// CHARTS & KPIS
// ==========================================
function renderDashboard(stats) {
    // 1. KPIs (ajustado a las propiedades originales del backend)
    document.getElementById('kpi-usuarios').innerText = stats.total_usuarios || 0;
    document.getElementById('kpi-reclamaciones').innerText = stats.total_reclamaciones || 0;
    document.getElementById('kpi-cupones').innerText = stats.total_cupones || 0;
    document.getElementById('kpi-clientes').innerText = _clientes.length || 0;

    // 2. Destruir gráficos previos si existen
    if(_chartCiud) _chartCiud.destroy();
    if(_chartMasc) _chartMasc.destroy();
    if(_chartTop) _chartTop.destroy();

    const chartConfig = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { family: "'Inter', sans-serif" } } } }
    };

    // Gráfico Ciudades
    const ctxCiud = document.getElementById('chart-ciudades');
    if(ctxCiud && stats.por_ciudad) {
        _chartCiud = new Chart(ctxCiud, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.por_ciudad),
                datasets: [{ data: Object.values(stats.por_ciudad), backgroundColor: ['#4f46e5', '#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e'] }]
            },
            options: chartConfig
        });
    }

    // Gráfico Mascotas
    const ctxMasc = document.getElementById('chart-mascotas');
    if(ctxMasc && stats.por_mascota) {
        _chartMasc = new Chart(ctxMasc, {
            type: 'pie',
            data: {
                labels: Object.keys(stats.por_mascota),
                datasets: [{ data: Object.values(stats.por_mascota), backgroundColor: ['#f59e0b', '#10b981', '#64748b'] }]
            },
            options: chartConfig
        });
    }

    // Gráfico Top Cupones
    const ctxTop = document.getElementById('chart-top-cupones');
    if(ctxTop && stats.top_cupones) {
        const topArray = stats.top_cupones.slice(0, 5);
        _chartTop = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: topArray.map(c => c.titulo.length > 28 ? c.titulo.slice(0,28)+'…' : c.titulo),
                datasets: [{ label: 'Veces reclamado', data: topArray.map(c => c.count), backgroundColor: '#4f46e5', borderRadius: 4 }]
            },
            options: { ...chartConfig, indexAxis: 'y' }
        });
    }
}

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarCiudades();
    // Interceptar login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('dashboard-view').classList.remove('hidden');
            
            // Cargar datos reales al entrar
            cargarClientes();
        });
    }
});