const scriptURL = 'https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec';
let datosUsuario = {};

// Cache global para almacenar los datos ya cargados
const dataCache = {
  articulos: null,
  tipos: null,
  categorias: {},
  items: {}
};

// Cargar datos del usuario al iniciar
window.onload = async function() {
  const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
  
  // Mostrar información del usuario
  document.getElementById('userName').textContent = userSession.nombre || 'Usuario';
  document.getElementById('userRole').textContent = userSession.cargo || 'Sin cargo asignado';
  document.getElementById('userSede').textContent = userSession.sede || 'Sin sede asignada';

  datosUsuario = {
    username: userSession.username,
    nombre: userSession.nombre,
    sede: userSession.sede
  };

  // Establecer el responsable automáticamente
  document.getElementById('responsable').value = userSession.nombre || '';
  document.getElementById('responsable').readOnly = true;
  document.getElementById('responsable').style.backgroundColor = '#f5f5f5';

  // Iniciar precarga de datos en segundo plano
  precargarArticulos().then(() => {
    console.log('Datos precargados con éxito');
  }).catch(error => {
    console.error('Error en precarga:', error);
  });
  
  // Configurar eventos
  configurarEventos();
  
  // Cargar opciones iniciales (de manera optimizada)
  cargarOpcionesSelect();
};

// Precargar todos los artículos una sola vez para mejorar rendimiento
async function precargarArticulos() {
  if (dataCache.articulos !== null) return dataCache.articulos;
  
  try {
    // Usar GET que no tiene problemas de CORS
    const response = await fetch(`${scriptURL}?api=articulos&sede=${encodeURIComponent(datosUsuario.sede)}`);
    const data = await response.json();
    
    if (!data.success) throw new Error('Error al cargar artículos');
    
    dataCache.articulos = data.data;
    
    // Preprocesar los datos para llenar cachés secundarias
    dataCache.tipos = [...new Set(data.data.map(item => item.TIPO).filter(Boolean))];
    
    // Preprocesar categorías por tipo
    dataCache.tipos.forEach(tipo => {
      dataCache.categorias[tipo] = [...new Set(
        data.data
          .filter(item => item.TIPO === tipo)
          .map(item => item.CATEGORIA)
          .filter(Boolean)
      )];
    });
    
    return dataCache.articulos;
  } catch (error) {
    console.error('Error en precarga de artículos:', error);
    throw error;
  }
}

// Cargar opciones de selección iniciales
async function cargarOpcionesSelect() {
  try {
    // Intentar usar el caché primero, o cargar datos si es necesario
    if (!dataCache.articulos) {
      await precargarArticulos();
    }
    
    // Cargar tipos desde caché
    const selectTipo = document.getElementById('tipoInventario');
    selectTipo.innerHTML = '<option value="" disabled selected>Selecciona el tipo</option>';
    
    dataCache.tipos.forEach(tipo => {
      const option = document.createElement('option');
      option.value = tipo;
      option.textContent = tipo;
      selectTipo.appendChild(option);
    });
    
    // Configurar eventos con delegación
    document.getElementById('tipoInventario').addEventListener('change', (e) => {
      cargarCategoriasPorTipo(e.target.value);
      // Resetear el modelo cuando cambie el tipo
      document.getElementById('modelo').selectedIndex = 0;
      ocultarMostrarLoteSize();
    });
    
    document.getElementById('categoria').addEventListener('change', (e) => {
      cargarItems(document.getElementById('tipoInventario').value, e.target.value);
    });
    
    document.getElementById('modelo').addEventListener('change', ocultarMostrarLoteSize);
    
  } catch (error) {
    console.error('Error al cargar opciones iniciales:', error);
    mostrarError('Error al cargar datos iniciales. Intente recargar la página.');
  }
}

// Función para mostrar/ocultar el campo loteSize según el modelo seleccionado
function ocultarMostrarLoteSize() {
  const modeloSeleccionado = document.getElementById('modelo').value;
  const loteSizeContainer = document.getElementById('loteSizeContainer');
  
  if (modeloSeleccionado === 'LOTE') {
    loteSizeContainer.style.display = 'block';
  } else {
    loteSizeContainer.style.display = 'none';
    document.getElementById('loteSize').value = '';
  }
}

