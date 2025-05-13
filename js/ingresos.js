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
    }

    // 2. Cargar datos de la API para los selectores
    cargarDatosInventario();

    // Configurar eventos
    configurarEventos();
});

// 2. Función para cargar datos de inventario desde la API
async function cargarDatosInventario() {
    try {
        // Usar la URL correcta para la API de Google Sheets
        const apiUrl = 'https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec?api=articulos';
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error de red: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Verificar si hay datos y mostrar la estructura para depuración
        if (data && typeof data === 'object') {
            // Intentar diferentes estructuras de datos posibles
            let articulos;
            
            // Opción 1: data.articulos (estructura esperada)
            if (data.articulos && Array.isArray(data.articulos)) {
                articulos = data.articulos;
            } 
            // Opción 2: data es un array directamente
            else if (Array.isArray(data)) {
                articulos = data;
            } 
            // Opción 3: data.data o data.items u otra propiedad común
            else if (data.data && Array.isArray(data.data)) {
                articulos = data.data;
            } 
            else if (data.items && Array.isArray(data.items)) {
                articulos = data.items;
            }
            // Opción 4: buscar cualquier propiedad que sea un array
            else {
                for (const key in data) {
                    if (Array.isArray(data[key]) && data[key].length > 0) {
                        articulos = data[key];
                        break;
                    }
                }
            }
            
            // Si no se encontró ningún array, intentar convertir el objeto a array
            if (!articulos && typeof data === 'object' && !Array.isArray(data)) {
                articulos = [data];
            }
            
            if (articulos && articulos.length > 0) {
                // Buscar las propiedades correctas para TIPO, CATEGORIA, ITEM, MODELO
                const primerArticulo = articulos[0];
                const propiedades = Object.keys(primerArticulo);
                
                // Mapeo de propiedades (nombres posibles para cada campo)
                const mapeo = {
                    tipo: ['tipo', 'TIPO', 'type', 'TYPE', 'Tipo'],
                    categoria: ['categoria', 'CATEGORIA', 'category', 'Categoria', 'CATEGORY'],
                    item: ['item', 'ITEM', 'nombre', 'NOMBRE', 'name', 'NAME', 'Item', 'producto', 'PRODUCTO'],
                    modelo: ['modelo', 'MODELO', 'model', 'MODEL', 'Modelo'],
                    sede: ['sede', 'SEDE', 'Sede', 'sucursal', 'SUCURSAL', 'Sucursal'],
                    estado: ['estado', 'ESTADO', 'Estado', 'status', 'STATUS', 'Status']
                };
                
                // Encontrar las propiedades correctas
                const camposEncontrados = {};
                
                for (const campo in mapeo) {
                    for (const posibleNombre of mapeo[campo]) {
                        if (propiedades.includes(posibleNombre)) {
                            camposEncontrados[campo] = posibleNombre;
                            break;
                        }
                    }
                    
                    if (!camposEncontrados[campo]) {
                        // Campo no encontrado
                    }
                }
                
                // Si no se encontraron los campos principales, mostrar error
                if (!camposEncontrados.tipo || !camposEncontrados.categoria || !camposEncontrados.item) {
                    throw new Error("La estructura de datos no contiene los campos necesarios (TIPO, CATEGORIA, ITEM)");
                }
                
                // Llenar tipo de inventario
                const tipoSelect = document.getElementById('tipoInventario');
                tipoSelect.innerHTML = '<option value="" disabled selected>Selecciona un tipo</option>';
                
                // Extraer tipos únicos usando la propiedad correcta
                const propTipo = camposEncontrados.tipo;
                const tiposUnicos = [...new Set(articulos
                    .map(item => item[propTipo])
                    .filter(tipo => tipo) // Filtrar valores nulos o undefined
                )];
                
                if (tiposUnicos.length > 0) {
                    tiposUnicos.forEach(tipo => {
                        const option = document.createElement('option');
                        option.value = tipo;
                        option.textContent = tipo;
                        tipoSelect.appendChild(option);
                    });
                    
                    // Guardar los artículos y las propiedades para uso posterior
                    window.articulosData = {
                        articulos: articulos,
                        campos: camposEncontrados
                    };
                    
                    // Configurar eventos para los selectores
                    tipoSelect.addEventListener('change', function() {
                        const tipoSeleccionado = this.value;
                        llenarCategorias(tipoSeleccionado);
                    });
                    
                    document.getElementById('categoria').addEventListener('change', function() {
                        const tipo = document.getElementById('tipoInventario').value;
                        const categoria = this.value;
                        llenarItems(tipo, categoria);
                    });
                    
                    document.getElementById('item').addEventListener('change', function() {
                        const tipo = document.getElementById('tipoInventario').value;
                        const categoria = document.getElementById('categoria').value;
                        const item = this.value;
                        llenarModelos(tipo, categoria, item);
                    });
                    
                    document.getElementById('modelo').addEventListener('change', function() {
                        const modelo = this.value;
                        habilitarPresentacion(modelo);
                    });
                } else {
                    throw new Error("No se encontraron tipos válidos en los artículos");
                }
            } else {
                throw new Error("No se encontraron artículos en la respuesta");
            }
        } else {
            throw new Error("La respuesta de la API no tiene el formato esperado");
        }
    } catch (error) {
        alert('Error al cargar datos de inventario: ' + error.message);
    }
}

