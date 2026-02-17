document.addEventListener('DOMContentLoaded', function() {
    // Obtener todas las celdas de la tabla
    const celdas = document.querySelectorAll('.grid-ingredientes > .row > div:not(.col-composicion)');
    
    celdas.forEach(celda => {
        celda.addEventListener('click', function() {
            this.classList.toggle('marked');
        });
    });
});