// Cargar categorías basadas en el tipo seleccionado (optimizado)
function cargarCategoriasPorTipo(tipoSeleccionado) {
  if (!tipoSeleccionado) return;
  
  try {
    const selectCategoria = document.getElementById('categoria');
    selectCategoria.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
    
    // Usar caché si está disponible
    if (dataCache.categorias[tipoSeleccionado]) {
      dataCache.categorias[tipoSeleccionado].forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        selectCategoria.appendChild(option);
      });
      
      selectCategoria.disabled = false;
    } else {
      selectCategoria.disabled = true;
      mostrarError('No se encontraron categorías para este tipo');
    }
    
    // Resetear items cuando cambia la categoría
    document.getElementById('item').innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    document.getElementById('item').disabled = true;
    
  } catch (error) {
    console.error('Error al cargar categorías:', error);
    mostrarError('Error al cargar categorías');
  }
}

// Cargar items basados en tipo y categoría (optimizado)
function cargarItems(tipo, categoria) {
  if (!tipo || !categoria) return;
  
  const cacheKey = `${tipo}-${categoria}`;
  
  try {
    const selectItem = document.getElementById('item');
    selectItem.innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
    
    // Usar caché de artículos completo para filtrar
    if (dataCache.articulos) {
      const itemsFiltrados = dataCache.articulos.filter(item => 
        item.TIPO === tipo && 
        item.CATEGORIA === categoria && 
        (item.SEDE === datosUsuario.sede || item.SEDE === 'ALL') &&
        item.ESTADO === 'ACTIVO'
      );
      
      if (itemsFiltrados.length === 0) {
        selectItem.disabled = true;
        mostrarError('No hay ítems disponibles para esta categoría');
        return;
      }
      
      itemsFiltrados.forEach(item => {
        const option = document.createElement('option');
        // El valor debe ser el nombre del ítem según POST ingresos.gs
        option.value = item.ITEM;
        option.textContent = item.ITEM;
        // Guardar el ID en un atributo data para usarlo después
        option.setAttribute('data-id', item.ID_ARTICULO || '');
        selectItem.appendChild(option);
      });
      
      selectItem.disabled = false;
      
      // Guardar en caché secundaria
      dataCache.items[cacheKey] = itemsFiltrados;
    } else {
      selectItem.disabled = true;
      mostrarError('Error al cargar ítems: datos no disponibles');
    }
  } catch (error) {
    console.error('Error al cargar items:', error);
    mostrarError('Error al cargar items');
  }
}

// Configurar eventos del formulario
function configurarEventos() {
  // Evento para el botón de guardar
  document.getElementById('guardarBtn').addEventListener('click', function(e) {
    e.preventDefault();
    validarYGuardarIngreso();
  });

  // Evento para el checkbox "No aplica" fecha de vencimiento
  document.getElementById('noAplicaFecha').addEventListener('change', function() {
    const fechaVencInput = document.getElementById('fechaVenc');
    fechaVencInput.disabled = this.checked;
    if (this.checked) {
      fechaVencInput.value = '';
    }
  });

  // Evento para cerrar sesión
  document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('salir').style.display = 'flex';
  });

  // Eventos para los modales
  document.getElementById('confirmarSalirBtn').addEventListener('click', function() {
    localStorage.removeItem('userSession');
    window.location.href = 'login.html';
  });

  document.getElementById('cancelarSalirBtn').addEventListener('click', function() {
    document.getElementById('salir').style.display = 'none';
  });

  document.getElementById('nuevoIngresoBtn').addEventListener('click', function() {
    resetFormulario();
    document.getElementById('exito').style.display = 'none';
  });

  document.getElementById('volverBtn').addEventListener('click', function() {
    window.location.href = 'menu.html';
  });
}

