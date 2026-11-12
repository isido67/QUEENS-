# 👑 Reinas · Entrenador

Entrenador para puzzles de reinas (el estilo de Queens de LinkedIn), hecho con HTML, CSS y JavaScript puro. No necesita servidor ni instalación.

## Reglas

- Pon exactamente **una reina** en cada fila, cada columna y cada región de color.
- Dos reinas **no pueden tocarse**, ni siquiera en diagonal.
- Toca una casilla para marcar ✕, tócala otra vez para poner 👑. Arrastra para marcar varias ✕ seguidas.

## Modos

- **🎓 Práctica guiada.** El botón *Siguiente paso* encuentra la próxima deducción lógica desde tu tablero actual, la marca en el tablero y explica por qué funciona. Si aplicas el paso, te muestra el siguiente, así puedes recorrer un puzzle entero aprendiendo cada técnica. Si te equivocas, primero te dice qué corregir.
- **⏱️ Competitivo.** Contra el reloj y sin pistas. Elige *Sin errores* (una reina mal puesta y pierdes) o *Penalización* (+10 s por error). Guarda récord y promedio por dificultad.
- **📅 Desafío diario.** Un puzzle fijo por día, con archivo de los últimos 60 días. Lunes y martes fácil, miércoles y jueves medio, viernes y sábado difícil, domingo experto.
- **🎨 Crear o cargar.** Pinta las regiones de cualquier puzzle (por ejemplo, uno que resolviste en otra app) y el entrenador verifica que tenga solución única, te dice qué técnica necesita y te deja practicarlo o jugarlo con tiempo. Puedes guardarlo o compartirlo por link.
- **📈 Estadísticas.** Récords, promedios, racha del diario e historial de tiempos.

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
