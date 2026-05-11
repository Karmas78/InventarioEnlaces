import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2RxjTjM8AJKULW1WUcw_qP4N6LGLcQ2U",
  authDomain: "inventarioenlaces.firebaseapp.com",
  projectId: "inventarioenlaces",
  storageBucket: "inventarioenlaces.firebasestorage.app",
  messagingSenderId: "779068261772",
  appId: "1:779068261772:web:e3c038b5c3d4de8eab02a9"
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

class Database {
    constructor() {
        this.auth = auth;
        this.cache = {
            equipos: [],
            funcionarios: [],
            asignaciones: [],
            historial: [],
            marcas: [],
            categorias: []
        };
    }

    login(email, password) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    logout() {
        return signOut(this.auth);
    }

    onAuthChange(callback) {
        onAuthStateChanged(this.auth, callback);
    }

    async initData() {
        try {
            await Promise.all([
                this.fetchCollection('equipos'),
                this.fetchCollection('funcionarios'),
                this.fetchCollection('asignaciones'),
                this.fetchCollection('historial'),
                this.fetchCollection('marcas'),
                this.fetchCollection('categorias')
            ]);
            
            // Si la base de datos está vacía, crear los funcionarios por defecto
            if (this.cache.funcionarios.length === 0) {
                const defaultFuncs = [
                    { id: 'F-001', rut: '11.111.111-1', nombre: 'Juan Pérez', email: 'juan.perez@escuela.cl', cargo: 'Profesor', departamento: 'Matemáticas' },
                    { id: 'F-002', rut: '22.222.222-2', nombre: 'María González', email: 'maria.g@escuela.cl', cargo: 'Directora', departamento: 'Administración' }
                ];
                for (const f of defaultFuncs) {
                    await setDoc(doc(firestore, 'funcionarios', f.id), f);
                    this.cache.funcionarios.push(f);
                }
            }

            // Datos por defecto para marcas (agregar las que falten)
            const defaultBrands = [
                'Acer', 'Apple', 'ASUS', 'Dell', 'HP', 'Lenovo', 'Samsung', 'Sony', 
                'Logitech', 'Brother', 'Epson', 'Canon', 'Microsoft', 'Genius', 
                'Kingston', 'Western Digital', 'SanDisk', 'TP-Link', 'Cisco', 
                'ViewSonic', 'AOC', 'BenQ', 'Xiaomi', 'Huawei', 'Toshiba', 
                'Intel', 'AMD', 'NVIDIA', 'Corsair', 'Razer', 'HyperX', 'SteelSeries',
                'Western Digital', 'Seagate', 'Crucial'
            ];
            const existingBrands = this.cache.marcas.map(m => m.nombre.toLowerCase());
            for (const name of defaultBrands) {
                if (!existingBrands.includes(name.toLowerCase())) {
                    const id = this.generateId('BR');
                    await setDoc(doc(firestore, 'marcas', id), { nombre: name });
                    this.cache.marcas.push({ id, nombre: name });
                }
            }

            // Datos por defecto para categorías (agregar las que falten)
            const defaultCats = [
                'Laptop', 'PC Escritorio', 'AIO (All-in-One)', 'Tablet', 
                'Monitor / Pantalla', 'Proyector', 'Impresora', 'Mouse', 
                'Teclado', 'Audífonos', 'UPS', 'Cámara Web', 'Micrófono', 
                'Parlantes', 'Disco Duro Externo', 'Pendrive', 'Router / Switch', 
                'Cable HDMI / VGA', 'Adaptador', 'Tablet Educativa', 
                'Lector de Código de Barras', 'Servidor', 'Escáner', 'Plotter',
                'Teléfono IP', 'Tablet Gráfica', 'Docking Station', 
                'Lector de CD/DVD Externo', 'Kit Robótica', 'Pizarra Interactiva'
            ];
            const existingCats = this.cache.categorias.map(c => c.nombre.toLowerCase());
            for (const name of defaultCats) {
                if (!existingCats.includes(name.toLowerCase())) {
                    const id = this.generateId('CT');
                    await setDoc(doc(firestore, 'categorias', id), { nombre: name });
                    this.cache.categorias.push({ id, nombre: name });
                }
            }
        } catch (error) {
            console.error("Error inicializando Firebase:", error);
            throw new Error("No se pudo conectar a la base de datos. Verifica tus reglas de seguridad de Firestore.");
        }
    }

