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


// Configuración de vistas y archivos estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Views'));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta base (index)
app.get('/', (req, res) => {
    res.render('index', {user: req.session.user});
});



// ++++++++++++++++++++++++++BUSQUEDAS+++++++++++++++++++++++++++++++
// Ruta para búsqueda
app.get('/search', async (req, res) => { 
    const query = req.query.q; 
    const page = parseInt(req.query.page) || 1; 
    const itemsPerPage = 5; // Número de productos por página

    if (!query) { 
        return res.render('products', { error: "No se especificó una consulta", groupedItems: null, currentPage: page }); 
    }

    try {
        // Guardar la consulta en la base de datos
        const userId = req.session.user ? req.session.user.id : null;
        if (userId) {
            await db.query('INSERT INTO seach_queries (user_id, query, search_date) VALUES (?, ?, NOW())', [userId, query]);
        }

        // Obtener los productos agrupados por tienda
        const productsGroupedByStore = await searchProducts(query);
        if (Object.keys(productsGroupedByStore).length === 0) { 
            return res.render('products', { error: "No se encontraron resultados", groupedItems: null, currentPage: page }); 
        }

        // Paginación y agrupación de productos por tienda
        const stores = Object.keys(productsGroupedByStore);
        const totalPages = Math.ceil(stores.length / itemsPerPage);
        const paginatedStores = stores.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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

        const insertQuery = `
            INSERT INTO search_queries (user_id, query_text, search_date)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            RETURNING query_id;
        `;

        const result = await db.query(insertQuery, [req.session.userId, query]);
        req.session.queryId = result.rows[0].query_id;

        // Renderizar resultados o devolver JSON
        res.render('search_results', { results: structuredResults });


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


// Ruta para agregar un seguimiento de precios
app.post('/track-price', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { queryId, price, notificationSettings } = req.body; // Obtén el ID de la consulta y el precio actual

    if (!queryId || !price) {
        return res.status(400).send({ error: 'Faltan datos para realizar el seguimiento' });
    }

    try {
        // Guardar el seguimiento en la tabla price_tracking
        await db.query('INSERT INTO price_tracking (user_id, query_id, price, tracking_start_date, notification_settings, active) VALUES (?, ?, ?, NOW(), ?, ?)', 
            [userId, queryId, price, JSON.stringify(notificationSettings), 1]);

        res.status(200).send({ success: 'Seguimiento creado correctamente' });
    } catch (error) {
        console.error("Error al crear seguimiento:", error.message);
        res.status(500).send({ error: 'Error al agregar el seguimiento' });
    }
});


// Ruta para tracking
app.get('/tracking', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    try {
        // Obtener los seguimientos activos del usuario
        const [trackings] = await db.query(`
            SELECT pt.tracking_id, sq.query, pt.price, pt.tracking_start_date, pt.notification_settings
            FROM price_tracking pt
            JOIN seach_queries sq ON pt.query_id = sq.query_id
            WHERE pt.user_id = ? AND pt.active = 1`, [userId]);

        res.render('tracking', { 
            user: req.session.user,
            trackings: trackings // Enviamos los productos rastreados al frontend
        });
    } catch (error) {
        console.error("Error al cargar los seguimientos:", error.message);
        res.render('tracking', { 
            user: req.session.user, 
            error: "Ocurrió un error al cargar los seguimientos", 
            trackings: null 
        });
    }
});


// Ruta para tracking que solo debe estar disponible para usuarios logueados
app.get('/dealhunt', isAuthenticated, (req, res) => {
    // Aquí puedes mostrar la vista de tracking o la lógica que desees
    res.render('dealhunt', { user: req.session.user }); 

});



app.post('/track-product', async (req, res) => {
    const { productId, title, price, image } = req.body;
    const userId = req.session.userId; // Asegúrate de tener una sesión activa para obtener el user_id
    const queryId = req.session.queryId; // Almacena el query_id relacionado, si es relevante

    if (!userId || !queryId) {
        return res.status(401).json({ error: 'Sesión no válida. Debes iniciar sesión y realizar una búsqueda primero.' });
    }

    try {
        const query = `
            INSERT INTO price_tracking (user_id, query_id, price, tracking_start_date, notification_settings, active)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
            RETURNING *;
        `;
        const notificationSettings = JSON.stringify({
            notifyOnPriceDrop: true, // Ejemplo de configuración predeterminada
            notifyOnOutOfStock: false,
        });
        const values = [userId, queryId, parseFloat(price), notificationSettings, true];

        const result = await db.query(query, values);
        res.json({ success: true, tracking: result.rows[0] });
    } catch (error) {
        console.error('Error al rastrear producto:', error);
        res.status(500).json({ error: 'No se pudo iniciar el rastreo del producto.' });
    }
});