// Validar el formulario antes de guardar
function validarYGuardarIngreso() {
  // Obtener valores del formulario
  const tipo = document.getElementById('tipoInventario').value;
  const categoria = document.getElementById('categoria').value;
  const modelo = document.getElementById('modelo').value;
  const loteSize = document.getElementById('loteSize').value;
  const itemSelect = document.getElementById('item');
  const item = itemSelect.value;
  const cantidad = document.getElementById('cantidad').value;
  const factura = document.getElementById('factura').value;
  const responsable = document.getElementById('responsable').value;
  const fechaVenc = document.getElementById('fechaVenc').value;
  const noAplicaFecha = document.getElementById('noAplicaFecha').checked;
  const observaciones = document.getElementById('observaciones').value;

  // Validar campos obligatorios
  let isValid = true;

  if (!tipo) {
    document.getElementById('errorTipo').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorTipo').style.display = 'none';
  }

  if (!categoria) {
    document.getElementById('errorCategoria').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorCategoria').style.display = 'none';
  }

  if (!modelo) {
    document.getElementById('errorModelo').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorModelo').style.display = 'none';
  }

  if (modelo === 'LOTE' && !loteSize) {
    document.getElementById('errorLoteSize').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorLoteSize').style.display = 'none';
  }

  if (!item) {
    document.getElementById('errorItem').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorItem').style.display = 'none';
  }

  if (!cantidad || isNaN(cantidad) || parseFloat(cantidad) <= 0) {
    document.getElementById('errorCantidad').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorCantidad').style.display = 'none';
  }

  if (!factura) {
    document.getElementById('errorFactura').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorFactura').style.display = 'none';
  }

  if (!responsable) {
    document.getElementById('errorResponsable').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorResponsable').style.display = 'none';
  }

  if (!noAplicaFecha && !fechaVenc) {
    document.getElementById('errorFechaVenc').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('errorFechaVenc').style.display = 'none';
  }

  if (!isValid) {
    mostrarError('Por favor complete todos los campos obligatorios');
    return;
  }

  // Mostrar confirmación antes de guardar
  mostrarConfirmacion({
    tipo,
    categoria,
    modelo,
    loteSize: modelo === 'LOTE' ? loteSize : 'N/A',
    item,
    cantidad,
    factura,
    responsable,
    fechaVencimiento: noAplicaFecha ? 'NO APLICA' : fechaVenc,
    observaciones
  });
}

