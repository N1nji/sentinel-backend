<div align="center">

# 🛡️ Sentinel IA  
### Sistema Inteligente de Gestão de EPIs, Riscos e Segurança do Trabalho

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-indigo)](#)
![Architecture](https://img.shields.io/badge/architecture-multi--tenant%20(em%20progresso)-orange)
![Product](https://img.shields.io/badge/foco-produto%20corporativo-blueviolet)
[![Node.js](https://img.shields.io/badge/backend-Node.js-green)](#)
[![React](https://img.shields.io/badge/frontend-React-blue)](#)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](#)

Sistema web corporativo focado em **Segurança do Trabalho**, com **IA contextual**
integrada para apoio técnico e tomada de decisão.

</div>

---

## 📌 Visão Geral

O **Sentinel IA** é um sistema desenvolvido para **gestão completa de SST**, permitindo
o controle de **EPIs**, **Certificados de Aprovação (CA)**, **entregas legais**,  
**colaboradores**, **setores** e **riscos ocupacionais**, com apoio de uma
**Inteligência Artificial integrada ao contexto real do sistema**.

O projeto foi desenvolvido simulando um **produto real utilizado por empresas**,
seguindo boas práticas de arquitetura, segurança e experiência do usuário.

---

_____________________________________________________________________________________________

> 🚧 **Projeto em Desenvolvimento**
>  
> O Sentinel IA está em evolução contínua.  
> A arquitetura **multi-tenant** encontra-se em fase de implementação,
> com foco em isolamento de dados, escalabilidade e segurança corporativa.

_____________________________________________________________________________________________

## 🎯 Objetivo do Projeto

Ajudar empresas e profissionais de Segurança do Trabalho a:

- Evitar uso de EPIs com **CA vencido**
- Manter **histórico legal de entregas**
- Centralizar informações críticas de SST
- Facilitar consultas técnicas e operacionais
- Utilizar **IA** como apoio à análise e decisão

---

## 🤖 Inteligência Artificial Contextual

O Sentinel possui uma **IA integrada ao sistema**, que:

- Responde **somente com dados reais do banco**
- Nunca confunde **CA com quantidade**
- Analisa automaticamente:
  - EPIs em estoque
  - Validade do CA
  - Histórico de entregas
  - Setores, riscos e colaboradores
- Ajusta o nível de detalhe conforme a pergunta

> ⚠️ A IA **não inventa informações**.  
> Quando algo não existe no sistema, ela informa claramente.

---

## 🔐 Segurança e Controle de Acesso

O Sentinel IA foi projetado com foco em **segurança corporativa**.

### Funcionalidades de Segurança

- Autenticação por login e senha
- Criação de usuários controlada por administrador
- Bloqueio e desbloqueio de usuários
- Encerramento de sessão
- Proteção de rotas via middleware
- Separação de permissões (**Admin / Usuário**)

### Segurança de Sessão

- Validação de autenticação em todas as rotas sensíveis
- Controle de acesso baseado em perfil
- Estrutura preparada para ambientes corporativos reais

---

## 🧩 Funcionalidades Principais

### 📦 EPIs
- Cadastro e gerenciamento de EPIs
- Controle de estoque
- Validade do CA
- Status automático (ativo / vencido / sem estoque)

### 🧾 Entregas de EPIs
- Histórico legal de entregas
- Snapshot do EPI no momento da entrega
- Validade do CA na data da entrega
- Controle de devolução

### 👷 Colaboradores
- Cadastro com matrícula
- Associação a setores
- Histórico de EPIs recebidos

### 🏭 Setores
- Nome, responsável e descrição
- Status (ativo / inativo)

### ⚠️ Riscos Ocupacionais
- Classificação de risco
- Associação por setor

### 📄 Relatórios
- Exportação de conversas e análises em **PDF profissional**
- Layout corporativo com cabeçalho, rodapé e paginação

---

## 📚 Normas Regulamentadoras Atendidas

- **NR-1** — Disposições Gerais
- **NR-6** — Equipamentos de Proteção Individual
- **NR-9** — Riscos Ambientais
- **NR-38** — Limpeza Urbana

---

## 🛠️ Tecnologias Utilizadas

### Backend
- Node.js
- Express
- TypeScript
- MongoDB + Mongoose
- Groq SDK (LLM)
- PDFKit

### Frontend
- React
- TypeScript
- Tailwind CSS
- Context API
- Design responsivo (Desktop / Mobile)

### Arquitetura
- API REST
- Separação clara de responsabilidades
- Middleware de autenticação
- Contexto dinâmico para IA

---

## 🔐 Acesso ao Sistema (Demo)

🔗 **URL:** *https://sentinelv2.vercel.app*

### Conta de Demonstração
```txt
Email: demo@sentinel.app
Senha: demo123

> A conta demo ainda está sendo implementada e vai ter permissões limitadas e não irá permitir alterações críticas no sistema.

_____________________________________________________________________________________________

🎥 Demonstração em Vídeo

📹 Vídeo de apresentação do sistema:
👉 (vídeo em breve!)

O vídeo demonstra:

Login e segurança

Gestão de EPIs

Validade de CA

Chat com IA

Histórico de entregas

Exportação em PDF
_____________________________________________________________________________________________
👤 Autor

Felipe (N1nji)
Desenvolvedor Full Stack | IA | Web | Jogos
Co-Fundador da N1S1 Games

🔗 GitHub: https://github.com/N1nji
🔗 LinkedIn: https://www.linkedin.com/in/pedrofelipe-n1
_____________________________________________________________________________________________

🚀 Status do Projeto

✅ Funcional
✅ Em desenvolvimento contínuo
✅ Pronto para demonstração
_____________________________________________________________________________________________

📌 Observação Final

Este projeto foi desenvolvido com foco em qualidade de código,
regras de negócio reais e experiência profissional, simulando
um sistema corporativo de Segurança do Trabalho.