// Actualizar las funciones para usar los campos guardados
function llenarCategorias(tipoSeleccionado) {
    if (!window.articulosData || !window.articulosData.articulos) {
        return;
    }
    
    const articulos = window.articulosData.articulos;
    const campos = window.articulosData.campos;
    const propTipo = campos.tipo;
    const propCategoria = campos.categoria;
    
    const categoriaSelect = document.getElementById('categoria');
    categoriaSelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
    
    const categoriasFiltradas = articulos
        .filter(item => item[propTipo] === tipoSeleccionado)
        .map(item => item[propCategoria]);
    
    const categoriasUnicas = [...new Set(categoriasFiltradas.filter(cat => cat))];
    
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
    
    // Resetear items y modelo
    document.getElementById('item').innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    document.getElementById('item').disabled = true;
    document.getElementById('modelo').value = '';
    document.getElementById('presentacion').innerHTML = '<option value="" disabled selected>Selecciona la presentación</option>';
    document.getElementById('presentacion').disabled = true;
}

// Modificación 1: Filtrar items por sede (ALL y sede del usuario) y estado ACTIVO
function llenarItems(tipo, categoria) {
    if (!window.articulosData || !window.articulosData.articulos) {
        return;
    }
    
    const articulos = window.articulosData.articulos;
    const campos = window.articulosData.campos;
    const propTipo = campos.tipo;
    const propCategoria = campos.categoria;
    const propItem = campos.item;
    const propSede = campos.sede;
    const propEstado = campos.estado;
    
    // Obtener la sede del usuario
    const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
    const sedeUsuario = userSession.sede || '';
    
    const itemSelect = document.getElementById('item');
    itemSelect.innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    
    // Filtrar artículos por tipo, categoría, sede (ALL o sede del usuario) y estado ACTIVO
    const itemsFiltrados = articulos
        .filter(item => {
            // Verificar tipo y categoría
            const tipoMatch = item[propTipo] === tipo;
            const categoriaMatch = item[propCategoria] === categoria;
            
            // Verificar sede (ALL o sede del usuario)
            let sedeMatch = false;
            if (propSede) {
                const itemSede = item[propSede];
                sedeMatch = itemSede === 'ALL' || itemSede === sedeUsuario;
            } else {
                // Si no hay propiedad sede, permitir todos
                sedeMatch = true;
            }
            
            // Verificar estado ACTIVO
            let estadoMatch = false;
            if (propEstado) {
                estadoMatch = item[propEstado] === 'ACTIVO';
            } else {
                // Si no hay propiedad estado, permitir todos
                estadoMatch = true;
            }
            
            return tipoMatch && categoriaMatch && sedeMatch && estadoMatch;
        })
        .map(item => item[propItem]);
    
    const itemsUnicos = [...new Set(itemsFiltrados.filter(item => item))];
    
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
    
    // Resetear modelo
    document.getElementById('modelo').value = '';
    document.getElementById('presentacion').innerHTML = '<option value="" disabled selected>Selecciona la presentación</option>';
    document.getElementById('presentacion').disabled = true;
}

