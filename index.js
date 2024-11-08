require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT;
const { searchProducts } = require('./SerpAPIService');

app.get('/search', async (req, res) => 
{
    const query = req.query.q;
    if (!query) 
    {
        return res.status(400).send("El parámetro 'q' dentro del query no está especificado");
    }

    try 
    {
        const products = await searchProducts(query);
        res.json(products);
    } 
    
    catch (error)
    {
        console.error(error);
        res.status(500).send("Error al buscar productos");
    }
});

app.listen(PORT, () => 
{
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
