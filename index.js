require('dotenv').config();

//const express settings
const express = require('express');
const app = express();
const PORT = process.env.PORT;
const { searchProducts } = require('./SerpAPIService');
const path = require('path');

//app set
//EJS settings -> define path
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Views'));

//app get
//Query Settings -> get req
app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).send("El parámetro query no está especificado");
    }

    try {
        const productsGroupedByStore = await searchProducts(query);

        // Ordena las tiendas en función del precio más bajo
        const sortedStores = Object.entries(productsGroupedByStore)
            .sort(([, productsA], [, productsB]) => {
                const minPriceA = Math.min(...productsA.map(p => p.numericPrice));
                const minPriceB = Math.min(...productsB.map(p => p.numericPrice));
                return minPriceA - minPriceB;
            });

        // Convierte el array ordenado de tiendas en un objeto nuevamente
        const orderedProductsGroupedByStore = Object.fromEntries(sortedStores);

        res.render('products', { groupedItems: orderedProductsGroupedByStore });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al buscar productos");
    }
});


/*****VIEWS  RENDERING******/

// default view -> render index
app.get('/', (req, res) => {
    res.render('index');
});



/*********PORT LISTENING**********/
//app listen port
app.listen(PORT, () => 
{
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
