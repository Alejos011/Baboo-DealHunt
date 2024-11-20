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
    if (!query) {
        return res.render('products', { error: "No se especificó una consulta", groupedItems: null });
    }

    try {
        const productsGroupedByStore = await searchProducts(query);

        if (Object.keys(productsGroupedByStore).length === 0) {
            return res.render('products', { error: "No se encontraron resultados", groupedItems: null });
        }

        res.render('products', { error: null, groupedItems: productsGroupedByStore });
    } catch (error) {
        console.error("Error en la búsqueda:", error.message);
        res.render('products', { error: "Ocurrió un error al buscar productos", groupedItems: null });
    }
});

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