// Mostrar modal de confirmación con los datos a guardar
function mostrarConfirmacion(datos) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h3>Confirmar Ingreso de Inventario</h3>
    <div class="confirmacion-datos">
      <p><strong>Tipo:</strong> ${datos.tipo}</p>
      <p><strong>Categoría:</strong> ${datos.categoria}</p>
      <p><strong>Modelo:</strong> ${datos.modelo} ${datos.modelo === 'LOTE' ? `(Tipo: ${datos.loteSize})` : ''}</p>
      <p><strong>Item:</strong> ${datos.item}</p>
      <p><strong>Cantidad:</strong> ${datos.cantidad}</p>
      <p><strong>Factura:</strong> ${datos.factura}</p>
      <p><strong>Responsable:</strong> ${datos.responsable}</p>
      <p><strong>Fecha Vencimiento:</strong> ${datos.fechaVencimiento}</p>
      ${datos.observaciones ? `<p><strong>Observaciones:</strong> ${datos.observaciones}</p>` : ''}
    </div>
    <p>¿Desea guardar este ingreso?</p>
  `;

  document.getElementById('confirmacion').style.display = 'flex';

  // Configurar eventos de los botones del modal
  document.getElementById('confirmarBtn').onclick = function() {
    guardarIngreso(datos);
    document.getElementById('confirmacion').style.display = 'none';
  };

  document.getElementById('cancelarConfirmacionBtn').onclick = function() {
    document.getElementById('confirmacion').style.display = 'none';
  };
}

async function guardarIngreso(datos) {
    const btnGuardar = document.getElementById('guardarBtn');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
  
    try {
      const ahora = new Date();
      const ingresoData = {
        api: 'ingresos',
        accion: 'guardar',
        ingreso: {
          sede: datosUsuario.sede,
          tipo: datos.tipo,
          categoria: datos.categoria,
          modelo: datos.modelo,
          loteSize: datos.modelo === 'LOTE' ? datos.loteSize : '',
          item: datos.item,
          cantidad: parseFloat(datos.cantidad),
          factura: datos.factura,
          responsable: datos.responsable,
          vencimiento: datos.fechaVencimiento === 'NO APLICA' ? 'N/A' : datos.fechaVencimiento,
          observaciones: datos.observaciones || '',          
        }
      };
  
      // Show loading animation
      const loadingAnimation = document.createElement('div');
      loadingAnimation.id = 'loadingAnimation';
      loadingAnimation.className = 'overlay-animation';
      loadingAnimation.innerHTML = `
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Guardando ingreso...</p>
        </div>
      `;
      document.body.appendChild(loadingAnimation);
      
      // Usar el mismo formato de POST que en formulario.js
      const response = await fetch(scriptURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ingresoData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("Respuesta no es JSON válido: " + text);
      }
      
      if (result.success) {
        mostrarAnimacionExito();
      } else {
        throw new Error(result.message || 'Error al guardar el ingreso');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      mostrarError(`Error al guardar: ${error.message}`);
    } finally {
      // Remove loading animation if it exists
      const loadingAnimation = document.getElementById('loadingAnimation');
      if (loadingAnimation) {
        document.body.removeChild(loadingAnimation);
      }
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar Ingreso';
    }
  }

// Función para mostrar animación de éxito y resetear formulario
function mostrarAnimacionExito() {
  // Eliminar animación de carga si existe
  const loadingAnimation = document.getElementById('loadingAnimation');
  if (loadingAnimation) {
    document.body.removeChild(loadingAnimation);
  }
  
  // Crear y mostrar animación de éxito
  const successAnimation = document.createElement('div');
  successAnimation.id = 'successAnimation';
  successAnimation.className = 'overlay-animation';
  successAnimation.innerHTML = `
    <div class="success-container">
      <div class="success-checkmark">
        <div class="check-icon">
          <span class="icon-line line-tip"></span>
          <span class="icon-line line-long"></span>
        </div>
      </div>
      <p>¡Ingreso registrado correctamente!</p>
    </div>
  `;
  document.body.appendChild(successAnimation);
  
  // Ocultar la animación y resetear el formulario después de 2 segundos
  setTimeout(() => {
    document.body.removeChild(successAnimation);
    resetFormulario();
    
    // Habilitar el botón de guardar nuevamente
    const btnGuardar = document.getElementById('guardarBtn');
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar Ingreso';
  }, 2000);
}

// Función para formatear fechas
function formatDate(date, format) {
  const pad = num => num.toString().padStart(2, '0');
  return format
    .replace('dd', pad(date.getDate()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('yyyy', date.getFullYear())
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()));
}

// Resetear el formulario después de un ingreso exitoso
function resetFormulario() {
  document.getElementById('tipoInventario').selectedIndex = 0;
  document.getElementById('categoria').innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
  document.getElementById('categoria').disabled = true;
  document.getElementById('modelo').selectedIndex = 0;
  document.getElementById('loteSizeContainer').style.display = 'none';
  document.getElementById('loteSize').value = '';
  document.getElementById('item').innerHTML = '<option value="" disabled selected>Selecciona un item</option>';
  document.getElementById('item').disabled = true;
  document.getElementById('cantidad').value = '';
  document.getElementById('factura').value = '';
  document.getElementById('responsable').value = datosUsuario.nombre || '';
  document.getElementById('fechaVenc').value = '';
  document.getElementById('fechaVenc').disabled = false;
  document.getElementById('noAplicaFecha').checked = false;
  document.getElementById('observaciones').value = '';

  // Resetear mensajes de error
  document.querySelectorAll('.error-message').forEach(el => {
    el.style.display = 'none';
  });
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
  alert(mensaje); // Implementación temporal
  console.error(mensaje);
}

// Ajustar altura para dispositivos móviles
function ajustarAltura() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Eventos de redimensionamiento
window.addEventListener('resize', ajustarAltura);
window.addEventListener('orientationchange', ajustarAltura);
document.addEventListener('DOMContentLoaded', ajustarAltura);
ajustarAltura();