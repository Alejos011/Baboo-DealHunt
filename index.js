require('dotenv').config();
const express = require('express');
const path = require('path');
const { searchProducts } = require('./SerpAPIService');

const app = express();
const PORT = process.env.PORT;

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // El usuario está logueado, continua con la siguiente ruta
    }
    res.redirect('/login'); // Si no está logueado, redirige al login
}

// Configuración de vistas y archivos estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Views'));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta base (index)
app.get('/', (req, res) => {
    res.render('index');
});



// ++++++++++++++++++++++++++BUSQUEDAS+++++++++++++++++++++++++++++++
// Ruta para búsqueda
app.get('/search', async (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1; // Página actual (por defecto la 1)
    const itemsPerPage = 5; // Número de tiendas por página

    if (!query) {
        return res.render('products', { error: "No se especificó una consulta", groupedItems: null, currentPage: page });
    }

    try {
        const productsGroupedByStore = await searchProducts(query);

        if (Object.keys(productsGroupedByStore).length === 0) {
            return res.render('products', { error: "No se encontraron resultados", groupedItems: null, currentPage: page });
        }

        // Divide los productos en páginas
        const stores = Object.keys(productsGroupedByStore);
        const totalPages = Math.ceil(stores.length / itemsPerPage); // Total de páginas
        const paginatedStores = stores.slice((page - 1) * itemsPerPage, page * itemsPerPage); // Tiendas para la página actual

        // Agrupa los productos de las tiendas correspondientes a la página actual
        const groupedForCurrentPage = {};
        paginatedStores.forEach(store => {
            groupedForCurrentPage[store] = productsGroupedByStore[store];
        });

        res.render('products', { 
            error: null, 
            groupedItems: groupedForCurrentPage,
            currentPage: page,
            totalPages: totalPages,
            query: query
        });

    } catch (error) {
        console.error("Error en la búsqueda:", error.message);
        res.render('products', { error: "Ocurrió un error al buscar productos", groupedItems: null, currentPage: page });
    }
});


//********************PRODUCTOS ESPECIFICOS**********************
//Mostrar producto
app.get('/product', async (req, res) => {
    const query = req.query.q; // Query original para buscar el producto
    const title = req.query.title; // Título del producto

    if (!query || !title) {
        return res.render('product', { error: "Faltan datos del producto", product: null });
    }

    try {
        const productsGroupedByStore = await searchProducts(query);

        let productDetails = null;
        for (const store in productsGroupedByStore) {
            productDetails = productsGroupedByStore[store].find(p => p.title === title);
            if (productDetails) break;
        }

        if (!productDetails) {
            return res.render('product', { error: "Producto no encontrado", product: null });
        }

        res.render('product', { error: null, product: productDetails });
    } catch (error) {
        console.error("Error al cargar el producto:", error.message);
        res.render('product', { error: "Ocurrió un error al cargar el producto", product: null });
    }
});

//********************INICIO DEL SERVIDOR*******************
// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


//manejo de sesiones
const session = require('express-session');
const bodyParser = require('body-parser');

// Configuración del body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de la sesión
app.use(
    session({
        secret: 'tu_secreto', // Cambia esto por un valor seguro
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Cambiar a `true` si usas HTTPS
    })
);


//*******************LOGIN & REGISTER******************************

const bcrypt = require('bcrypt');
const db = require('./Models/DB'); // Conexión a la base de datos

// Ruta para mostrar el formulario de registro
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

// Ruta para procesar el registro
app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.render('register', { error: 'Todos los campos son obligatorios' });
    }

    try {
        //Verificar si existe el usuario
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.render('register', { error: 'El correo ya está registrado' });
        }

        //Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, NOW())', [
            email,
            hashedPassword,
            name,
        ]);

        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.render('register', { error: 'Error al registrar el usuario' });
    }
});

// Ruta para mostrar el formulario de inicio de sesión
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});



// Ruta para procesar el inicio de sesión
app.post('/login', 
    async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.render('login', { error: 'Todos los campos son obligatorios' });
    }

    try {
        const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (user.length === 0) {
            return res.render('login', { error: 'Correo o contraseña incorrectos' });
        }

        const isMatch = await bcrypt.compare(password, user[0].password_hash);
        if (!isMatch) {
            return res.render('login', { error: 'Correo o contraseña incorrectos' });
        }

        req.session.user = {
            id: user[0].user_id,
            name: user[0].name,
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('login', { error: 'Error al iniciar sesión' });
    }
});


//************LOGOUT*************
// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});



// Ruta para tracking que solo debe estar disponible para usuarios logueados
app.get('/tracking', isAuthenticated, (req, res) => {
    // Aquí puedes mostrar la vista de tracking o la lógica que desees
    res.render('tracking', { user: req.session.user }); 
    console.log(req.session.user);
});


// Ruta para tracking que solo debe estar disponible para usuarios logueados
app.get('/dealhunt', isAuthenticated, (req, res) => {
    // Aquí puedes mostrar la vista de tracking o la lógica que desees
    res.render('dealhunt', { user: req.session.user }); 
    console.log(req.session.user);
});

