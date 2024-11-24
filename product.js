document.addEventListener('DOMContentLoaded', () => {
    const trackBtn = document.getElementById('track-btn');
    const trackMessage = document.getElementById('track-message');

    trackBtn.addEventListener('click', () => {
        fetch('/track-product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId,
                title: productTitle,
                price: productPrice,
                image: productImage,
                queryId: queryId
            }),
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Error al rastrear el producto');
            }
        })
        .then(result => {
            trackMessage.style.display = 'block';
            trackBtn.disabled = true;
            trackBtn.innerText = 'Producto en seguimiento';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al rastrear el producto. Por favor, intenta nuevamente.');
        });
    });
});
