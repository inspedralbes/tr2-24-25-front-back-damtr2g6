const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Detectamos si estamos en desarrollo o producción de forma sencilla
// Si ejecutas "electron ." es dev, si es un ejecutable empaquetado es prod.
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
    // 1. Configuración de la ventana
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Mi Proyecto Vue",
        // icon: path.join(__dirname, 'icon.png'), // Descomenta si tienes un icono
        webPreferences: {
            // SEGURIDAD: Importante mantener esto así para evitar riesgos
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
        },
        // Opcional: Ocultar la ventana hasta que el contenido esté cargado visualmente
        show: false
    });

    // 2. Cargar el Frontend
    // Buscamos el index.html dentro de la carpeta 'dist' que pegaste
    const indexPath = path.join(__dirname, 'dist', 'index.html');

    // Cargamos el archivo. 
    mainWindow.loadFile(indexPath).catch(err => {
        console.error("Error cargando index.html:", err);
        console.error("Asegúrate de haber copiado la carpeta 'dist' dentro de 'electron/'");
    });

    // 3. Ajustes de la Interfaz

    // Eliminar la barra de menú predeterminada (Archivo, Editar, Ver...)
    mainWindow.setMenu(null);

    // Mostrar la ventana solo cuando esté lista (evita pantallazo blanco inicial)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 4. Manejo de enlaces externos
    // Si tu app tiene enlaces a Google o webs externas, queremos que se abran
    // en el navegador del usuario (Chrome/Edge), no dentro de tu app.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // 5. Herramientas de Desarrollo
    // Abrir las DevTools automáticamente solo si estamos en desarrollo
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Evento cuando la ventana se cierra
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- CICLO DE VIDA DE LA APLICACIÓN ---

// Este método se llama cuando Electron ha terminado de inicializarse
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // En macOS es común recrear una ventana si se hace click en el dock
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});