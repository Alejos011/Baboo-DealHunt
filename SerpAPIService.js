const { getJson } = require("serpapi");

// En SerpAPIService.js

async function searchProducts(query) {
    return new Promise((resolve, reject) => {
        getJson({
            engine: "google_shopping",
            q: query,
            location: "Ciudad de México, México",
            hl: "es",
            gl: "mx",
            google_domain: "google.com.mx",
            api_key: process.env.SERP_API_KEY
        }, (json) => {
            if (json.error) {
                reject(json.error);
            } else {
                const queryWords = query.toLowerCase().split(" ");

                const structuredResults = json.shopping_results
                    .filter(product => {
                        const titleLower = product.title.toLowerCase();
                        return queryWords.every(word => titleLower.includes(word));
                    })
                    .map(product => ({
                        title: product.title,
                        link: product.link,
                        price: product.price,
                        numericPrice: parsePrice(product.price), // Precio numérico para ordenar
                        rating: product.rating || "Sin calificación",
                        image: product.thumbnail,
                        reviews: product.reviews || 0,
                        source: product.source,
                        shipping: product.additional_price?.shipping || "No disponible",
                    }));

                // Agrupamos los productos por tienda
                const groupedByStore = structuredResults.reduce((acc, product) => {
                    if (!acc[product.source]) {
                        acc[product.source] = [];
                    }
                    acc[product.source].push(product);
                    return acc;
                }, {});

                // Ordenamos las tiendas por el precio más bajo de sus productos
                const sortedStores = Object.entries(groupedByStore)
                    .map(([store, products]) => {
                        // Obtener el precio mínimo de los productos de esta tienda
                        const minPrice = Math.min(...products.map(item => item.numericPrice));
                        return [store, products, minPrice]; // Devolvemos la tienda con su precio mínimo
                    })
                    .sort((a, b) => a[2] - b[2]); // Ordenamos por el precio mínimo (índice 2)

                // Ahora reconstruimos el objeto agrupado por tienda con los resultados ordenados
                const sortedGroupedStores = sortedStores.reduce((acc, [store, products]) => {
                    acc[store] = products;
                    return acc;
                }, {});

                resolve(sortedGroupedStores);
            }
        });
    });
}

function parsePrice(price) {

    return parseFloat(price.replace(/[^0-9.-]+/g, ""));
}


module.exports = { searchProducts };
