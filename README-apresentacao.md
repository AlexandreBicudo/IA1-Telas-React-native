# Guia de Apresentação — SeuChefe Gourmet

Checklist para rodar e apresentar o app à banca usando **APK no celular + Supabase na nuvem**.

## Modos de execução

O app detecta automaticamente as variáveis em `.env`:

| `.env` | Modo | Comportamento |
|--------|------|---------------|
| Preenchido (URL + anon key) | **Nuvem** | Cadastro, login e catálogo usando o banco real (Supabase) |
| Vazio / ausente | **Mock** | Dados de exemplo, sem internet — rede de segurança para a banca |

> As variáveis são `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Veja `.env.example`.

## Rodar em desenvolvimento (no notebook)

```bash
npm install
npx expo start
```
Abra no **Expo Go** (celular) lendo o QR code, ou pressione `a` (Android) / `w` (web).

## Gerar o APK para a apresentação

O APK embute o JS e roda sozinho no celular (só precisa de internet para falar com o Supabase).

```bash
npm install -g eas-cli
eas login                 # conta Expo (crie em expo.dev se não tiver)
eas build:configure       # cria o eas.json (escolha Android)
eas build -p android --profile preview
```

⚠️ **As variáveis `EXPO_PUBLIC_*` precisam existir no momento do build.** O `.env` é local e **não** sobe para o build na nuvem. Garanta uma das opções:

- adicionar as chaves no `eas.json`, no profile `preview`:
  ```json
  {
    "build": {
      "preview": {
        "distribution": "internal",
        "android": { "buildType": "apk" },
        "env": {
          "EXPO_PUBLIC_SUPABASE_URL": "https://SEU-PROJETO.supabase.co",
          "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_..."
        }
      }
    }
  }
  ```
  (a anon/publishable key é pública por design — pode ficar no `eas.json`);
- ou usar `eas env:create` para registrar as variáveis no projeto Expo.

Ao final, o EAS gera um link para baixar o `.apk` — instale no celular (permita "fontes desconhecidas").

## Checklist do dia da banca

- [ ] **Restaurar o projeto Supabase** se estiver pausado (plano Free pausa após ~7 dias sem uso). Painel → projeto → **Restore**. Testar **na véspera**.
- [ ] APK já instalado no celular **antes** de chegar.
- [ ] Usar o **hotspot 4G/5G do próprio celular** — não depender do Wi-Fi do local.
- [ ] Fazer um **cadastro + login de teste** antes da apresentação para confirmar o fluxo.
- [ ] Plano B pronto: se a internet falhar, um build em **modo mock** (sem `.env`) garante a demonstração da interface.

## O que demonstrar

1. **Cadastro** (escolher Cliente ou Chef) → login automático.
2. **Catálogo**: busca por texto + filtros (especialidade, preço, avaliação, disponibilidade).
3. **Perfil do profissional**: selo de validação, especialidades, experiências, portfólio.
4. **Logout** pelo perfil e novo login.
