# Minecraft Java Edition 26.2 catalog

The shipped catalog contains 1,537 registered item IDs, including the internal `air` item. It exposes 1,094 placeable items in the palette. Identity block items are combined with the official `Items` class registrations for mismatched IDs (such as wheat seeds → wheat and redstone → redstone wire). Wheat itself is a plain item and is excluded. Persistent entity placements (boats, rafts, minecarts, frames, armor stands, paintings, end crystals) and filled buckets are included. Spawn eggs and projectiles are excluded. Technical/creative-only block items remain available; survival obtainability is not a placement classification.

Primary source: [Mojang 26.2 release](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2), [official version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json).

- Official client JAR SHA-1: `2dc72797acbc1b63fc16a11c4ac393605f453754`
- Official Korean language asset SHA-1: `780bc9e4d23404661501363bdfc21c4dfdddd25c`
- Recipes, ingredient tags, English names and item registration bytecode are extracted directly from that JAR.
- Item registry and default components (including real stack sizes and translation keys) use [mcmeta's pinned 26.2-summary](https://github.com/misode/mcmeta/tree/26.2-summary), generated from the official game. No latest branch is used.
- `lib/generated/minecraft-26.2.json` is self-contained and versioned; its SHA-256 is stored next to it. Runtime use needs no third-party request.

The generator normalizes 1,536 fixed recipe variants, including an exact four-brick plain decorated-pot recipe. Data-dependent recipes are recorded separately. These include duplication, dye/imbue and item-component-sensitive recipes; they are not guessed as fixed ingredients. The registry is complete even where a recipe is not statically computable.

## Calculation behavior

The planner builds a dependency graph using the selected recipe and ingredient alternatives. It combines all demands before rounding each recipe's batch count, so shared materials aren't repeatedly rounded per parent. Required quantity, batches, output, surplus, base materials and returned containers are shown separately. Recipe and ingredient choices are editable. Common gathered commodities, such as iron ingots and diamonds, default to direct acquisition instead of recycling their storage blocks. Users can explicitly choose a refining/conversion recipe.

Self-replication, circular paths and expansion beyond 48 levels fall back to directly preparing the affected ingredient with a visible warning. There is no net-gain assumption for templates. Furnace fuel is excluded with a visible note because fuel efficiency varies. Bucket refilling is manual. Each placed blueprint cell consumes one item in the estimate, including fluids and entities; the editor does not model multi-cell beds/doors, actual placement constraints, entity geometry, redstone or fluid behavior. Server-backed shared snapshots preserve placement IDs, including `water` and `redstone_wire`. Legacy text-code sharing has been removed.

## Reproduce

From `studio`, run `powershell -File scripts/import-minecraft.ps1 -Javap <path-to-javap.exe>`. Network access is needed only for importing. Java 21 `javap` can inspect the non-obfuscated 26.2 class; the game is never launched. Downloaded JARs and intermediate data remain under ignored `outputs/` and are not published. Use `node scripts/check-materials.mjs` and `node scripts/check-core.mjs` for verification.

Minecraft names and recipe facts originate from Mojang; this app is not an official Minecraft product. Palette swatches and preview geometry are simplified app-generated representations, not bundled Minecraft textures.
