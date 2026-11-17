# Pokédex · Sistema visual

La solicitud fija rojo/blanco de la Poké Ball y el usuario confirmó una experiencia visual y lúdica. Catálogo de criaturas: ilustraciones protagonistas, una zona de descubrimiento y búsqueda convencional. Se implementa directamente en código; no se establece una preferencia global de flujo.

- Tipografía: Outfit Variable autoalojada; títulos 48–65 px en portada, 25–28 px de sección y 18–20 px en fichas. Pesos 400–650.
- Color: rojo `#ce2635`, tinta `#29282e`, fondo `#fffdf9`, colección `#f7f5f2`, carrusel rosa `#fbe4e5`. Tipos identificados por nombre y color, nunca solo color.
- Fichas de radio 14 px y una sola línea de borde. Fondos suaves por tipo y arte oficial recortado con transparencia.
- Escritorio: 4 columnas; tablet: 3; móvil: 2. Detalle en diálogo adaptable. Todos los controles tienen alternativa de teclado.
- Movimiento: entrada breve de fichas, transición del carrusel y balanceo de la Poké Ball solicitado. Sin bloquear el buscador durante solicitudes; se abortan respuestas obsoletas.
- Figma: fuente Outfit estática equivalente, componentes de botón y búsqueda SDS adaptados a marca; PokemonCard local instanciado, variables locales y espaciado de biblioteca. Ilustraciones individuales; ninguna captura completa como capa del entregable.

Revisión heurística de la implementación: 9/10. Sin bloqueos de severidad 3 o 4 en los flujos comprobados. Limitación menor (severidad 1): la definición precisa de origen queda documentada en README, pero podría explicarse junto al selector con una ayuda contextual. No equivale a una prueba de usabilidad con usuarios.
