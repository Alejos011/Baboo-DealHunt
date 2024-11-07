const { getJson } = require("serpapi");

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
                const structuredResults = json.shopping_results.map(product => ({
                    title: product.title,
                    link: product.link,
                    price: product.price,
                    rating: product.rating || "Sin calificación",
                    image: product.thumbnail,
                    reviews: product.reviews || 0,
                    source: product.source,
                    shipping: product.additional_price?.shipping || "No disponible",
                }));

                resolve(structuredResults);
            }
        });
    });
}

module.exports = { searchProducts };
