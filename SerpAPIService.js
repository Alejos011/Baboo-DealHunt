const { getJson } = require("serpapi");

async function searchProducts(query) 
{
    return new Promise((resolve, reject) => 
    {
        getJson({
            
            engine: "google_shopping",
            q: query,
            location: "Ciudad de México, México",
            hl: "es",
            gl: "mx",
            google_domain: "google.com.mx",
            api_key: process.env.SERP_API_KEY
        }
        ,(json) => 
        {
            if (json.error)
            {
                reject(json.error);
            } 
            
            else {
                const structuredResults = json.shopping_results
                    .filter(product => product.title.toLowerCase().includes(query.toLowerCase())) // Filtra por query en el título
                    .map(product => ({
                        title: product.title,
                        link: product.link,
                        price: product.price,
                        numericPrice: parsePrice(product.price),
                        rating: product.rating || "Sin calificación",
                        image: product.thumbnail,
                        reviews: product.reviews || 0,
                        source: product.source,
                    }))
                    .sort((a, b) => a.price - b.price); // Ordena por precio de menor a mayor

                // Agrupa los productos por tienda (source)
                const groupedByStore = structuredResults.reduce((acc, product) => {
                    if (!acc[product.source]) {
                        acc[product.source] = [];
                    }
                    acc[product.source].push(product);
                    return acc;
                }, {});

                resolve(groupedByStore);
            }
        });
    });
}

function parsePrice(price) {
    return parseFloat(price.replace(/[^0-9.-]+/g, ""));
}

module.exports = { searchProducts };