    async fetchCollection(colName) {
        const querySnapshot = await getDocs(collection(firestore, colName));
        this.cache[colName] = [];
        querySnapshot.forEach((docSnap) => {
            this.cache[colName].push({ id: docSnap.id, ...docSnap.data() });
        });
    }

    // Generic Methods
    getTable(table) {
        return this.cache[table] || [];
    }

    generateId(prefix) {
        return `${prefix}-${Date.now().toString().slice(-6)}`;
    }

    // Equipos
    getEquipos() { return this.getTable('equipos'); }
    
    async saveEquipo(equipo) {
        const equipos = this.getEquipos();
        // Validation for uniqueness
        if(equipos.find(e => (e.assetTag === equipo.assetTag || e.serie === equipo.serie) && e.id !== equipo.id)) {
            throw new Error('Asset Tag o Número de Serie ya existen.');
        }
        
        if (equipo.id) {
            const equipoRef = doc(firestore, 'equipos', equipo.id);
            const dataToUpdate = { ...equipo };
            delete dataToUpdate.id; // avoid duplicating id in document body
            await updateDoc(equipoRef, dataToUpdate);
            
            const idx = equipos.findIndex(e => e.id === equipo.id);
            if(idx > -1) equipos[idx] = equipo;
        } else {
            equipo.id = this.generateId('EQ');
            const dataToSave = { ...equipo };
            delete dataToSave.id;
            await setDoc(doc(firestore, 'equipos', equipo.id), dataToSave);
            equipos.push(equipo);
        }
        return equipo;
    }

    async eliminarEquipo(id) {
        const prestamosActivos = this.getAsignaciones(true);
        if (prestamosActivos.some(p => p.equipoId === id)) {
            throw new Error('No se puede eliminar un equipo que actualmente está en préstamo.');
        }

        let equipos = this.getEquipos();
        const equipoAEliminar = equipos.find(e => e.id === id);
        
        if (equipoAEliminar) {
            await deleteDoc(doc(firestore, 'equipos', id));
            this.cache.equipos = equipos.filter(e => e.id !== id);
            
            await this.registrarHistorial(id, 'Sistema', `Equipo Eliminado (${equipoAEliminar.assetTag})`, new Date().toISOString().split('T')[0]);
        }
    }

    // Funcionarios
    getFuncionarios() { return this.getTable('funcionarios'); }

    async saveFuncionario(func) {
        const funcionarios = this.getFuncionarios();
        // Validar RUT único
        if (funcionarios.find(f => f.rut === func.rut && f.id !== func.id)) {
            throw new Error('Ya existe un funcionario registrado con ese RUT.');
        }

        if (func.id) {
            // Editar existente
            const ref = doc(firestore, 'funcionarios', func.id);
            const dataToUpdate = { ...func };
            delete dataToUpdate.id;
            await updateDoc(ref, dataToUpdate);
            const idx = funcionarios.findIndex(f => f.id === func.id);
            if (idx > -1) funcionarios[idx] = func;
        } else {
            // Nuevo
            func.id = this.generateId('FC');
            const dataToSave = { ...func };
            delete dataToSave.id;
            await setDoc(doc(firestore, 'funcionarios', func.id), dataToSave);
            funcionarios.push(func);
        }
        return func;
    }

    async eliminarFuncionario(id) {
        const prestamosActivos = this.getAsignaciones(true);
        if (prestamosActivos.some(p => p.funcionarioId === id)) {
            throw new Error('No se puede eliminar un funcionario que tiene equipos en préstamo activo.');
        }
        await deleteDoc(doc(firestore, 'funcionarios', id));
        this.cache.funcionarios = this.cache.funcionarios.filter(f => f.id !== id);
    }

    // Préstamos / Asignaciones
    getAsignaciones(activeOnly = true) { 
        const asig = this.getTable('asignaciones'); 
        return activeOnly ? asig.filter(a => a.estado === 'Activa') : asig;
    }

