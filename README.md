# Jugada Maestra


**App (móvil):** https://faraelv.github.io/boardgames-strategy/ · Repositorio: `faraelv/boardgames-strategy`
**Copia para PC:** página de Claude https://claude.ai/artifact/GPWajgPg3QXnveA4BTEAms (privada; el contenido es el mismo que el de la app)

PWA hermana de Ronda Cero: solo las mejores estrategias para ganar en cada juego. Ronda Cero se queda con la preparación, el turno y los puntos; aquí no se repite nada de eso.

- Misma estructura que Ronda Cero: un JSON por juego en `games/`, app en `src/`, `scripts/build.mjs` construye `dist/`.
- Funciona sin conexión, aviso de «Actualizar», pantalla siempre encendida, botón atrás de Android (navegación por `#juego` o `#juego-plan`).
- `npm run check` valida los juegos; `npm run build` genera `dist/` y una vista previa de un solo fichero en `dist-preview/`.

## Cada actualización (obligatorio)

1. Editar `games/*.json` (o la app) y pasar `npm run check`.
2. `npm run build`: genera `dist/` y la copia de un solo fichero `dist-preview/jugada-maestra.html`.
3. Commit y push a `main`: GitHub publica la app del móvil.
4. **Republicar la copia para PC**: publicar `dist-preview/jugada-maestra.html` en la página de arriba con la herramienta Artifact, pasando su URL como `url` (si no, se crea otra página nueva).
5. Comprobar que la versión del pie de la lista es la misma en las dos.

## Formato de un juego

```json
{ "id": "oldKingsCrown", "name": "La corona del viejo rey", "plans": [ { … } ] }
```

`id` igual que en Ronda Cero (así reutiliza portada y tono de `src/covers/`). Cada plan (una facción, un enfoque…):

- `id`, `title`, `kind` (Facción, General…), `thesis` (la idea en una o dos frases), `style` opcional.
- `strengths` / `weaknesses`: listas.
- `phases`: `{ when, goal, do: [], ordered?, note?, check? }` → línea de tiempo «Ronda a ronda».
- `keys`: `{ title, when, text }` → «Cuándo usar cada táctica» (o «Claves» si no hay fases).
- `cards`: `{ title, items, after? }`; cada item es texto o una carta `{ image, name, original, text: [], why }` (imagen en `src/cards/`, recortada sin el texto en inglés), `warnings`: lista «Ojo», `pending`: aviso «Por verificar».
- `sources`: `{ title, url? }`.
- Textos en español, con palabras propias y sin nombres originales en inglés. `**negrita**` admitida.

## Contenido actual
- La corona del viejo rey · Nobleza (guía de Jaffles + guías oficiales, Reina y cartas de reino verificadas), Claves comunes y Otras facciones (pistas). Pendiente: Virrey y costes de El Manto.
- Brass: Birmingham · Claves comunes, Hierro y cerveza (BRIC), Manufacturas y cerámica, Algodón. Pendiente: PV de las fundiciones.
- SETI · Plan general (guía de SpiderForge) y Especies. Pendiente: detalles de Centaurianos y 'Oumuamua.
- Five Tribes · Consejos sueltos (de dudas resueltas en partida).
