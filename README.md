# 👑 Reinas · Entrenador

Entrenador para puzzles de reinas (el estilo de Queens de LinkedIn), hecho con HTML, CSS y JavaScript puro. No necesita servidor ni instalación.

## Reglas

- Pon exactamente **una reina** en cada fila, cada columna y cada región de color.
- Dos reinas **no pueden tocarse**, ni siquiera en diagonal.
- Toca una casilla para marcar ✕, tócala otra vez para poner 👑. Arrastra para marcar varias ✕ seguidas.

## Modos

- **Práctica guiada.** El botón *Siguiente paso* encuentra la próxima deducción lógica desde tu tablero actual, la marca y explica por qué funciona. Si aplicas el paso, te muestra el siguiente. El tablero no te avisa si una reina está mal puesta; solo si chocan dos reinas. Si pides una pista con un error en el tablero, primero te dice qué corregir. Con el interruptor *Bloqueo automático* decides si al poner una reina se tachan solas las casillas que ataca.
- **Competitivo.** Contra el reloj y sin pistas. Igual que en el juego original, una reina mal puesta no se avisa: solo se marcan en rojo las reinas que chocan entre sí. Guarda récord y promedio por dificultad.
- **Desafío diario.** Un puzzle fijo por día, con archivo de los últimos 60 días. Lunes y martes fácil, miércoles y jueves medio, viernes y sábado difícil, domingo experto.
- **Estadísticas.** Récords, promedios, racha del diario e historial de tiempos.

## Técnicas que enseña

| Nivel | Técnica | Idea |
|---|---|---|
| 0 | Eliminación básica | Una reina descarta su fila, columna, región y vecinas. |
| 1 | Única opción | Si a una fila, columna o región le queda una sola casilla, la reina va ahí. |
| 2 | Región encerrada | Si una región cabe entera en una fila (o columna), el resto de esa fila se descarta. |
| 3 | Pares y amenazas | Dos regiones en dos filas, o una casilla que dejaría a otra unidad sin espacio. |
| 4 | Grupos grandes | Lo mismo con 3 o más regiones, filas o columnas. |
| 5 | Hipótesis en cadena | Suponer una reina, seguir las deducciones y llegar a una contradicción. |

Los niveles se generan al azar y siempre tienen **solución única que se puede alcanzar solo con lógica**.

## Publicar con GitHub Pages

1. En el repositorio, ve a **Settings → Pages**.
2. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
3. En un par de minutos queda en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

## Estructura

```
index.html        Pantallas de la app
css/estilos.css   Estilos (incluye modo oscuro)
js/motor.js       Reglas, solucionador paso a paso con explicaciones y generador
js/app.js         Interfaz, modos de juego, editor y estadísticas
```

Tus resultados se guardan en el navegador (localStorage).

*Proyecto independiente, sin relación con LinkedIn.*