    async crearPrestamo(equipoId, funcionarioId, fechaEntrega, fechaDevPrev, notas) {
        const equipos = this.getEquipos();
        const equipo = equipos.find(e => e.id === equipoId);
        
        if(!equipo || equipo.estado === 'En Reparación' || equipo.estado === 'De Baja') {
            throw new Error('El equipo no puede ser asignado en su estado actual.');
        }

        const prestamoId = this.generateId('LN');
        const prestamo = {
            equipoId,
            funcionarioId,
            fechaEntrega,
            fechaDevolucionPrevista: fechaDevPrev,
            observaciones: notas,
            estado: 'Activa'
        };

        await setDoc(doc(firestore, 'asignaciones', prestamoId), prestamo);
        prestamo.id = prestamoId;
        this.cache.asignaciones.push(prestamo);

        await this.registrarHistorial(equipoId, funcionarioId, 'Préstamo iniciado', fechaEntrega);
        return prestamo;
    }

    async devolverEquipo(prestamoId, nuevoEstadoEquipo, notasDevolucion) {
        const asignaciones = this.getTable('asignaciones');
        const prestamo = asignaciones.find(a => a.id === prestamoId);
        
        if(!prestamo) throw new Error('Préstamo no encontrado');

        prestamo.estado = 'Devuelta';
        prestamo.fechaDevolucionReal = new Date().toISOString().split('T')[0];
        prestamo.notasDevolucion = notasDevolucion;

        const dataToUpdate = { ...prestamo };
        delete dataToUpdate.id;
        await updateDoc(doc(firestore, 'asignaciones', prestamoId), dataToUpdate);

        // Update Equipo Status
        const equipos = this.getEquipos();
        const equipo = equipos.find(e => e.id === prestamo.equipoId);
        equipo.estado = nuevoEstadoEquipo;
        await updateDoc(doc(firestore, 'equipos', equipo.id), { estado: nuevoEstadoEquipo });

        await this.registrarHistorial(prestamo.equipoId, prestamo.funcionarioId, `Devuelto. Nuevo Estado: ${nuevoEstadoEquipo}. Notas: ${notasDevolucion}`, prestamo.fechaDevolucionReal);
    }

    async registrarHistorial(equipoId, funcionarioId, accion, fecha) {
        const histId = this.generateId('HS');
        const record = {
            equipoId,
            funcionarioId,
            accion,
            fecha
        };
        await setDoc(doc(firestore, 'historial', histId), record);
        record.id = histId;
        this.cache.historial.push(record);
    }

    // Marcas
    getMarcas() { return this.getTable('marcas'); }
    async saveMarca(marca) {
        const marcas = this.getMarcas();
        if (marcas.find(m => m.nombre.toLowerCase() === marca.nombre.toLowerCase() && m.id !== marca.id)) {
            throw new Error('La marca ya existe.');
        }
        if (marca.id) {
            await updateDoc(doc(firestore, 'marcas', marca.id), { nombre: marca.nombre });
            const idx = marcas.findIndex(m => m.id === marca.id);
            if (idx > -1) marcas[idx].nombre = marca.nombre;
        } else {
            marca.id = this.generateId('BR');
            await setDoc(doc(firestore, 'marcas', marca.id), { nombre: marca.nombre });
            marcas.push(marca);
        }
        return marca;
    }
    async eliminarMarca(id) {
        await deleteDoc(doc(firestore, 'marcas', id));
        this.cache.marcas = this.cache.marcas.filter(m => m.id !== id);
    }

    // Categorías
    getCategorias() { return this.getTable('categorias'); }
    async saveCategoria(cat) {
        const cats = this.getCategorias();
        if (cats.find(c => c.nombre.toLowerCase() === cat.nombre.toLowerCase() && c.id !== cat.id)) {
            throw new Error('La categoría ya existe.');
        }
        if (cat.id) {
            await updateDoc(doc(firestore, 'categorias', cat.id), { nombre: cat.nombre });
            const idx = cats.findIndex(c => c.id === cat.id);
            if (idx > -1) cats[idx].nombre = cat.nombre;
        } else {
            cat.id = this.generateId('CT');
            await setDoc(doc(firestore, 'categorias', cat.id), { nombre: cat.nombre });
            cats.push(cat);
        }
        return cat;
    }
    async eliminarCategoria(id) {
        await deleteDoc(doc(firestore, 'categorias', id));
        this.cache.categorias = this.cache.categorias.filter(c => c.id !== id);
    }
}

export const db = new Database();
window.db = db; // expose for console debugging
