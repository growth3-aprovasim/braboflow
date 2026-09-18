# 🔌 BraboFlow MCP Server para Claude.ai

Servidor oficial do **Model Context Protocol (MCP)** para integrar o Claude diretamente com o **BraboFlow** e o **Supabase**.

---

## 🚀 Como Iniciar o Servidor MCP

No seu terminal, na pasta do projeto:

```bash
npm run mcp
```

O servidor iniciará em `http://localhost:3001/sse`.

---

## 🌐 Como Obter a URL HTTPS para o Claude.ai

Como o Claude.ai é uma aplicação na nuvem, ele exige uma URL pública com **HTTPS**. Você pode usar qualquer ferramenta de túnel gratuita (ex: Cloudflare, Ngrok ou Localtunnel):

### Opção 1: Usando Localtunnel (Sem cadastro, 1 comando)
```bash
npx localtunnel --port 3001
```
Você receberá uma URL como: `https://brave-frog-42.loca.lt`
A URL do conector no Claude será: `https://brave-frog-42.loca.lt/sse`

### Opção 2: Usando Cloudflare Tunnel (Gratuito e ultra-rápido)
```bash
npx untun@latest tunnel http://localhost:3001
```
A URL do conector no Claude será: `https://sua-url-gerada.trycloudflare.com/sse`

### Opção 3: Usando Ngrok
```bash
ngrok http 3001
```
A URL do conector no Claude será: `https://seu-dominio.ngrok-free.app/sse`

---

## 📋 Como Preencher no Claude.ai

No modal **"Adicionar conector personalizado"**:
1. **Nome**: `BraboFlow`
2. **URL do servidor MCP**: `https://<SUA-URL-DO-TUNNEL>/sse`

---

## 🛠️ Ferramentas (Tools) Disponíveis no Claude

| Ferramenta | Descrição |
| :--- | :--- |
| `braboflow_list_campaigns` | Lista as campanhas existentes no BraboFlow. |
| `braboflow_create_campaign` | Cria uma nova campanha com nome, datas, cor e objetivo. |
| `braboflow_add_disparos_batch` | Insere dezenas/centenas de disparos e copies extraídos de documentos/Docs diretamente na campanha. |
| `braboflow_add_campaign_links` | Cadastra links oficiais de checkout, YouTube ou grupos VIP. |
| `braboflow_get_campaign_details` | Retorna todos os disparos e copies de uma campanha para consulta/edição. |
| `braboflow_update_disparo` | Atualiza o texto da copy, data, horário ou canal de um disparo específico. |

---

## 💡 Exemplo de Prompt para o Claude

> *"Claude, leia este documento com o planejamento do lançamento da Polícia Rodoviária Federal. Crie a campanha 'PRF 2026' no BraboFlow com data de início em 01/10 e término em 15/10, cor Amarela (#facc15), e cadastre todos os disparos de WhatsApp e Email com as copies completas, horários e links."*
