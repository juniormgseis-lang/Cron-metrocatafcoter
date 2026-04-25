# Manual Técnico e de Utilização - Cronômetro TAF (COTER)

## 1. Introdução
Este aplicativo foi desenvolvido para o Comando de Operações Terrestres (COTER) do Exército Brasileiro, visando auxiliar na aplicação do Teste de Aptidão Física (TAF). O foco principal é a precisão cronométrica, facilidade de leitura e resiliência em dispositivos móveis.

---

## 2. Manual de Utilização

### 2.1 Interface Principal
- **Cronômetro**: Exibe o tempo no formato `MM:SS`. 
- **Sinalizadores de Status**:
    - **Sincronizado/Offline**: Indica se a conexão em tempo real para múltiplos dispositivos está ativa.
    - **Tela Travada/Livre**: Indica se o dispositivo está protegido contra o modo de espera (standby).
    - **Badge de Estado**: Mostra se o timer está "Aguardando", "Em andamento", "Pausado" ou "Finalizado".

### 2.2 Controle de Tempo
- **Botão Iniciar**: Começa a contagem e ativa automaticamente o bloqueio de tela.
- **Botão Pausar**: Interrompe a contagem mantendo o tempo atual.
- **Botão Retomar**: Continua a contagem de onde parou.
- **Botão Resetar**: Zera o cronômetro e retorna ao estado inicial (disponível apenas quando pausado).

### 2.3 Administração (Painel de Controle)
Para acessar as configurações, clique no ícone de engrenagem no rodapé:
1. Insira a senha de acesso (Padrão: `1234`).
2. No painel admin, você pode controlar o cronômetro para todos os dispositivos conectados.
3. A ativação do modo Admin mantém a tela ligada permanentemente.

### 2.4 Personalização de Temas
O sistema dispõe de três modos visuais:
- **Militar**: Verde-oliva tático com detalhes em âmbar.
- **Noturno**: Azul profundo para operações com baixa luminosidade.
- **Claro**: Fundo areia/bege para ambientes administrativos ou alta incidência solar.

---

## 3. Especificações Técnicas (Scripts Atuais)

### 3.1 Lógica de Temas (`src/lib/themes.ts`)
Implementa o sistema de classes dinâmicas para alteração de tokens de cores em HSL.
```typescript
// IDs dos Temas: 'theme-military', 'theme-night', 'theme-light'
// Persistência: LocalStorage (chave 'taf-theme')
```

### 3.2 Gerenciamento de Tela (Wake Lock)
Localizado em `src/App.tsx`, utiliza a API `navigator.wakeLock` para impedir o standby do celular. 
- Ativação: Ao iniciar o timer ou entrar no modo Admin.
- Resiliência: Reativa automaticamente se a aba ganhar foco novamente.

### 3.3 Estilização (`src/index.css`)
Utiliza Tailwind CSS 4.0 com variáveis CSS para garantir que a troca de tema seja fluida e sem recarregamento de página.

---

## 4. Anexos: Conteúdo dos Scripts

### App.tsx (Núcleo da Aplicação)
```tsx
// Script que gerencia o estado global, sincronização e Wake Lock
// [Código atualizado em 23/04/2026]
```

### useTimer.ts (Gancho Customizado)
```typescript
// Gerencia a precisão de 1000ms e transições de estado (running -> paused)
```

### index.css (Definição de Cores)
```css
/* Definições de HSL para os 3 temas oficiais */
```

---
**Desenvolvimento**: ST Ernani P. Júnior
**Tecnologias**: React, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
