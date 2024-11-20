require('dotenv').config();
const express = require('express');
const path = require('path');
const { searchProducts } = require('./SerpAPIService');

const app = express();
const PORT = process.env.PORT;

// Configuración de vistas y archivos estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Views'));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta base (index)
app.get('/', (req, res) => {
    res.render('index');
});

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

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