// Función modificada para llenar modelos automáticamente basados en el item seleccionado
function llenarModelos(tipo, categoria, item) {
    if (!window.articulosData || !window.articulosData.articulos) {
        return;
    }
    
    const articulos = window.articulosData.articulos;
    const campos = window.articulosData.campos;
    const propTipo = campos.tipo;
    const propCategoria = campos.categoria;
    const propItem = campos.item;
    const propModelo = campos.modelo;
    
    // Resetear el campo modelo
    const modeloInput = document.getElementById('modelo');
    modeloInput.value = '';
    modeloInput.readOnly = true; // Hacer el campo de solo lectura
    
    // Filtrar artículos que coincidan con tipo, categoría e item
    const articulosFiltrados = articulos.filter(articulo => 
        articulo[propTipo] === tipo && 
        articulo[propCategoria] === categoria && 
        articulo[propItem] === item
    );
    
    // Si hay propiedad modelo en los datos, intentar usarla primero
    if (propModelo) {
        // Extraer modelos únicos
        const modelosUnicos = [...new Set(articulosFiltrados
            .map(articulo => articulo[propModelo])
            .filter(modelo => modelo) // Filtrar valores nulos o undefined
        )];
        
        // Si hay un solo modelo, usarlo directamente
        if (modelosUnicos.length === 1) {
            modeloInput.value = modelosUnicos[0];
            habilitarPresentacion(modelosUnicos[0]);
            return;
        } 
        // Si hay múltiples modelos, usar el primero
        else if (modelosUnicos.length > 1) {
            modeloInput.value = modelosUnicos[0];
            habilitarPresentacion(modelosUnicos[0]);
            return;
        }
    }
    
    // Si no se encontró modelo localmente, consultar la API
    // Mostrar indicador de carga
    modeloInput.placeholder = "Cargando modelos...";
    
    // Construir URL con parámetros de filtro
    const apiUrl = `https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec?api=articulos&tipo=${encodeURIComponent(tipo)}&categoria=${encodeURIComponent(categoria)}&item=${encodeURIComponent(item)}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let modelos = [];
            
            // Intentar extraer modelos de diferentes estructuras posibles
            if (data && data.articulos && Array.isArray(data.articulos)) {
                // Buscar la propiedad modelo en el primer artículo
                const primerArticulo = data.articulos[0];
                if (primerArticulo) {
                    // Usar el mismo mapeo que en cargarDatosInventario
                    const posiblesModelos = ['modelo', 'MODELO', 'model', 'MODEL', 'Modelo'];
                    let propModelo = null;
                    
                    for (const posible of posiblesModelos) {
                        if (primerArticulo.hasOwnProperty(posible)) {
                            propModelo = posible;
                            break;
                        }
                    }
                    
                    if (propModelo) {
                        modelos = [...new Set(data.articulos
                            .map(item => item[propModelo])
                            .filter(modelo => modelo)
                        )];
                    }
                }
            } else if (Array.isArray(data)) {
                // Si data es un array directamente
                const primerItem = data[0];
                if (primerItem) {
                    const posiblesModelos = ['modelo', 'MODELO', 'model', 'MODEL', 'Modelo'];
                    let propModelo = null;
                    
                    for (const posible of posiblesModelos) {
                        if (primerItem.hasOwnProperty(posible)) {
                            propModelo = posible;
                            break;
                        }
                    }
                    
                    if (propModelo) {
                        modelos = [...new Set(data
                            .map(item => item[propModelo])
                            .filter(modelo => modelo)
                        )];
                    }
                }
            }
            
            // Actualizar el placeholder
            modeloInput.placeholder = "No hay modelo disponible";
            
            // Si hay modelos disponibles, usar el primero automáticamente
            if (modelos.length > 0) {
                modeloInput.value = modelos[0];
                habilitarPresentacion(modelos[0]);
            }
        })
        .catch(error => {
            modeloInput.placeholder = "Error al cargar modelo";
        });
}

// Función para habilitar el selector de presentación basado en el modelo seleccionado
function habilitarPresentacion(modelo) {
    if (!modelo) {
        return;
    }
    
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
        
        presentacionSelect.disabled = true; // Deshabilitar el select
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
        // Mostrar alerta
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
        
        // Si el modal no existe, crearlo
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
            factura: document.getElementById('factura').value,            
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
                    <div class="ingreso-id">${resultado.id || 'No disponible'}</div>
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
        // Ocultar modal de carga si existe
        const exitoModal = document.getElementById('exito');
        if (exitoModal) {
            exitoModal.style.display = 'none';
        }
        alert('Error al guardar el ingreso: ' + error.message);
    }
}

// Función para resetear el formulario
function resetearFormulario() {
    // Resetear campos individualmente
    document.getElementById('tipoInventario').selectedIndex = 0;
    
    // Resetear categoría
    const categoriaSelect = document.getElementById('categoria');
    categoriaSelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
    categoriaSelect.disabled = true;
    
    // Resetear item
    const itemSelect = document.getElementById('item');
    itemSelect.innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    itemSelect.disabled = true;
    
    // Resetear otros campos
    document.getElementById('modelo').value = '';
    document.getElementById('presentacion').innerHTML = '<option value="" disabled selected>Selecciona la presentación</option>';
    document.getElementById('presentacion').disabled = true;
    document.getElementById('cantidad').value = '';
    document.getElementById('factura').value = '';
    document.getElementById('fechaVenc').value = '';
    document.getElementById('observaciones').value = '';
    document.getElementById('noAplicaFecha').checked = false;
    document.getElementById('fechaVenc').disabled = false;
}

function cerrarSesion() {
    // Mostrar modal de confirmación para cerrar sesión
    document.getElementById('salir').style.display = 'flex';
}

function confirmarCerrarSesion() {
    // Limpiar datos de sesión
    localStorage.removeItem('userSession');
    
    // Redirigir a la página de login
    window.location.href = 'index.html';
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
        console.log('Evento de guardar configurado correctamente');
    } else {
        console.error('No se encontró el botón de guardar con ID "guardarBtn"');
    }
    
    // Configurar botones de confirmación
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
}

// Modificación 2: Función para controlar la fecha de vencimiento con el checkbox NO APLICA
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

// Modificación de la función guardarIngreso para mejorar la visualización
function guardarIngreso() {
    console.log('Función guardarIngreso ejecutada');
    
    // Validar campos requeridos
    const tipoInventario = document.getElementById('tipoInventario');
    const categoria = document.getElementById('categoria');
    const item = document.getElementById('item');
    const modelo = document.getElementById('modelo');
    const presentacionSelect = document.getElementById('presentacion');
    const cantidad = document.getElementById('cantidad');
    const factura = document.getElementById('factura');
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
    
    if (modelo !== 'UNIDAD' && !presentacionSelect.value) {
        const errorPresentacion = document.getElementById('errorPresentacion');
        if (errorPresentacion) errorPresentacion.style.display = 'block';
        isValid = false;
    }
    
    if (!cantidad.value || isNaN(cantidad.value) || parseInt(cantidad.value) <= 0) {
        const errorCantidad = document.getElementById('errorCantidad');
        if (errorCantidad) errorCantidad.style.display = 'block';
        isValid = false;
    }
    
    if (!factura.value) {
        const errorFactura = document.getElementById('errorFactura');
        if (errorFactura) errorFactura.style.display = 'block';
        isValid = false;
    }
    
    if (!noAplicaFecha.checked && !fechaVenc.value) {
        const errorFechaVenc = document.getElementById('errorFechaVenc');
        if (errorFechaVenc) errorFechaVenc.style.display = 'block';
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Calcular cantidad total correctamente
    const selectedOption = presentacionSelect.options[presentacionSelect.selectedIndex];
    const factorPresentacion = parseFloat(selectedOption.dataset.factor) || 1;
    console.log("Factor de presentación:", factorPresentacion);
    const cantidadIngresada = parseFloat(cantidad.value);
    const cantidadTotal = Math.floor(cantidadIngresada * factorPresentacion); // Convertir a número entero
    console.log("Cantidad ingresada:", cantidadIngresada, "Cantidad total calculada:", cantidadTotal);
    
    // Mostrar modal de confirmación
    const confirmacionModal = document.getElementById('confirmacion');
    const contentDiv = document.getElementById('content');
    
    contentDiv.innerHTML = `
        <div class="confirmacion-header">
            <h3>Confirmar Ingreso</h3>
        </div>
        <div class="confirmacion-detalles">
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
                <div class="detalle-label">Factura:</div>
                <div class="detalle-valor">${factura.value}</div>
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
        </div>
        <div class="modal-buttons">
            <button id="confirmarBtn" class="btn-confirmar">Confirmar</button>
            <button id="cancelarConfirmacionBtn" class="btn-cancelar">Cancelar</button>
        </div>
    `;
    
    // Mostrar el modal
    confirmacionModal.style.display = 'flex';
    
    // Asignar eventos directamente sin clonar los botones
    document.getElementById('confirmarBtn').onclick = enviarDatosAPI;
    document.getElementById('cancelarConfirmacionBtn').onclick = function() {
        document.getElementById('confirmacion').style.display = 'none';
    };
}