// Variables globales
let pedidoSeleccionado = null;

// 1. Cargar información del usuario desde localStorage
document.addEventListener('DOMContentLoaded', function() {
    // Obtener datos de sesión
    const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    // Mostrar información del usuario
    if (userSession.username) {
        document.getElementById('userName').textContent = userSession.nombre || userSession.username;
        document.getElementById('userRole').textContent = userSession.cargo || userSession.role || 'Cargo no definido';
        document.getElementById('userSede').textContent = userSession.sede || 'Sede no definida';
        document.getElementById('responsable').value = userSession.nombre || userSession.username;
        document.getElementById('responsable').readOnly = true;
        
        // Cambiar nombre del restaurante y logo según la sede
        if (userSession.sede === 'FILANDIA') {
            document.querySelector('.restaurant-name').textContent = 'Meson de Piedra Campestre';
            document.getElementById('restaurantLogo').src = 'img/logoMP.png';
        } else {
            document.querySelector('.restaurant-name').textContent = 'La Portada Campestre';
            document.getElementById('restaurantLogo').src = 'img/logoSR.png';
        }
    }

    // 2. Cargar datos de la API para los selectores
    cargarDatosInventario();

    // Configurar eventos
    configurarEventos();
});

// 2. Función para cargar datos de inventario desde la API
async function cargarDatosInventario() {
    try {
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const sedeUsuario = userSession.sede || '';
        
        const apiUrl = `https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec?api=articulos&sede=ALL,${sedeUsuario}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error de red: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.data) {
            throw new Error("No se recibieron datos válidos de la API");
        }

        // Filtrar solo los artículos ACTIVOS
        const articulosActivos = data.data.filter(item => 
            item.ESTADO === 'ACTIVO' && 
            (item.SEDE === 'ALL' || item.SEDE === sedeUsuario)
        );

        if (articulosActivos.length === 0) {
            throw new Error("No hay artículos ACTIVOS disponibles para la sede");
        }

        // Guardar los artículos filtrados para uso posterior
        window.articulosData = {
            articulos: articulosActivos,
            campos: {
                tipo: 'TIPO',
                categoria: 'CATEGORIA',
                item: 'ITEM',
                modelo: 'MODELO',
                sede: 'SEDE',
                estado: 'ESTADO'
            }
        };

        // Llenar el selector de tipos
        llenarTipos();

    } catch (error) {
        console.error('Error al cargar datos de inventario:', error);
        alert('Error al cargar datos de inventario: ' + error.message);
    }
}

// Función para llenar el selector de tipos
function llenarTipos() {
    if (!window.articulosData || !window.articulosData.articulos) return;

    const tipoSelect = document.getElementById('tipoInventario');
    tipoSelect.innerHTML = '<option value="" disabled selected>Selecciona un tipo</option>';
    
    // Extraer tipos únicos
    const tiposUnicos = [...new Set(
        window.articulosData.articulos.map(item => item.TIPO).filter(Boolean)
    )];

    tiposUnicos.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        tipoSelect.appendChild(option);
    });

    // Configurar evento para cuando se seleccione un tipo
    tipoSelect.addEventListener('change', function() {
        const tipoSeleccionado = this.value;
        llenarCategorias(tipoSeleccionado);
    });
}

// Función para llenar categorías basado en el tipo seleccionado
function llenarCategorias(tipoSeleccionado) {
    if (!window.articulosData || !window.articulosData.articulos) return;

    const categoriaSelect = document.getElementById('categoria');
    categoriaSelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
    
    // Filtrar categorías por tipo seleccionado
    const categoriasFiltradas = window.articulosData.articulos
        .filter(item => item.TIPO === tipoSeleccionado)
        .map(item => item.CATEGORIA)
        .filter(Boolean);

    const categoriasUnicas = [...new Set(categoriasFiltradas)];

    if (categoriasUnicas.length > 0) {
        categoriasUnicas.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            categoriaSelect.appendChild(option);
        });
        categoriaSelect.disabled = false;
    } else {
        categoriaSelect.disabled = true;
    }

    // Configurar evento para cuando se seleccione una categoría
    categoriaSelect.addEventListener('change', function() {
        const categoriaSeleccionada = this.value;
        llenarItems(tipoSeleccionado, categoriaSeleccionada);
    });

    // Resetear items y modelo
    document.getElementById('item').innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    document.getElementById('item').disabled = true;
    document.getElementById('modelo').value = '';
    document.getElementById('presentacion').innerHTML = '<option value="" disabled selected>Selecciona la presentación</option>';
    document.getElementById('presentacion').disabled = true;
}

// Función para llenar items basado en tipo y categoría seleccionados
function llenarItems(tipoSeleccionado, categoriaSeleccionada) {
    if (!window.articulosData || !window.articulosData.articulos) return;

    const itemSelect = document.getElementById('item');
    itemSelect.innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    
    // Filtrar items por tipo y categoría seleccionados
    const itemsFiltrados = window.articulosData.articulos
        .filter(item => 
            item.TIPO === tipoSeleccionado && 
            item.CATEGORIA === categoriaSeleccionada
        )
        .map(item => item.ITEM)
        .filter(Boolean);

    const itemsUnicos = [...new Set(itemsFiltrados)];

    if (itemsUnicos.length > 0) {
        itemsUnicos.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            itemSelect.appendChild(option);
        });
        itemSelect.disabled = false;
    } else {
        itemSelect.disabled = true;
    }

    // Configurar evento para cuando se seleccione un item
    itemSelect.addEventListener('change', function() {
        const itemSeleccionado = this.value;
        llenarModelos(tipoSeleccionado, categoriaSeleccionada, itemSeleccionado);
    });

    // Resetear modelo y presentación
    document.getElementById('modelo').value = '';
    document.getElementById('presentacion').innerHTML = '<option value="" disabled selected>Selecciona la presentación</option>';
    document.getElementById('presentacion').disabled = true;
}

// Función para llenar modelos basado en tipo, categoría e item seleccionados
function llenarModelos(tipoSeleccionado, categoriaSeleccionada, itemSeleccionado) {
    if (!window.articulosData || !window.articulosData.articulos) return;

    const modeloInput = document.getElementById('modelo');
    modeloInput.value = '';
    modeloInput.readOnly = true;
    
    // Filtrar artículos que coincidan con tipo, categoría e item
    const articulosFiltrados = window.articulosData.articulos.filter(item => 
        item.TIPO === tipoSeleccionado && 
        item.CATEGORIA === categoriaSeleccionada && 
        item.ITEM === itemSeleccionado
    );

    // Extraer modelos únicos
    const modelosUnicos = [...new Set(
        articulosFiltrados.map(item => item.MODELO).filter(Boolean)
    )];

    // Si hay modelos disponibles
    if (modelosUnicos.length > 0) {
        modeloInput.value = modelosUnicos[0];
        habilitarPresentacion(modelosUnicos[0]);
    } else {
        modeloInput.placeholder = "No hay modelo disponible";
    }
}

// Función para habilitar el selector de presentación basado en el modelo seleccionado
function habilitarPresentacion(modelo) {
    if (!modelo) return;

    const presentacionSelect = document.getElementById('presentacion');
    const presentacionContainer = document.getElementById('presentacionContainer');
    presentacionSelect.innerHTML = '<option value="" disabled selected>Selecciona la presentación</option>';
    
    // Convertir modelo a mayúsculas para comparación
    const modeloUpper = modelo.toUpperCase();
    
    // Si el modelo es UNIDAD, establecer presentación automáticamente
    if (modeloUpper === 'UNIDAD') {
        presentacionContainer.style.display = 'none';
        
        // Limpiar y establecer la opción UNIDAD automáticamente
        presentacionSelect.innerHTML = '';
        const unidadOption = document.createElement('option');
        unidadOption.value = '1';
        unidadOption.textContent = 'UNIDAD';
        unidadOption.dataset.factor = 1;
        unidadOption.selected = true;
        presentacionSelect.appendChild(unidadOption);
        
        presentacionSelect.disabled = true;
        return;
    }
    
    // Mostrar el contenedor para otros modelos
    presentacionContainer.style.display = 'block';
    
    // Resto de la lógica para llenar presentaciones...
    let presentacionesEncontradas = false;
    
    // Primero intentar con el modelo exacto
    if (presentacionesPorModelo[modeloUpper]) {
        const presentaciones = presentacionesPorModelo[modeloUpper];
        presentaciones.forEach(presentacion => {
            const option = document.createElement('option');
            option.value = presentacion.value;
            option.textContent = presentacion.text;
            option.dataset.factor = presentacion.factor;
            presentacionSelect.appendChild(option);
        });
        presentacionesEncontradas = true;
    } else {
        // Si no se encuentra el modelo exacto, buscar coincidencias parciales
        for (const key in presentacionesPorModelo) {
            if (modeloUpper.includes(key) || key.includes(modeloUpper)) {
                const presentaciones = presentacionesPorModelo[key];
                presentaciones.forEach(presentacion => {
                    const option = document.createElement('option');
                    option.value = presentacion.value;
                    option.textContent = presentacion.text;
                    option.dataset.factor = presentacion.factor;
                    presentacionSelect.appendChild(option);
                });
                presentacionesEncontradas = true;
                break;
            }
        }
    }
    
    // Si no se encontraron presentaciones específicas
    if (!presentacionesEncontradas) {
        alert(`No hay presentaciones definidas para el ITEM con MODELO: ${modelo}`);
        
        // Agregar opción NO APLICA como respaldo
        const noAplicaOption = document.createElement('option');
        noAplicaOption.value = 'no_aplica';
        noAplicaOption.textContent = 'NO APLICA';
        noAplicaOption.dataset.factor = 1;
        noAplicaOption.selected = true;
        presentacionSelect.appendChild(noAplicaOption);            
    }
    
    presentacionSelect.disabled = false;
}

// Función para enviar datos a la API
async function enviarDatosAPI() {
    try {
        // Mostrar animación de carga
        let exitoModal = document.getElementById('exito');
        
        if (!exitoModal) {
            exitoModal = document.createElement('div');
            exitoModal.id = 'exito';
            exitoModal.className = 'overlay';
            document.body.appendChild(exitoModal);
        }
        
        exitoModal.innerHTML = `
            <div class="overlay-animation">
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>Guardando ingreso...</p>
                </div>
            </div>
        `;
        exitoModal.style.display = 'flex';
        
        // Obtener datos del usuario
        const userData = JSON.parse(localStorage.getItem('userSession') || '{}');
        
        // Preparar datos para enviar
        const presentacionSelect = document.getElementById('presentacion');
        
        const ingreso = {
            sede: userData.sede,
            tipo: document.getElementById('tipoInventario').value,
            categoria: document.getElementById('categoria').value,            
            modelo: document.getElementById('modelo').value,
            presentacion: presentacionSelect.options[presentacionSelect.selectedIndex].text.trim(),
            cantidad: parseInt(document.getElementById('cantidad').value),
            item: document.getElementById('item').value,
            cantidadTotal: parseInt(document.getElementById('cantidad').value) * 
                  parseFloat(presentacionSelect.options[presentacionSelect.selectedIndex].dataset.factor) || 1,        
            responsable: document.getElementById('responsable').value,
            pedido: document.getElementById('pedido').value,            
            vencimiento: document.getElementById('noAplicaFecha').checked ? 'NO APLICA' : document.getElementById('fechaVenc').value,
            observaciones: document.getElementById('observaciones').value.trim(),
        };
        
        const scriptURL = 'https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec';
        
        const response = await fetch(scriptURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                api: 'ingresos',
                accion: 'guardar',
                ingreso: ingreso
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.statusText}`);
        }
        
        const resultado = await response.json();
        
        // Mostrar mensaje de éxito
        exitoModal.innerHTML = `
            <div class="overlay-animation">
                <div class="success-container">
                    <div class="success-checkmark">
                        <div class="check-icon"></div>
                    </div>
                    <p>Ingreso Guardado Correctamente</p>
                    <div class="ingreso-id">
                        <span class="id-label">ID:</span>
                        <span class="id-value">${resultado.id || 'No disponible'}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Cerrar automáticamente después de 2 segundos
        setTimeout(() => {
            if (exitoModal) {
                exitoModal.style.display = 'none';
            }
            
            // Cerrar modal de confirmación si existe
            const confirmacionModal = document.getElementById('confirmacion');
            if (confirmacionModal) {
                confirmacionModal.style.display = 'none';
            }
            
            // Resetear formulario
            resetearFormulario();
        }, 2000);
        
        return resultado;
    } catch (error) {
        console.error('Error al guardar el ingreso:', error);
        const exitoModal = document.getElementById('exito');
        if (exitoModal) {
            exitoModal.style.display = 'none';
        }
        alert('Error al guardar el ingreso: ' + error.message);
    }
}

// Función para resetear el formulario
function resetearFormulario() {
    document.getElementById('tipoInventario').selectedIndex = 0;
    
    const categoriaSelect = document.getElementById('categoria');
    categoriaSelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
    categoriaSelect.disabled = true;
    
    const itemSelect = document.getElementById('item');
    itemSelect.innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    itemSelect.disabled = true;
    
    document.getElementById('modelo').value = '';
    document.getElementById('presentacion').innerHTML = '<option value="" disabled selected>Selecciona la presentación</option>';
    document.getElementById('presentacion').disabled = true;
    document.getElementById('cantidad').value = '';
    document.getElementById('pedido').value = '';
    document.getElementById('fechaVenc').value = '';
    document.getElementById('observaciones').value = '';
    document.getElementById('noAplicaFecha').checked = false;
    document.getElementById('fechaVenc').disabled = false;
}

// Función para configurar eventos
function configurarEventos() {
    // Configurar el campo modelo como solo lectura
    document.getElementById('modelo').readOnly = true;
    
    // Configurar checkbox NO APLICA
    configurarNoAplicaFecha();
    
    // Configurar botón de guardar
    const guardarBtn = document.getElementById('guardarBtn');
    if (guardarBtn) {
        guardarBtn.addEventListener('click', guardarIngreso);
    } else {
        console.error('No se encontró el botón de guardar con ID "guardarBtn"');
    }
    
    // Configurar botones de confirmación (solo una vez)
    document.getElementById('confirmarBtn').addEventListener('click', enviarDatosAPI);
    document.getElementById('cancelarConfirmacionBtn').addEventListener('click', function() {
        document.getElementById('confirmacion').style.display = 'none';
    });
    
    // Configurar botones de cerrar sesión
    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
    document.getElementById('confirmarSalirBtn').addEventListener('click', confirmarCerrarSesion);
    document.getElementById('cancelarSalirBtn').addEventListener('click', function() {
        document.getElementById('salir').style.display = 'none';
    });
    
    // Configurar botón de selección de pedido
    document.getElementById('seleccionarPedidoBtn').addEventListener('click', abrirModalPedidos);
    document.getElementById('cerrarModalPedidosBtn').addEventListener('click', cerrarModalPedidos);
}

// Función para controlar la fecha de vencimiento con el checkbox NO APLICA
function configurarNoAplicaFecha() {
    const noAplicaCheckbox = document.getElementById('noAplicaFecha');
    const fechaInput = document.getElementById('fechaVenc');
    
    noAplicaCheckbox.addEventListener('change', function() {
        if (this.checked) {
            fechaInput.disabled = true;
            fechaInput.value = '';
            document.getElementById('errorFechaVenc').style.display = 'none';
        } else {
            fechaInput.disabled = false;
        }
    });
}

// Función para guardar ingreso
function guardarIngreso() {
    // Validar campos requeridos
    const tipoInventario = document.getElementById('tipoInventario');
    const categoria = document.getElementById('categoria');
    const item = document.getElementById('item');
    const modelo = document.getElementById('modelo');
    const presentacionSelect = document.getElementById('presentacion');
    const cantidad = document.getElementById('cantidad');
    const pedido = document.getElementById('pedido');
    const fechaVenc = document.getElementById('fechaVenc');
    const noAplicaFecha = document.getElementById('noAplicaFecha');
    const responsable = document.getElementById('responsable');
    
    // Resetear mensajes de error
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    
    // Validar campos
    let isValid = true;
    
    if (!tipoInventario.value) {
        const errorTipo = document.getElementById('errorTipo');
        if (errorTipo) errorTipo.style.display = 'block';
        isValid = false;
    }
    
    if (!categoria.value) {
        const errorCategoria = document.getElementById('errorCategoria');
        if (errorCategoria) errorCategoria.style.display = 'block';
        isValid = false;
    }
    
    if (!item.value) {
        const errorItem = document.getElementById('errorItem');
        if (errorItem) errorItem.style.display = 'block';
        isValid = false;
    }
    
    if (!modelo.value) {
        const errorModelo = document.getElementById('errorModelo');
        if (errorModelo) errorModelo.style.display = 'block';
        isValid = false;
    }    
    
    if (modelo.value.toUpperCase() !== 'UNIDAD' && !presentacionSelect.value) {
        const errorPresentacion = document.getElementById('errorPresentacion');
        if (errorPresentacion) errorPresentacion.style.display = 'block';
        isValid = false;
    }
    
    if (!cantidad.value || isNaN(cantidad.value) || parseInt(cantidad.value) <= 0) {
        const errorCantidad = document.getElementById('errorCantidad');
        if (errorCantidad) errorCantidad.style.display = 'block';
        isValid = false;
    }
    
    if (!pedido.value) {
        const errorPedido = document.getElementById('errorPedido');
        if (errorPedido) errorPedido.style.display = 'block';
        isValid = false;
    }
    
    if (!noAplicaFecha.checked && !fechaVenc.value) {
        const errorFechaVenc = document.getElementById('errorFechaVenc');
        if (errorFechaVenc) errorFechaVenc.style.display = 'block';
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Calcular cantidad total
    const selectedOption = presentacionSelect.options[presentacionSelect.selectedIndex];
    const factorPresentacion = parseFloat(selectedOption.dataset.factor) || 1;
    const cantidadIngresada = parseFloat(cantidad.value);
    const cantidadTotal = Math.floor(cantidadIngresada * factorPresentacion);
    
    // Mostrar modal de confirmación
    const confirmacionModal = document.getElementById('confirmacion');
    const contentDiv = document.getElementById('confirmacionContent');
    
    // Actualizar solo el contenido dinámico (sin incluir botones)
    contentDiv.innerHTML = `
        <div class="detalle-item">
            <div class="detalle-label">Tipo:</div>
            <div class="detalle-valor">${tipoInventario.value}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Categoría:</div>
            <div class="detalle-valor">${categoria.value}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Item:</div>
            <div class="detalle-valor">${item.value}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Modelo:</div>
            <div class="detalle-valor">${modelo.value}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Presentación:</div>
            <div class="detalle-valor">${selectedOption.text}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Cantidad:</div>
            <div class="detalle-valor">${cantidadIngresada}</div>
        </div>            
        <div class="detalle-item">
            <div class="detalle-label">Cantidad Total:</div>
            <div class="detalle-valor detalle-destacado">${cantidadTotal} unidades</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Pedido:</div>
            <div class="detalle-valor">${pedido.value}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Responsable:</div>
            <div class="detalle-valor">${responsable.value}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Sede:</div>
            <div class="detalle-valor">${JSON.parse(localStorage.getItem('userSession') || '{}').sede || 'No definida'}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Vencimiento:</div>
            <div class="detalle-valor">${noAplicaFecha.checked ? 'NO APLICA' : fechaVenc.value}</div>
        </div>
    `;
    
    confirmacionModal.style.display = 'flex';
}

// Función para abrir el modal de pedidos
async function abrirModalPedidos() {
    const tipoSeleccionado = document.getElementById('tipoInventario').value;
    const categoriaSeleccionada = document.getElementById('categoria').value;
    
    if (!tipoSeleccionado || !categoriaSeleccionada) {
        alert('Por favor selecciona primero el Tipo y la Categoría');
        return;
    }
    
    try {
        // Mostrar el modal y el loader
        document.getElementById('modalPedidos').style.display = 'block';
        document.getElementById('pedidosLoader').style.display = 'block';
        document.getElementById('pedidosList').style.display = 'none';
        
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const sedeUsuario = userSession.sede;
        
        const response = await fetch('https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec?api=pedidos');
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Error al cargar los pedidos');
        }
        
        // Ocultar loader y mostrar lista
        document.getElementById('pedidosLoader').style.display = 'none';
        document.getElementById('pedidosList').style.display = 'block';
        
        // Filtrar pedidos por sede, estado y tipo/categoría
        const pedidosFiltrados = data.data.filter(pedido => 
            pedido.SEDE === sedeUsuario &&
            pedido.ESTADO === 'PENDIENTE' &&
            pedido.TIPO === tipoSeleccionado &&
            pedido.CATEGORIA === categoriaSeleccionada
        );
        
        const pedidosList = document.getElementById('pedidosList');
        pedidosList.innerHTML = '';
        
        if (pedidosFiltrados.length === 0) {
            pedidosList.innerHTML = '<div class="pedido-item">No hay pedidos pendientes para los criterios seleccionados</div>';
        } else {
            pedidosFiltrados.forEach(pedido => {
                const pedidoElement = document.createElement('div');
                pedidoElement.className = 'pedido-item';
                pedidoElement.innerHTML = `
                    <div class="pedido-titulo">${pedido.NRO_PEDIDO}</div>
                    <div class="pedido-subtitulo">${pedido.SEDE}</div>
                    <div class="pedido-detalle">Item: ${pedido.ITEM}</div>
                    <div class="pedido-detalle">Modelo: ${pedido.MODELO}</div>
                    <div class="pedido-detalle">Presentación: ${pedido.PRESENTACION}</div>
                    <div class="pedido-detalle">Cantidad: ${pedido.CANTIDAD}</div>
                    <div class="pedido-detalle">Fecha Pedido: ${formatearFecha(pedido.FECHAPED)}</div>
                `;
                
                pedidoElement.addEventListener('click', () => seleccionarPedido(pedido));
                pedidosList.appendChild(pedidoElement);
            });
        }
        
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        alert('Error al cargar los pedidos: ' + error.message);
        document.getElementById('pedidosLoader').style.display = 'none';
    }
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    const fechaStr = fecha.toString();
    const dia = fechaStr.substring(0, 2);
    const mes = fechaStr.substring(2, 4);
    const año = fechaStr.substring(4);
    return `${dia}/${mes}/${año}`;
}

function seleccionarPedido(pedido) {
    pedidoSeleccionado = pedido;
    document.getElementById('pedido').value = pedido.NRO_PEDIDO;
    document.getElementById('item').value = pedido.ITEM;
    document.getElementById('modelo').value = pedido.MODELO;
    document.getElementById('presentacion').value = pedido.PRESENTACION;
    document.getElementById('cantidad').value = pedido.CANTIDAD;
    
    cerrarModalPedidos();
}

function cerrarModalPedidos() {
    document.getElementById('modalPedidos').style.display = 'none';
}

function cerrarSesion() {
    document.getElementById('salir').style.display = 'flex';
}

function confirmarCerrarSesion() {
    localStorage.removeItem('userSession');
    window.location.href = 'index.html';
}