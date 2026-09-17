# Arquitetura — Pirate Battle

Visão geral: SPA estática. 

**React** é dono das telas e do estado de UI;

**PixiJS** é dono da arena ( WebGL/Canvas );

**MSW** simula o backend de ranking/histórico no próprio navegador; 

**localStorage** é a camada de persistência (opções, último resultado, fila pendente e o "banco" do mock).

---


## Integração React ↔ PixiJS

- `GameCanvas.tsx` cria **uma** instância de `Game` por sessão dentro de um
  `useEffect` (host = div ref) e a destrói no cleanup. "Play again" troca a
  `key` do componente ⇒ remount ⇒ instância nova: reinício limpo por construção,
  sem estado residual (testado em `play again produces a clean restart` e
  `repeated screen navigation leaks no canvases`).
- A engine **nunca** chama React por frame. A ponte é o `hudStore` (zustand):
  `Game` publica snapshots (~10/s) via `onHudSnapshot`; componentes React
  assinam seletivamente. Isso evita re-render da árvore React a cada frame.
- Fluxo inverso (React→engine) apenas para comandos discretos: `setVirtualInput`
  (controles de toque), via ref da instância — nunca via props/state.
- Fases da tela (`loading | ready | error`) são estado React derivado dos
  callbacks da engine (`onProgress`, `init().catch`). Erro de assets ⇒ `role="alert"`
  + botão Retry (reload sem o parâmetro de falha).
- O `GameOptions` (duração, spawn, seed) é lido no mount: `loadOptions()`
  (validado) + overrides de URL apenas sob `?test=1` (jogadores não podem
  injetar configuração).

---

## Ciclo da simulação

- `PIXI.Ticker` chama `Game.update()` a cada rAF. Delta real é limitado por
  `maxDeltaMs` (anti "spiral of death" ao voltar de aba em background).
- **Modo de teste** (seed presente): timestep fixo de 1/60s por update e RNG
  seeded ⇒ simulação determinística e reproduzível; é isso que permite os testes
  de spawn-interval medirem `durationPlayed` (relógio do jogo) e as baselines
  visuais serem estáveis.
- Ordem dentro de update: input → movimento do player → spawn (acumulador com
  intervalo configurável) → IA dos inimigos → projéteis → colisões → dano/morte
  → cronômetro → snapshot HUD → render.
- Pausa (`P`, blur, overlay): update retorna cedo; ticker continua mas nada
  avança (cronômetro, cooldowns e entidades congelam). Retomada por tecla ou
  clique não cobra o tempo pausado (testado com tolerância < 0,5s).
- Fim de partida (tempo OU morte): `endMatch` congela tudo (`matchState='ended'`),
  monta o `MatchResult` com `clientId` (UUID) e notifica React; a simulação para
  de atualizar — entidades e projéteis ficam congelados na cena (testado).

---

## Colisões

- `CollisionSystem` centraliza: projétil↔entidade (raio vs raio, distância ao
  quadrado — sem `sqrt` no hot path), entity↔ilhas (point-in-tile via mapa de
  tiles sólidos) e limites da arena (clamp).
- Movimento do player valida a posição candidata antes de aplicar: o navio nunca
  entra em tile sólido (testado por amostragem: 20 posições ao longo de 10s,
  nenhuma `isSolid`, todas dentro dos limites).
- Dano: projétil de inimigo ⇒ HP do player; contato de Chaser ⇒ dano de contato
  uma vez por colisão; projétil do player ⇒ HP do inimigo; morte pontua
  **exatamente uma vez** (flag `alive` removida no mesmo tick do score).

---

## Gerenciamento de recursos (assets)

- `AssetLoader` carrega sprites/sons com progresso (0..1) reportado ao React;
  falha total ⇒ estado de erro com retry. Texturas pequenas são procedurais/
  inline, o que mantém o deploy simples (sem CDN de assets).
- `Game.destroy()` destrói texturas/graphics e a aplicação PIXI, remove
  listeners (teclado, blur, pointer) e apaga `__PIRATE_TEST__` — sem vazamento
  entre sessões (testado no fluxo de navegação repetida: 3 ciclos menu→jogo→
  menu sem canvases órfãos nem pageerrors).

---

## Persistência local

Três chaves, todas versionadas por prefixo `pirate-battle:`:

| Chave | Conteúdo | Escrita | Leitura |
|---|---|---|---|
| `options` | `{matchDuration, spawnInterval}` | Options screen | `loadOptions()` com whitelist (valores fora da lista ⇒ defaults do config) |
| `last-result` | último `MatchResult` | fim de partida | Menu ("Last voyage") e tela de resultado após refresh |
| `pending` | fila de `MatchResult` não confirmados | fim de partida (enqueue **antes** do POST) | boot do app (`flushPending`) |

Todo acesso é envolvido em try/catch: localStorage cheio/indisponível (modo
privado restrito) degrada sem quebrar o jogo.

---

## Integração ranking/histórico (MSW + React Query)

### Contratos HTTP

| Endpoint | Resposta |
|---|---|
| `GET /api/history?page=N` | `Page<HistoryEntry>` = `{items, total, page, pages}` (5/página, ordenado por `endedAt` desc) |
| `GET /api/ranking?page=N` | `Page<RankingEntry>` (top scores derivados do history, ordenado por score desc, com `rank`) |
| `POST /api/history` | corpo = `MatchResult` ⇒ `201` + entry criado; **`200` + entry existente se o `clientId` já foi registrado** (idempotência); `400` se inválido |

O "banco" do mock é `localStorage['pirate-battle:history']`. Ranking é uma
**projeção** do history (fonte única de verdade — sem divergência possível).

---
