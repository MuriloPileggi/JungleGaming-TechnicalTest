# Pirate Battle

Jogo de batalha naval 2D em navegador: React (UI/telas) + PixiJS (arena/renderização),
com backend simulado no próprio navegador via MSW (ranking e histórico).

**URL pública (deploy):** https://jungle-gaming-technical-test.vercel.app/

A versão publicada corresponde ao código deste repositório e executa os mocks de
ranking e histórico. O jogo funciona ao abrir ou recarregar a URL (inclusive em
rotas profundas como `/history`, via rewrite SPA no `vercel.json`).

---

## Setup

Pré-requisito: Node.js ≥ 20.

```bash

npm ci            # instala dependências a partir do lockfile (package-lock.json)
npx playwright install chromium   # baixa o navegador dos testes E2E
npm run dev       # http://localhost:5173

```

A solução roda a partir de um checkout limpo, sem depender de serviços privados:
o "backend" (ranking/histórico) é simulado no navegador com MSW + localStorage.

---

## Variáveis de ambiente

Nenhuma. O projeto não utiliza variáveis de ambiente — nem em desenvolvimento,
nem em produção. Toda a configuração de gameplay é feita pela tela de Options
(persistida em localStorage) e os cenários de teste/rede são selecionados por
parâmetros de URL (ver abaixo).

---

## Comandos

| Comando                   | Descrição                                                |
| ------------------------- | -------------------------------------------------------- |
| `npm run dev`             | Servidor de desenvolvimento (Vite)                       |
| `npm run build`           | Build de produção em `dist/`                             |
| `npm run preview`         | Serve o build de produção localmente                     |
| `npm run lint`            | ESLint                                                   |
| `npx tsc -b`              | Verificação de tipos (TypeScript, sem emissão)           |
| `npm run test:e2e`        | Suíte Playwright (60 testes: desktop + mobile, Chromium) |
| `npm run test:e2e:report` | Abre o relatório HTML dos testes (`playwright-report/`)  |

---

## Controles

### Teclado (desktop)

| Tecla                        | Ação                                         |
| ---------------------------- | -------------------------------------------- |
| W                            | Acelera (vela) na direção atual              |
| A / D                        | Gira o navio (leme)                          |
| Espaço                       | Disparo frontal (com cooldown)               |
| Q / E                        | Salva lateral (broadside) esquerda / direita |
| P                            | Pausa / retoma                               |
| Enter, Espaço, Esc ou clique | Retoma quando pausado                        |

### Toque (mobile)

Botões em tela quando o dispositivo é touch (ou com ?touch=1):

Canto inferior esquerdo: ◀ (girar), ▲ (vela), ▶ (girar)

Canto inferior direito: L (broadside esquerda), FIRE (disparo frontal), R (broadside direita)

Os botões de toque passam pelo mesmo caminho de input do teclado (InputSystem),
portanto valem as mesmas regras de cooldown, colisão e dano.

---

## Configuração de gameplay

Tela Options (persistida em localStorage):

- Match length: duração da partida (opções: 1 / 2 / 3 minutos; padrão 2:00)
- Enemy spawn interval: intervalo de spawn de inimigos (padrão 8s)

Valores inválidos ou adulterados no localStorage caem para os padrões configurados
(validação por whitelist em src/persistence/storage.ts).

O balanceamento (velocidades, dano, cooldowns, pontos por inimigo) vive centralizado em
src/config/gameConfig.ts

---

## Cenários de rede: seleção e reset

O backend é simulado com MSW (service worker interceptando fetch na página).
Para testes E2E, há instrumentação opcional, ativada apenas com ?test=1:

### Parâmetros de URL (modo de teste)

| Parâmetro      | Efeito                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| `?test=1`      | Ativa instrumentação (`window.__PIRATE_TEST__`, `window.__API_FAULTS__`) |
| `seed=<n>`     | RNG determinística (seed fixa ⇒ spawns e comportamento reproduzíveis)    |
| `duration=<s>` | Duração da partida em segundos                                           |
| `spawn=<s>`    | Intervalo de spawn em segundos                                           |
| `failAssets=1` | Injeta falha de carregamento de assets (com `test=1`)                    |
| `touch=1`      | Força os controles de toque                                              |

---

## Falhas de rede (console do navegador, com ?test=1)

**API_FAULTS**.failPost(1) // POST /api/history responde 500 (n vezes)

**API_FAULTS**.dropPost(1) // POST falha como conexão caída (n vezes)

**API_FAULTS**.delayPost(3000) // POST responde após 3s

**API_FAULTS**.failGet(2) // GETs de ranking/histórico respondem 500

**API_FAULTS**.delayGet(1500) // GETs atrasam 1,5s

**API_FAULTS**.reset() // RESET: remove todos os cenários ativos

---

## Reset completo dos dados locais

localStorage.clear(); location.reload();

Remove opções, último resultado, fila de envios pendentes e o "banco" do MSW
(ranking/histórico).

---

## Reproduzindo falhas (manual)

1. Asset falha + retry: abra /game?test=1&seed=42&failAssets=1 → tela de erro
   ("Failed to load game assets") → clique Retry → o jogo carrega normalmente.

2. Envio pendente recuperado após refresh: em /game?test=1, rode
   **API_FAULTS**.dropPost(1), termine a partida (morra) → o resultado fica em
   localStorage['pirate-battle:pending']. Recarregue a página sem falhas → o
   envio é reprocessado no boot e aparece em /history (sem duplicar).

3. Timeout sem duplicação: repita com failPost(3) e recarregue várias vezes —
   o clientId do resultado garante deduplicação no servidor mock.

4. Erro/empty/loading nas abas: em /history?test=1, use failGet(2) e clique
   na aba "Match History" → estado de erro com botão Retry; delayGet(1500) + troca
   de aba → estado de carregamento. Profile novo (localStorage vazio) → estado vazio.

5. Pausa por perda de foco: durante uma partida, alterne para outra janela →
   overlay PAUSED; ao voltar e clicar, o cronômetro continua de onde parou.

---

## Testes E2E

60 testes (30 cenários × projetos desktop e mobile, Chromium), cobrindo todos os
fluxos exigidos: navegação/opções, assets com falha e retry, movimento/rotação/
limites/colisão, combate (frontal, lateral, dano, cooldown, pontuação sem
duplicação), IA de Chaser e Shooter + intervalo de spawn, encerramento por tempo
e por morte com congelamento da simulação e reinício limpo, pausa/perda de foco,
persistência do resultado, abandono e navegação repetida, controles de toque,
abas Ranking/History com paginação e estados (loading/empty/error), registro de
partida com recuperação de pendentes, reenvio sem duplicação, respostas atrasadas
sem sobrescrever dados recentes, e regressão visual (menu, arena estável, tela de
resultado) com baselines versionadas em e2e/visual.spec.ts-snapshots/.
