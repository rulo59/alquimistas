$(document).ready(function () {
    const ingredientesOrden = ['seta', 'planta', 'rana', 'pata', 'flor', 'mandragora', 'escorpion', 'pluma'];
    const columnas = ['col-seta', 'col-planta', 'col-rana', 'col-pata', 'col-flor', 'col-mandragora', 'col-escorpion', 'col-pluma'];
    const colores = ['red', 'green', 'blue'];

    const indiceIngrediente = {};
    $.each(ingredientesOrden, function (index, ingrediente) {
        indiceIngrediente[ingrediente] = index + 1;
    });

    const clasesEstado = [
        'estado-red-plus',
        'estado-red-minus',
        'estado-green-plus',
        'estado-green-minus',
        'estado-blue-plus',
        'estado-blue-minus',
        'estado-neutral'
    ];

    const estadosConfig = {
        'red-plus': { clase: 'estado-red-plus', sign: '+' },
        'red-minus': { clase: 'estado-red-minus', sign: '−' },
        'green-plus': { clase: 'estado-green-plus', sign: '+' },
        'green-minus': { clase: 'estado-green-minus', sign: '−' },
        'blue-plus': { clase: 'estado-blue-plus', sign: '+' },
        'blue-minus': { clase: 'estado-blue-minus', sign: '−' },
        neutral: { clase: 'estado-neutral', sign: '0' }
    };

    let circuloActivo = null;

    $('.piramide').each(function () {
        $(this).find('.col-1 .circulo').each(function (index) {
            const ingredienteBase = ingredientesOrden[index];
            if (ingredienteBase) {
                $(this).attr('data-base', ingredienteBase);
            }
        });
    });

    const normalizarSigno = (signo) => {
        if (signo === '−') {
            return '-';
        }
        return signo;
    };

    const obtenerFirmaFila = (celda) => {
        const fila = celda.closest('.tabla-row');
        const firma = {};

        $.each(colores, function (_, color) {
            const raw = String(fila.attr(`data-${color}`) || '');
            const partes = raw.split(',');
            firma[color] = normalizarSigno((partes[1] || '').trim());
        });

        return firma;
    };

    const obtenerClaveComposicionFila = (celda) => {
        const fila = celda.closest('.tabla-row');
        const red = String(fila.attr('data-red') || '').split(',');
        const green = String(fila.attr('data-green') || '').split(',');
        const blue = String(fila.attr('data-blue') || '').split(',');

        const redKey = `${(red[0] || '').trim()},${normalizarSigno((red[1] || '').trim())}`;
        const greenKey = `${(green[0] || '').trim()},${normalizarSigno((green[1] || '').trim())}`;
        const blueKey = `${(blue[0] || '').trim()},${normalizarSigno((blue[1] || '').trim())}`;

        return `${redKey}|${greenKey}|${blueKey}`;
    };

    const obtenerClaveComposicionToken = (token) => {
        const red = `${token.top[2]},${normalizarSigno(token.top[1])}`;
        const green = `${token.left[2]},${normalizarSigno(token.left[1])}`;
        const blue = `${token.right[2]},${normalizarSigno(token.right[1])}`;
        return `${red}|${green}|${blue}`;
    };

    const sincronizarVisualMarca = (celda) => {
        celda.toggleClass('marked', celda.hasClass('manual-marked') || celda.hasClass('auto-marked'));
    };

    const limpiarMarcasAuto = () => {
        $('#tabla-grid .tabla-cell.auto-marked').each(function () {
            const celda = $(this);
            celda.removeClass('auto-marked');
            sincronizarVisualMarca(celda);
        });
    };

    function actualizar_tabla() {
        if (!$('#tabla-grid').length) {
            return;
        }

        limpiarMarcasAuto();

        const pistasSimbolo = [];
        const pistasNeutro = [];

        $('.bg-dark .circulo.has-state').each(function () {
            const circulo = $(this);
            const stateKey = String(circulo.attr('data-state') || '').trim();
            const ingredientes = String(circulo.attr('data-ingredientes') || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

            if (ingredientes.length !== 2 || !stateKey) {
                return;
            }

            if (stateKey === 'neutral') {
                pistasNeutro.push(ingredientes);
                return;
            }

            const partes = stateKey.split('-');
            const color = partes[0];
            const signo = partes[1] === 'plus' ? '+' : '-';

            if (!colores.includes(color)) {
                return;
            }

            pistasSimbolo.push({ ingredientes, color, signo });
        });

        $.each(pistasSimbolo, function (_, pista) {
            $.each(pista.ingredientes, function (_, ingrediente) {
                const colIndex = indiceIngrediente[ingrediente];
                if (!colIndex) {
                    return;
                }

                $(`#tabla-grid .tabla-cell[data-columna='${colIndex}']`).each(function () {
                    const celda = $(this);
                    if (celda.hasClass('manual-marked')) {
                        return;
                    }

                    const firma = obtenerFirmaFila(celda);
                    if (firma[pista.color] && firma[pista.color] !== pista.signo) {
                        celda.addClass('auto-marked');
                        sincronizarVisualMarca(celda);
                    }
                });
            });
        });

        const buscarClaveOpuesta = (clave) => {
            let opuesta = null;

            $.each(composicionesNeutras, function (_, par) {
                const claveA = obtenerClaveComposicionToken(par[0]);
                const claveB = obtenerClaveComposicionToken(par[1]);

                if (clave === claveA) {
                    opuesta = claveB;
                    return false;
                }

                if (clave === claveB) {
                    opuesta = claveA;
                    return false;
                }
            });

            return opuesta;
        };

        let huboCambios = true;
        while (huboCambios) {
            huboCambios = false;

            $.each(pistasNeutro, function (_, parIngredientes) {
                const colA = indiceIngrediente[parIngredientes[0]];
                const colB = indiceIngrediente[parIngredientes[1]];

                if (!colA || !colB) {
                    return;
                }

                const propagarOpuestas = (origen, destino) => {
                    $(`#tabla-grid .tabla-cell[data-columna='${origen}']`).each(function () {
                        const celdaOrigen = $(this);
                        const origenMarcado = celdaOrigen.hasClass('manual-marked') || celdaOrigen.hasClass('auto-marked');

                        if (!origenMarcado) {
                            return;
                        }

                        const claveOrigen = obtenerClaveComposicionFila(celdaOrigen);
                        const claveOpuesta = buscarClaveOpuesta(claveOrigen);

                        if (!claveOpuesta) {
                            return;
                        }

                        $(`#tabla-grid .tabla-cell[data-columna='${destino}']`).each(function () {
                            const celdaDestino = $(this);

                            if (celdaDestino.hasClass('manual-marked') || celdaDestino.hasClass('auto-marked')) {
                                return;
                            }

                            const claveDestino = obtenerClaveComposicionFila(celdaDestino);
                            if (claveDestino === claveOpuesta) {
                                celdaDestino.addClass('auto-marked');
                                sincronizarVisualMarca(celdaDestino);
                                huboCambios = true;
                                return false;
                            }
                        });
                    });
                };

                propagarOpuestas(colA, colB);
                propagarOpuestas(colB, colA);
            });
        }
    }

    const limpiarHighlightIngrediente = () => {
        $('.bg-dark .circulo').removeClass('highlight-ingrediente');
    };

    const resaltarPorIngrediente = (ingrediente) => {
        $('.bg-dark .circulo').each(function () {
            const ingredientes = String($(this).data('ingredientes') || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

            $(this).toggleClass('highlight-ingrediente', ingredientes.includes(ingrediente));
        });
    };

    $('.ingredientes-head .ingrediente').each(function () {
        const ingrediente = $(this).data('ingrediente');
        if (!ingrediente) {
            return;
        }

        $(this).on('mouseenter', function () {
            resaltarPorIngrediente(ingrediente);
        });

        $(this).on('mouseleave', function () {
            limpiarHighlightIngrediente();
        });
    });

    const limpiarEstadoCirculo = (circulo) => {
        if (!circulo || !circulo.length) {
            return;
        }

        circulo
            .removeClass(clasesEstado.join(' '))
            .removeClass('has-state')
            .removeAttr('data-sign')
            .removeAttr('data-state');
    };

    const aplicarEstadoCirculo = (circulo, stateKey) => {
        limpiarEstadoCirculo(circulo);
        const config = estadosConfig[stateKey];

        if (!config) {
            return;
        }

        circulo
            .addClass(`has-state ${config.clase}`)
            .attr('data-state', stateKey)
            .attr('data-sign', config.sign);
    };

    const abrirModal = (circulo) => {
        if (!$('#modal-piramide').length) {
            return;
        }

        circuloActivo = circulo;
        $('#modal-piramide').addClass('is-open').attr('aria-hidden', 'false');
    };

    const cerrarModal = () => {
        if (!$('#modal-piramide').length) {
            return;
        }

        $('#modal-piramide').removeClass('is-open').attr('aria-hidden', 'true');
        circuloActivo = null;
    };

    $('.bg-dark .circulo').on('click', function () {
        abrirModal($(this));
    });

    $('.modal-piramide__option').on('click', function () {
        if (!circuloActivo || !circuloActivo.length) {
            return;
        }

        const stateKey = $(this).data('state');
        if (stateKey === 'clear') {
            limpiarEstadoCirculo(circuloActivo);
        } else {
            aplicarEstadoCirculo(circuloActivo, stateKey);
        }

        actualizar_tabla();

        cerrarModal();
    });

    $('[data-close-modal="true"]').on('click', cerrarModal);

    $(document).on('keydown', function (event) {
        if (event.key === 'Escape') {
            cerrarModal();
        }
    });

    $('#btn-actualizar-tabla').on('click', function () {
        actualizar_tabla();
    });

    $('#btn-limpiar-tabla').on('click', function () {
        $('#tabla-grid .tabla-cell').removeClass('manual-marked auto-marked marked');
    });

    if (!$('#tabla-grid').length) {
        return;
    }

    const filasComposicion = [
        { top: ['red', '-', 'small'], left: ['green', '+', 'small'], right: ['blue', '-', 'big'] },
        { top: ['red', '+', 'small'], left: ['green', '−', 'small'], right: ['blue', '+', 'big'] },
        { top: ['red', '+', 'small'], left: ['green', '-', 'big'], right: ['blue', '−', 'small'] },
        { top: ['red', '-', 'small'], left: ['green', '+', 'big'], right: ['blue', '+', 'small'] },
        { top: ['red', '-', 'big'], left: ['green', '−', 'small'], right: ['blue', '+', 'small'] },
        { top: ['red', '+', 'big'], left: ['green', '+', 'small'], right: ['blue', '−', 'small'] },
        { top: ['red', '−', 'big'], left: ['green', '−', 'big'], right: ['blue', '−', 'big'] },
        { top: ['red', '+', 'big'], left: ['green', '+', 'big'], right: ['blue', '+', 'big'] }
    ];

    const composicionesNeutras = [
        [
            { top: ['red', '-', 'small'], left: ['green', '+', 'small'], right: ['blue', '-', 'big'] },
            { top: ['red', '+', 'small'], left: ['green', '−', 'small'], right: ['blue', '+', 'big'] },
        ],
        [
            { top: ['red', '+', 'small'], left: ['green', '-', 'big'], right: ['blue', '−', 'small'] },
            { top: ['red', '-', 'small'], left: ['green', '+', 'big'], right: ['blue', '+', 'small'] },
        ],
        [
            { top: ['red', '-', 'big'], left: ['green', '−', 'small'], right: ['blue', '+', 'small'] },
            { top: ['red', '+', 'big'], left: ['green', '+', 'small'], right: ['blue', '−', 'small'] },
        ],
        [
            { top: ['red', '−', 'big'], left: ['green', '−', 'big'], right: ['blue', '−', 'big'] },
            { top: ['red', '+', 'big'], left: ['green', '+', 'big'], right: ['blue', '+', 'big'] },
        ]
    ]

    const crearToken = (token) => `
        <div class="composicion-token">
            <div class="circulo-comp ${token.top[0]} ${token.top[2]}">${token.top[1]}</div>
            <div class="circulo-comp-bottom d-flex align-items-center justify-content-center">
                <div class="circulo-comp ${token.left[0]} ${token.left[2]}">${token.left[1]}</div>
                <div class="circulo-comp ${token.right[0]} ${token.right[2]}">${token.right[1]}</div>
            </div>
        </div>
    `;

    const formatoDataComp = (parte) => {
        const signo = parte[1] === '−' ? '-' : parte[1];
        return `${parte[2]},${signo}`;
    };

    $.each(filasComposicion, function (filaIndex, token) {
        const fila = $('<div>', { class: 'row g-0 tabla-row' })
            .attr('data-red', formatoDataComp(token.top))
            .attr('data-green', formatoDataComp(token.left))
            .attr('data-blue', formatoDataComp(token.right));

        fila.append($('<div>', { class: 'col-2' }));

        $.each(columnas, function (colIndex, claseColumna) {
            const celda = $('<div>', {
                class: `col-1 tabla-cell ${claseColumna}`,
                'data-fila': String(filaIndex + 1),
                'data-columna': String(colIndex + 1),
                html: crearToken(token)
            });

            fila.append(celda);
        });

        fila.append($('<div>', { class: 'col-2' }));
        $('#tabla-grid').append(fila);
    });

    $('#tabla-grid').on('click', '.tabla-cell', function () {
        const celda = $(this);
        celda.toggleClass('manual-marked');
        sincronizarVisualMarca(celda);
    });
});