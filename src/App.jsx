import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutGrid, MessageCircle, Video, Settings, Search, Bell, ChevronDown,
  Eye, EyeOff, LogOut, X, ArrowRight, Check, Copy, Upload, Image as ImageIcon,
  Play, Pause, Download, Share2, Sparkles, TrendingUp, Clock, Phone, MapPin,
  Home as HomeIcon, FileText, ShieldCheck, User, Users, Send, Bot, ArrowLeft,
  Trash2, ChevronRight, Star, Building2, AlertTriangle, Loader2, BadgeCheck,
  SlidersHorizontal, Camera, Globe, MessageSquare, Volume2, LayoutList,
  DollarSign, BedDouble, Car, PenLine
} from "lucide-react";

/* ============================================================================
   API (backend real em Python/FastAPI)
============================================================================ */

// Endereço do backend rodando localmente (uvicorn). Troque aqui se subir em outra porta/URL.
const API_BASE = "http://localhost:8000";

/* ============================================================================
   MOCK DATA
============================================================================ */

const LEADS = [
  { id: 1, nome: "Luiza Faria", avatar: "LF", telefone: "(31) 9****-2210", imovel: "Apartamento 2 quartos", bairro: "Centro", valor: "R$ 410 mil", score: 38, canal: "WhatsApp", status: "Aguardando corretor", timestamp: "há 22 min" },
  { id: 2, nome: "Renata Costa", avatar: "RC", telefone: "(31) 9****-7734", imovel: "Apartamento 2 quartos c/ vaga", bairro: "Pampulha", valor: "R$ 590 mil", score: 91, canal: "WhatsApp", status: "Pronto para visita", timestamp: "há 8 min" },
  { id: 3, nome: "João Pedro", avatar: "JP", telefone: "(31) 9****-1182", imovel: "Casa 3 quartos", bairro: "Buritis", valor: "R$ 620 mil", score: 74, canal: "Site", status: "Pediu para falar com alguém", timestamp: "há 15 min" },
  { id: 4, nome: "Bruno Alves", avatar: "BA", telefone: "(31) 9****-4409", imovel: "Cobertura 3 suítes", bairro: "Savassi", valor: "R$ 1,2 mi", score: 82, canal: "Instagram", status: "IA respondendo", timestamp: "há 3 min" },
  { id: 5, nome: "Carla Nunes", avatar: "CN", telefone: "(31) 9****-9021", imovel: "Apartamento 3 quartos", bairro: "Savassi", valor: "R$ 780 mil", score: 67, canal: "WhatsApp", status: "IA respondendo", timestamp: "há 1 min" },
  { id: 6, nome: "Marcos Teixeira", avatar: "MT", telefone: "(31) 9****-5567", imovel: "Studio", bairro: "Funcionários", valor: "R$ 320 mil", score: 55, canal: "WhatsApp", status: "IA respondendo", timestamp: "agora" },
  { id: 7, nome: "Fernanda Lima", avatar: "FL", telefone: "(31) 9****-3390", imovel: "Apartamento 4 quartos", bairro: "Belvedere", valor: "R$ 1,4 mi", score: 88, canal: "Site", status: "Qualificado", timestamp: "há 46 min" },
  { id: 8, nome: "Diego Souza", avatar: "DS", telefone: "(31) 9****-6612", imovel: "Terreno 600m²", bairro: "Nova Lima", valor: "R$ 950 mil", score: 29, canal: "Instagram", status: "Na fila do corretor", timestamp: "há 2 h" },
];

const CORRETORES = ["Diego Souza", "Marina Silva", "Rafael Prado"];

const CHAT_HISTORICO = {
  1: [
    { from: "lead", text: "Oi, vi o apartamento de 2 quartos no Centro. Ele já foi vendido pela imobiliária que herdei junto com meu irmão?" },
    { from: "ia", text: "Oi, Luiza! Que bom falar com você. Sobre o imóvel herdado, você quer saber sobre a venda em si ou sobre os impostos envolvidos?" },
    { from: "lead", text: "Sobre o imposto de ganho de capital mesmo. Não sei se vou ter que pagar muita coisa." },
    { from: "ia", text: "Entendi. Esse é um cálculo que depende do valor de avaliação no inventário e do valor de venda — é uma questão mais jurídica e tributária, então vou te encaminhar para um corretor especialista para te dar a resposta certa, tudo bem?" },
  ],
  2: [
    { from: "lead", text: "Boa tarde! Consegui fechar o orçamento aqui em casa, dá pra ver o apê no sábado de manhã?" },
    { from: "ia", text: "Boa tarde, Renata! Consigo sim. Você prefere 9h ou 10h30? O apartamento tem 2 quartos, vaga de garagem e fica bem perto do shopping Pampulha." },
    { from: "lead", text: "10h30 fica ótimo pra mim." },
    { from: "ia", text: "Perfeito, já deixei reservado. Vou avisar a Marina, corretora responsável pela região, e ela confirma com você por aqui mesmo." },
  ],
  3: [
    { from: "lead", text: "A casa no Buritis, 3 quartos, ainda tá disponível?" },
    { from: "ia", text: "Oi, João! Sim, ainda está disponível. Ela tem 3 quartos, sendo 1 suíte, quintal e 2 vagas cobertas. Posso te enviar as fotos?" },
    { from: "lead", text: "Pode, mas eu queria falar direto com um corretor se possível." },
    { from: "ia", text: "Sem problemas! Já estou te encaminhando para a Marina, que cuida da região do Buritis. Ela deve falar com você em instantes." },
  ],
};

const FUNIL = [
  { label: "Leads recebidos", valor: 210 },
  { label: "Respondidos", valor: 193 },
  { label: "Qualificados", valor: 128 },
  { label: "Na fila do corretor", valor: 79 },
];

const ATIVIDADE_RECENTE = [
  { cor: "bg-red-500", texto: "Risco alto detectado", detalhe: "Matrícula 45.231, ônus e ação em andamento identificados", tempo: "há 18 min" },
  { cor: "bg-blue-500", texto: "Lead qualificado", detalhe: "Apto 2 quartos, região Pampulha, encaminhado para Marina", tempo: "há 41 min" },
  { cor: "bg-emerald-500", texto: "Análise concluída", detalhe: "Matrícula 12.884, risco baixo, sem pendências relevantes", tempo: "há 2 h" },
  { cor: "bg-violet-500", texto: "Vídeo tour gerado", detalhe: "Cobertura Savassi, 6 fotos processadas", tempo: "há 3 h" },
];

const FOTOS_INICIAIS = [
  { id: 1, nome: "sala-estar.jpg" },
  { id: 2, nome: "cozinha-gourmet.jpg" },
  { id: 3, nome: "suite-master.jpg" },
  { id: 4, nome: "varanda.jpg" },
];

const TONS_VOZ = ["Profissional", "Emocional", "Super Persuasivo", "Conectado"];
const TRILHAS = ["Ambiente Suave", "Corporativo Moderno", "Upbeat Inspirador", "Cinematográfico"];

/* ============================================================================
   HELPERS
============================================================================ */

function scoreStyle(score) {
  if (score >= 80) return { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", bar: "bg-emerald-500" };
  if (score >= 50) return { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200", bar: "bg-amber-500" };
  return { text: "text-red-700", bg: "bg-red-50", ring: "ring-red-200", bar: "bg-red-500" };
}

function ScoreBadge({ score }) {
  const s = scoreStyle(score);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text} ring-1 ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.bar}`} />
      {score}
    </span>
  );
}

function Sparkline({ points, color = "#2563eb" }) {
  const w = 96, h = 32;
  const max = Math.max(...points), min = Math.min(...points);
  const norm = (v) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${norm(p)}`).join(" ");
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8">
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkfill)" stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">R</div>
      <div className="leading-tight">
        <p className="text-white text-sm font-semibold">Receivly</p>
        <p className="text-[10px] text-gray-500 tracking-wide">PAINEL IMOBILIÁRIA</p>
      </div>
    </div>
  );
}

/* ============================================================================
   LOGIN SCREEN
============================================================================ */

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | cadastro | recuperar
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [imobiliaria, setImobiliaria] = useState("");
  const [recuperado, setRecuperado] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (mode === "recuperar") {
      // O backend ainda não tem endpoint de recuperação de senha — mantém simulado por enquanto.
      setLoading(true);
      setTimeout(() => { setLoading(false); setRecuperado(true); }, 1200);
      return;
    }

    setLoading(true);
    try {
      let token;

      if (mode === "cadastro") {
        const resp = await fetch(`${API_BASE}/auth/registrar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome_imobiliaria: imobiliaria,
            nome_usuario: nome,
            email,
            senha,
          }),
        });
        if (!resp.ok) {
          const erroResp = await resp.json().catch(() => ({}));
          throw new Error(erroResp.detail || "Não foi possível criar a conta.");
        }
        ({ access_token: token } = await resp.json());
      } else {
        const form = new URLSearchParams();
        form.set("username", email);
        form.set("password", senha);
        const resp = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
        });
        if (!resp.ok) {
          const erroResp = await resp.json().catch(() => ({}));
          throw new Error(erroResp.detail || "E-mail ou senha incorretos.");
        }
        ({ access_token: token } = await resp.json());
      }

      const respMe = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!respMe.ok) throw new Error("Login feito, mas não consegui carregar seus dados.");
      const usuario = await respMe.json();

      onLogin({ nome: usuario.nome, email: usuario.email, token });
    } catch (err) {
      setErro(
        err instanceof TypeError
          ? "Não consegui falar com o backend. Ele está rodando em " + API_BASE + "?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Painel esquerdo institucional */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0B0D14]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/40 via-[#0B0D14] to-[#0B0D14]" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Logo />
          <div className="max-w-md">
            <p className="text-xs font-semibold tracking-wide text-blue-400 mb-4">RECEIVLY PARA IMOBILIÁRIAS</p>
            <h1 className="text-4xl font-semibold text-white leading-tight mb-5">
              Sua imobiliária não precisa de mais tarefas. Precisa de mais negócios.
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Uma única plataforma de IA para atender leads no WhatsApp, analisar documentos, gerar anúncios e criar vídeo tours automaticamente — enquanto seu time foca em fechar negócio.
            </p>
          </div>
          <div className="flex items-center gap-6 text-gray-500 text-xs">
            <div><p className="text-white text-xl font-semibold">+40 mil</p>leads atendidos por IA</div>
            <div className="h-8 w-px bg-white/10" />
            <div><p className="text-white text-xl font-semibold">64%</p>taxa média de qualificação</div>
            <div className="h-8 w-px bg-white/10" />
            <div><p className="text-white text-xl font-semibold">300+</p>imobiliárias ativas</div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo className="[&_p]:text-gray-900" /></div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-1">
            {mode === "login" && "Entrar na sua conta"}
            {mode === "cadastro" && "Criar conta da imobiliária"}
            {mode === "recuperar" && "Recuperar senha"}
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            {mode === "login" && "Acesse o painel da sua imobiliária."}
            {mode === "cadastro" && "Leva menos de 2 minutos para começar."}
            {mode === "recuperar" && "Enviaremos um link de redefinição para seu e-mail."}
          </p>

          {recuperado ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Link enviado!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Confira sua caixa de entrada em {email}.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{erro}</p>
                </div>
              )}
              {mode === "cadastro" && (
                <>
                  <div className="relative">
                    <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder=" "
                      className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none" />
                    <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">Seu nome</label>
                  </div>
                  <div className="relative">
                    <input value={imobiliaria} onChange={(e) => setImobiliaria(e.target.value)} required placeholder=" "
                      className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none" />
                    <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">Nome da imobiliária</label>
                  </div>
                </>
              )}

              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder=" "
                  className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none" />
                <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">E-mail</label>
                {/(.+)@(.+)\.(.+)/.test(email) && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>

              {mode !== "recuperar" && (
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder=" "
                    className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 pr-10 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none" />
                  <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">Senha</label>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {mode === "login" && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("recuperar")} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-medium py-2.5 transition-colors">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "recuperar" ? "Enviando..." : "Entrando..."}
                  </>
                ) : (
                  <>
                    {mode === "login" && "Entrar"}
                    {mode === "cadastro" && "Criar conta"}
                    {mode === "recuperar" && "Enviar link"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === "login" && (
              <>Ainda não tem conta?{" "}
                <button onClick={() => setMode("cadastro")} className="text-blue-600 font-medium hover:text-blue-700">Criar conta da imobiliária</button>
              </>
            )}
            {mode === "cadastro" && (
              <>Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-blue-600 font-medium hover:text-blue-700">Entrar</button>
              </>
            )}
            {mode === "recuperar" && (
              <button onClick={() => { setMode("login"); setRecuperado(false); }} className="text-blue-600 font-medium hover:text-blue-700">Voltar para o login</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SIDEBAR
============================================================================ */

const NAV_GERAL = [{ id: "dashboard", label: "Visão geral", icon: LayoutGrid }];
const NAV_PRODUTOS = [
  { id: "juridico", label: "Analisador Jurídico", icon: ShieldCheck, tag: "novo" },
  { id: "whatsapp", label: "IA para WhatsApp", icon: MessageCircle },
  { id: "anuncios", label: "IA para Anúncios", icon: PenLine, tag: "novo" },
  { id: "videos", label: "Video Tours", icon: Video },
];
const NAV_CONTA = [{ id: "configuracoes", label: "Configurações", icon: Settings }];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button onClick={() => onClick(item.id)}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-white/[0.06] text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
      }`}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-blue-500" : "text-gray-500"}`} />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.tag && (
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${item.tag === "novo" ? "bg-blue-500/15 text-blue-400" : "bg-white/5 text-gray-500"}`}>
          {item.tag}
        </span>
      )}
    </button>
  );
}

function Sidebar({ screen, onNavigate, unread, user, onLogout }) {
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 bg-[#0B0D14] flex-col border-r border-white/5 h-screen sticky top-0">
      <div className="p-4 border-b border-white/5"><Logo /></div>
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <p className="px-2.5 text-[10px] font-semibold tracking-wider text-gray-600 mb-1.5">GERAL</p>
          <div className="space-y-0.5">
            {NAV_GERAL.map((item) => <NavItem key={item.id} item={item} active={screen === item.id} onClick={onNavigate} />)}
          </div>
        </div>
        <div>
          <p className="px-2.5 text-[10px] font-semibold tracking-wider text-gray-600 mb-1.5">PRODUTOS</p>
          <div className="space-y-0.5">
            {NAV_PRODUTOS.map((item) => (
              <div key={item.id} className="relative">
                <NavItem item={item} active={screen === item.id} onClick={onNavigate} />
                {item.id === "whatsapp" && unread > 0 && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="px-2.5 text-[10px] font-semibold tracking-wider text-gray-600 mb-1.5">CONTA</p>
          <div className="space-y-0.5">
            {NAV_CONTA.map((item) => <NavItem key={item.id} item={item} active={screen === item.id} onClick={onNavigate} />)}
          </div>
        </div>
      </nav>
      <div className="p-3 border-t border-white/5">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <p className="text-xs font-medium text-white">Plano Pro Completo</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Análises jurídicas ilimitadas</p>
        </div>
        <button onClick={onLogout} className="w-full mt-3 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-white/[0.03]">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
}

/* ============================================================================
   HEADER
============================================================================ */

const BREADCRUMBS = {
  dashboard: ["PAINEL", "HOJE", "Visão geral"],
  juridico: ["PAINEL", "PRODUTOS", "Analisador Jurídico"],
  whatsapp: ["PAINEL", "ATENDIMENTO", "IA para WhatsApp"],
  anuncios: ["PAINEL", "PRODUTOS", "IA para Anúncios"],
  videos: ["PAINEL", "PRODUTOS", "Video Tours"],
  configuracoes: ["PAINEL", "CONTA", "Configurações"],
};

function Header({ screen, user, onLogout, search, setSearch }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [bc0, bc1, title] = BREADCRUMBS[screen] || ["PAINEL", "", ""];

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium text-gray-400 tracking-wide">{bc0} · {bc1}</p>
        <h1 className="text-xl font-semibold text-gray-900 mt-0.5">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 w-56 focus-within:border-blue-400 focus-within:bg-white transition-colors">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar leads..."
            className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full" />
        </div>

        <div className="relative">
          <button onClick={() => { setShowNotif((v) => !v); setShowUser(false); }}
            className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg p-2 animate-in fade-in zoom-in-95 duration-100">
              <p className="px-2 py-1.5 text-xs font-semibold text-gray-500">NOTIFICAÇÕES</p>
              {ATIVIDADE_RECENTE.slice(0, 3).map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50">
                  <span className={`h-1.5 w-1.5 rounded-full mt-1.5 ${a.cor}`} />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{a.texto}</p>
                    <p className="text-[11px] text-gray-400">{a.tempo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setShowUser((v) => !v); setShowNotif(false); }} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-50">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
              {user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user.nome}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {showUser && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5">
              <p className="px-2.5 py-2 text-xs text-gray-400 truncate">{user.email}</p>
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                <LogOut className="h-3.5 w-3.5" /> Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
   DASHBOARD
============================================================================ */

function KpiCard({ title, value, sub, subColor, sparkline, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {sparkline && <div className="w-24"><Sparkline points={sparkline} /></div>}
      </div>
      {sub && <p className={`text-xs mt-1.5 ${subColor || "text-emerald-600"}`}>{sub}</p>}
      {children}
    </div>
  );
}

function LeadsTable({ leads, onSelect }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">Últimos leads qualificados</p>
          <p className="text-xs text-gray-400">Ordenados por score da IA</p>
        </div>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">Ver todos <ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
              <th className="font-medium px-5 py-2.5">Lead</th>
              <th className="font-medium px-5 py-2.5">Imóvel de interesse</th>
              <th className="font-medium px-5 py-2.5">Bairro</th>
              <th className="font-medium px-5 py-2.5">Valor</th>
              <th className="font-medium px-5 py-2.5">Canal</th>
              <th className="font-medium px-5 py-2.5">Score IA</th>
              <th className="font-medium px-5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...leads].sort((a, b) => b.score - a.score).map((lead) => (
              <tr key={lead.id} onClick={() => onSelect(lead)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">{lead.avatar}</div>
                    <div>
                      <p className="font-medium text-gray-800">{lead.nome}</p>
                      <p className="text-[11px] text-gray-400">{lead.telefone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{lead.imovel}</td>
                <td className="px-5 py-3 text-gray-600">{lead.bairro}</td>
                <td className="px-5 py-3 text-gray-600">{lead.valor}</td>
                <td className="px-5 py-3 text-gray-500">{lead.canal}</td>
                <td className="px-5 py-3"><ScoreBadge score={lead.score} /></td>
                <td className="px-5 py-3 text-gray-500">{lead.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadDrawer({ lead, onClose }) {
  if (!lead) return null;
  const s = scoreStyle(lead.score);
  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-blue-50 text-blue-700 font-semibold flex items-center justify-center">{lead.avatar}</div>
            <div>
              <p className="font-semibold text-gray-900">{lead.nome}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.telefone}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          <div className={`rounded-xl ${s.bg} ring-1 ${s.ring} p-4 flex items-center justify-between`}>
            <div>
              <p className="text-xs text-gray-500">Score de qualificação IA</p>
              <p className={`text-2xl font-semibold ${s.text}`}>{lead.score}/100</p>
            </div>
            <Sparkles className={`h-6 w-6 ${s.text}`} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2.5">FICHA DE PREFERÊNCIAS</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-100 p-3"><p className="text-[11px] text-gray-400 flex items-center gap-1"><HomeIcon className="h-3 w-3" /> Imóvel</p><p className="font-medium text-gray-800 mt-0.5">{lead.imovel}</p></div>
              <div className="rounded-lg border border-gray-100 p-3"><p className="text-[11px] text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> Bairro</p><p className="font-medium text-gray-800 mt-0.5">{lead.bairro}</p></div>
              <div className="rounded-lg border border-gray-100 p-3"><p className="text-[11px] text-gray-400 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Orçamento</p><p className="font-medium text-gray-800 mt-0.5">{lead.valor}</p></div>
              <div className="rounded-lg border border-gray-100 p-3"><p className="text-[11px] text-gray-400 flex items-center gap-1"><Globe className="h-3 w-3" /> Canal</p><p className="font-medium text-gray-800 mt-0.5">{lead.canal}</p></div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2.5">LINHA DO TEMPO</p>
            <div className="space-y-4">
              {[
                { t: lead.timestamp, d: `Status atual: ${lead.status}` },
                { t: "há 1 dia", d: "IA identificou intenção de compra e extraiu preferências automaticamente" },
                { t: "há 1 dia", d: `Lead chegou via ${lead.canal}` },
              ].map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5" />
                    {i < 2 && <span className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs text-gray-400">{ev.t}</p>
                    <p className="text-sm text-gray-700">{ev.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5">Assumir conversa</button>
          <button className="rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4">Encaminhar</button>
        </div>
      </div>
    </div>
  );
}

function DashboardScreen({ leads, onSelectLead }) {
  const qualificados = leads.filter((l) => l.score >= 50).length;
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Leads ativos" value={leads.length + 116} sub="+12 esta semana" sparkline={[40, 55, 48, 62, 58, 70, 74]} />
        <KpiCard title="Taxa de qualificação (IA)" value="64%" sub="+6 pts vs. mês anterior">
          <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: "64%" }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">Meta do mês: 70%</p>
        </KpiCard>
        <KpiCard title="Documentos analisados" value="13" sub="+14% vs semana passada" subColor="text-emerald-600" />
        <KpiCard title="Vídeos gerados" value="9" sub="2 em processamento" subColor="text-amber-600" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Produtos</p>
          <button className="text-xs font-medium text-blue-600 hover:text-blue-700">Ver todos</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, cor: "text-red-600", bg: "bg-red-50", nome: "Analisador Jurídico", desc: "Analisa a matrícula e os documentos dos vendedores e aponta dívidas, processos e outros riscos do imóvel.", stat: "1 risco alto", statCor: "text-red-500", rodape: "Análises ilimitadas" },
            { icon: MessageCircle, cor: "text-blue-600", bg: "bg-blue-50", nome: "IA para WhatsApp", desc: "Conversa, extrai os dados do lead automaticamente e chama o corretor certo na hora certa.", stat: "3 na fila", statCor: "text-amber-500", rodape: "3 números conectados" },
            { icon: PenLine, cor: "text-amber-600", bg: "bg-amber-50", nome: "IA para Anúncios", desc: "Gera textos prontos para portal imobiliário, Instagram e WhatsApp a partir das características do imóvel.", stat: "novo", statCor: "text-amber-500", rodape: "4 tons de voz disponíveis" },
            { icon: Video, cor: "text-violet-600", bg: "bg-violet-50", nome: "Video Tours", desc: "Transforme fotos do imóvel em vídeos verticais prontos para anúncios e redes sociais.", stat: "2 processando", statCor: "text-blue-500", rodape: "9 vídeos este mês" },
          ].map((p, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className={`h-9 w-9 rounded-lg ${p.bg} ${p.cor} flex items-center justify-center`}><p.icon className="h-4.5 w-4.5" /></div>
                <span className={`text-[11px] font-medium ${p.statCor}`}>{p.stat}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-3">{p.nome}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.desc}</p>
              <p className="text-[11px] text-gray-400 mt-3">{p.rodape}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2"><LeadsTable leads={leads} onSelect={onSelectLead} /></div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">Atividade recente</p>
          <p className="text-xs text-gray-400 mb-4">Últimas ações da plataforma</p>
          <div className="space-y-4">
            {ATIVIDADE_RECENTE.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`h-1.5 w-1.5 rounded-full mt-1.5 ${a.cor} shrink-0`} />
                <div>
                  <p className="text-xs text-gray-800"><span className="font-medium">{a.texto}</span> — {a.detalhe}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{a.tempo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   WHATSAPP MODULE
============================================================================ */

function ConversaCard({ conversa, onAssumir }) {
  const lead = conversa.lead;
  const s = scoreStyle(lead.score_ia);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4" style={{ borderLeftColor: lead.score_ia < 50 ? "#ef4444" : lead.score_ia < 80 ? "#f59e0b" : "#10b981" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 text-sm">{lead.nome}</p>
          <span className="text-[11px] text-gray-400">{lead.telefone}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1 truncate">{conversa.ultima_mensagem || "Sem mensagens ainda."}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
          <span>Orçamento {lead.valor || "não informado"}</span>
          <span>Região {lead.bairro || "não informado"}</span>
          <span>Interesse {lead.imovel_interesse || "não informado"}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <ScoreBadge score={lead.score_ia} />
        <button onClick={() => onAssumir(conversa.id)} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 mt-1">Abrir conversa →</button>
      </div>
    </div>
  );
}

function ChatWindow({ conversaId, token, onVoltar, onAtualizado }) {
  const [conversa, setConversa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [textoSimulado, setTextoSimulado] = useState("");
  const [simulando, setSimulando] = useState(false);
  const bottomRef = useRef(null);

  async function carregar() {
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/conversas/${conversaId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Não foi possível carregar a conversa.");
      setConversa(await resp.json());
    } catch (err) {
      setErro(err instanceof TypeError ? `Não consegui falar com o backend (${API_BASE}).` : err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, [conversaId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversa]);

  async function enviarComoCorretorAsync() {
    if (!texto.trim()) return;
    setEnviando(true);
    setErro("");
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/conversas/${conversaId}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ texto }),
      });
      if (!resp.ok) throw new Error("Não foi possível enviar a mensagem.");
      setConversa(await resp.json());
      setTexto("");
      onAtualizado?.();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function alternarIa() {
    setErro("");
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/conversas/${conversaId}/ia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ativa: !conversa.ia_ativa }),
      });
      if (!resp.ok) throw new Error("Não foi possível atualizar a conversa.");
      setConversa(await resp.json());
      onAtualizado?.();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function simularMensagemDoLead() {
    if (!textoSimulado.trim()) return;
    setSimulando(true);
    setErro("");
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ telefone: conversa.lead.telefone, nome: conversa.lead.nome, texto: textoSimulado }),
      });
      if (!resp.ok) throw new Error("Não foi possível simular a mensagem.");
      setConversa(await resp.json());
      setTextoSimulado("");
      onAtualizado?.();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSimulando(false);
    }
  }

  if (carregando) {
    return <div className="p-10 flex items-center justify-center text-gray-400 gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando conversa...</div>;
  }
  if (!conversa) {
    return <div className="p-10 text-center text-red-500 text-sm">{erro || "Conversa não encontrada."}</div>;
  }

  const lead = conversa.lead;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-140px)] rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* coluna chat */}
      <div className="flex-1 flex flex-col border-r border-gray-100 min-w-0">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onVoltar} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"><ArrowLeft className="h-4 w-4" /></button>
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
              {lead.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{lead.nome}</p>
              <p className="text-[11px] text-gray-400 truncate">{lead.telefone}</p>
            </div>
          </div>
          <ScoreBadge score={lead.score_ia} />
        </div>

        {erro && (
          <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{erro}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#F7F8FA]">
          {conversa.mensagens.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-6">Nenhuma mensagem ainda — use o simulador de lead, no painel à direita, pra começar a conversa.</p>
          )}
          {conversa.mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.remetente === "lead" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.remetente === "lead" ? "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                : m.remetente === "ia" ? "bg-blue-600 text-white rounded-br-sm"
                : "bg-emerald-600 text-white rounded-br-sm"
              }`}>
                {m.remetente !== "lead" && (
                  <p className="text-[10px] font-medium opacity-75 mb-0.5 flex items-center gap-1">
                    {m.remetente === "ia" ? <><Bot className="h-2.5 w-2.5" /> IA Receivly</> : "Você"}
                  </p>
                )}
                {m.texto}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-gray-100 flex items-center gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarComoCorretorAsync()}
            placeholder={conversa.ia_ativa ? "Assuma a conversa para responder..." : "Digite uma mensagem..."} disabled={conversa.ia_ativa || enviando}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 disabled:opacity-60" />
          <button onClick={enviarComoCorretorAsync} disabled={conversa.ia_ativa || enviando} className="h-10 w-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* coluna insights */}
      <div className="w-full md:w-72 shrink-0 p-5 space-y-5 overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">AI INSIGHTS</p>
          <div className="space-y-2.5">
            <div className="rounded-lg border border-gray-100 p-3"><p className="text-[11px] text-gray-400">Orçamento</p><p className="text-sm font-medium text-gray-800">{lead.valor || "ainda não identificado"}</p></div>
            <div className="rounded-lg border border-gray-100 p-3"><p className="text-[11px] text-gray-400">Interesse</p><p className="text-sm font-medium text-gray-800">{lead.imovel_interesse || "ainda não identificado"}</p></div>
            <div className="rounded-lg border border-gray-100 p-3"><p className="text-[11px] text-gray-400">Localização</p><p className="text-sm font-medium text-gray-800">{lead.bairro || "ainda não identificado"}</p></div>
          </div>
        </div>

        <button onClick={alternarIa}
          className={`w-full rounded-lg text-sm font-medium py-2.5 transition-colors ${conversa.ia_ativa ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
          {conversa.ia_ativa ? "Assumir conversa / Desativar IA" : "Devolver conversa para a IA"}
        </button>

        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3.5">
          <p className="text-[11px] font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> SIMULADOR DE LEAD (modo de teste)
          </p>
          <p className="text-[11px] text-amber-700 mb-2.5">Como o número real do WhatsApp ainda não está conectado, use isso pra simular o que o cliente estaria digitando.</p>
          <textarea value={textoSimulado} onChange={(e) => setTextoSimulado(e.target.value)} rows={2} placeholder="Ex: Qual o valor do condomínio?"
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 resize-none mb-2" />
          <button onClick={simularMensagemDoLead} disabled={simulando || !textoSimulado.trim()}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium py-2">
            {simulando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Simulando...</> : "Simular mensagem do lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SimularLeadModal({ onClose, onEnviar, enviando }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [texto, setTexto] = useState("Oi, vi um anúncio de vocês e queria saber mais.");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={enviando ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">Simular novo lead</p>
          <button onClick={onClose} disabled={enviando} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-40"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Sem número de WhatsApp real conectado ainda — isso simula a primeira mensagem de um cliente novo, pra testar o fluxo completo.</p>

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nome do lead</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Luiza Faria"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 mb-3" />

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Telefone (só pra identificar a conversa)</label>
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex: 31999990000"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 mb-3" />

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Primeira mensagem</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 resize-none mb-4" />

        <button onClick={() => onEnviar({ nome, telefone, texto })} disabled={!nome || !telefone || !texto || enviando}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5">
          {enviando ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : "Simular mensagem"}
        </button>
      </div>
    </div>
  );
}

function WhatsAppScreen({ token }) {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [chatAbertoId, setChatAbertoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [enviandoSimulacao, setEnviandoSimulacao] = useState(false);

  async function carregarConversas() {
    setCarregando(true);
    setErro("");
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/conversas`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Não foi possível carregar as conversas.");
      setConversas(await resp.json());
    } catch (err) {
      setErro(err instanceof TypeError ? `Não consegui falar com o backend (${API_BASE}).` : err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarConversas(); }, []);

  async function simularNovoLead({ nome, telefone, texto }) {
    setEnviandoSimulacao(true);
    setErro("");
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome, telefone, texto }),
      });
      if (!resp.ok) throw new Error("Não foi possível simular a mensagem.");
      const conversa = await resp.json();
      setModalAberto(false);
      await carregarConversas();
      setChatAbertoId(conversa.id);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviandoSimulacao(false);
    }
  }

  if (chatAbertoId) {
    return (
      <div className="p-6">
        <ChatWindow conversaId={chatAbertoId} token={token} onVoltar={() => { setChatAbertoId(null); carregarConversas(); }} onAtualizado={carregarConversas} />
      </div>
    );
  }

  const fila = conversas.filter((c) => !c.ia_ativa);
  const emAndamento = conversas.filter((c) => c.ia_ativa);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-lg">
            <p className="text-sm font-semibold text-gray-900">IA para WhatsApp</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Conversa naturalmente com o cliente, extrai os dados dele sem formulário e chama o corretor certo assim que perceber que é hora de um humano assumir.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex gap-6">
              <div><p className="text-lg font-semibold text-gray-900">{conversas.length}</p><p className="text-[11px] text-gray-400">conversas totais</p></div>
              <div><p className="text-lg font-semibold text-gray-900">{fila.length}</p><p className="text-[11px] text-gray-400">aguardando corretor</p></div>
            </div>
            <button onClick={() => setModalAberto(true)} className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3.5 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Simular novo lead
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-3">Número real do WhatsApp Business ainda não conectado — use o botão acima pra testar o atendimento.</p>
      </div>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{erro}</p>
        </div>
      )}

      {carregando ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 flex items-center justify-center text-gray-400 gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversas...
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Aguardando corretor</p>
                <p className="text-xs text-gray-400">A IA já encaminhou ou o corretor assumiu essas conversas.</p>
              </div>
            </div>
            {fila.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400">Nenhuma conversa aguardando corretor no momento.</div>
            ) : (
              <div className="space-y-3">
                {fila.map((c) => <ConversaCard key={c.id} conversa={c} onAssumir={setChatAbertoId} />)}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-900 mb-1">Conversas em andamento</p>
            <p className="text-xs text-gray-400 mb-4">A IA ainda está atendendo, sem necessidade de corretor.</p>
            {emAndamento.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma conversa em andamento.</p>
            ) : (
              <div className="space-y-3">
                {emAndamento.map((c) => (
                  <div key={c.id} onClick={() => setChatAbertoId(c.id)} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                        {c.lead.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{c.lead.nome}</p>
                        <p className="text-xs text-gray-400 truncate">{c.ultima_mensagem || "Sem mensagens ainda"}</p>
                      </div>
                    </div>
                    <span className="text-xs text-blue-600 shrink-0 flex items-center gap-1"><Bot className="h-3 w-3" /> IA respondendo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {modalAberto && (
        <SimularLeadModal onClose={() => setModalAberto(false)} onEnviar={simularNovoLead} enviando={enviandoSimulacao} />
      )}
    </div>
  );
}

/* ============================================================================
   ANÚNCIOS MODULE
============================================================================ */

function gerarTextos({ descricao, tipo, bairro, preco, suites, vagas, tom }) {
  const tomIntro = {
    "Profissional": "Imóvel de alto padrão disponível para negociação imediata.",
    "Emocional": "Imagine chegar em casa e sentir que finalmente encontrou o seu lugar.",
    "Super Persuasivo": "Oportunidade única — imóveis assim não ficam disponíveis por muito tempo.",
    "Conectado": "Perto de tudo o que importa para o seu dia a dia.",
  }[tom];

  const base = `${tipo} em ${bairro || "ótima localização"}${suites ? `, ${suites} suíte(s)` : ""}${vagas ? ` e ${vagas} vaga(s) de garagem` : ""}. ${descricao || "Ambientes amplos e bem iluminados, acabamento de qualidade."}`;

  return {
    portal: `${tom.toUpperCase()} · ${tipo.toUpperCase()} — ${bairro || "Localização nobre"}\n\n${tomIntro}\n\n${base}\n\nValor: ${preco || "sob consulta"}.\nAgende sua visita e converse agora mesmo com um de nossos corretores.`,
    instagram: `✨ ${tipo} à venda em ${bairro || "localização privilegiada"}!\n\n${tomIntro}\n${suites ? `🛏️ ${suites} suíte(s)\n` : ""}${vagas ? `🚗 ${vagas} vaga(s)\n` : ""}💰 ${preco || "Consulte valores"}\n\nArraste para o lado e veja todas as fotos ➡️\nComenta "EU QUERO" que a gente te chama no direct! 📩`,
    whatsapp: `Olá! 👋 Encontrei um imóvel que combina com o que você procura:\n\n🏠 *${tipo}* em *${bairro || "ótima região"}*\n${suites ? `🛏️ ${suites} suíte(s)\n` : ""}${vagas ? `🚗 ${vagas} vaga(s)\n` : ""}💰 *${preco || "Sob consulta"}*\n\n${descricao || "Ambientes amplos e bem cuidados."}\n\nPosso te enviar mais fotos e agendar uma visita essa semana?`,
  };
}

function AnunciosScreen() {
  const [descricao, setDescricao] = useState("Apartamento reformado, com vista livre, sacada gourmet e área de lazer completa no condomínio.");
  const [tipo, setTipo] = useState("Apartamento");
  const [bairro, setBairro] = useState("Savassi");
  const [preco, setPreco] = useState("R$ 780.000");
  const [suites, setSuites] = useState(2);
  const [vagas, setVagas] = useState(2);
  const [tomIdx, setTomIdx] = useState(2);
  const [gerando, setGerando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [aba, setAba] = useState("portal");
  const [copiado, setCopiado] = useState(false);

  const etapas = ["Analisando características do imóvel...", "Adaptando tom de voz...", "Escrevendo para cada canal...", "Finalizando..."];

  function gerar() {
    setGerando(true);
    setResultado(null);
    setEtapa(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setEtapa(i);
      if (i >= etapas.length) {
        clearInterval(interval);
        setTimeout(() => {
          setGerando(false);
          setResultado(gerarTextos({ descricao, tipo, bairro, preco, suites, vagas, tom: TONS_VOZ[tomIdx] }));
          setAba("portal");
        }, 400);
      }
    }, 550);
  }

  function copiar(texto) {
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const abas = [
    { id: "portal", label: "Portal Imobiliário", icon: Globe },
    { id: "instagram", label: "Instagram", icon: Camera },
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  ];

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* inputs */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 h-fit">
        <div>
          <p className="text-sm font-semibold text-gray-900">Gerador de anúncios com IA</p>
          <p className="text-xs text-gray-400 mt-1">Preencha as características do imóvel e a IA escreve para cada canal.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Descrição bruta do imóvel</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3}
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Tipo de imóvel</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white">
              {["Apartamento", "Casa", "Cobertura", "Studio", "Terreno"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Bairro</label>
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Preço</label>
            <input value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block flex items-center gap-1"><BedDouble className="h-3 w-3" /> Suítes</label>
            <input type="number" min={0} value={suites} onChange={(e) => setSuites(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block flex items-center gap-1"><Car className="h-3 w-3" /> Vagas</label>
            <input type="number" min={0} value={vagas} onChange={(e) => setVagas(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-2.5 flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Tom de voz da IA</label>
          <input type="range" min={0} max={3} step={1} value={tomIdx} onChange={(e) => setTomIdx(Number(e.target.value))}
            className="w-full accent-blue-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            {TONS_VOZ.map((t, i) => <span key={t} className={i === tomIdx ? "text-blue-600 font-semibold" : ""}>{t}</span>)}
          </div>
        </div>

        <button onClick={gerar} disabled={gerando}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-medium py-2.5">
          {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> {etapas[Math.min(etapa, etapas.length - 1)]}</> : <><Sparkles className="h-4 w-4" /> Gerar material de divulgação com IA</>}
        </button>
        {gerando && (
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(etapa / etapas.length) * 100}%` }} />
          </div>
        )}
      </div>

      {/* outputs */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col">
        <p className="text-sm font-semibold text-gray-900 mb-1">Resultados gerados</p>
        <p className="text-xs text-gray-400 mb-4">Textos prontos para cada canal de divulgação.</p>

        {!resultado ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-gray-400">
            <PenLine className="h-8 w-8 mb-3 text-gray-300" />
            <p className="text-sm">Preencha os dados e clique em gerar para ver os textos aqui.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-gray-50 rounded-lg p-1 mb-4">
              {abas.map((a) => (
                <button key={a.id} onClick={() => setAba(a.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-colors ${aba === a.id ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
                  <a.icon className="h-3.5 w-3.5" /> {a.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{resultado[aba]}</pre>
            </div>
            <button onClick={() => copiar(resultado[aba])}
              className={`mt-4 w-full flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-2.5 transition-colors ${copiado ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-900 hover:bg-gray-800 text-white"}`}>
              {copiado ? <><Check className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar conteúdo</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   VÍDEOS MODULE
============================================================================ */

function VideosScreen() {
  const [fotos, setFotos] = useState(FOTOS_INICIAIS);
  const [formato, setFormato] = useState("9:16");
  const [trilha, setTrilha] = useState(TRILHAS[0]);
  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [log, setLog] = useState("");
  const [pronto, setPronto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const fileRef = useRef(null);

  function adicionarFoto() {
    const nomes = ["fachada.jpg", "quarto-casal.jpg", "area-lazer.jpg", "banheiro.jpg", "piscina.jpg", "churrasqueira.jpg"];
    const nome = nomes[Math.floor(Math.random() * nomes.length)];
    setFotos((f) => [...f, { id: Date.now(), nome }]);
  }

  function removerFoto(id) { setFotos((f) => f.filter((x) => x.id !== id)); }

  function gerarVideo() {
    setGerando(true); setPronto(false); setProgresso(0); setLog("Iniciando processamento...");
    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 8) + 4;
      if (p >= 100) p = 100;
      setProgresso(p);
      if (p < 20) setLog("Analisando fotos...");
      else if (p < 60) setLog("Analisando fotos...");
      else if (p < 90) setLog("Sincronizando áudio e transições...");
      else if (p < 100) setLog("Renderizando em 4K...");
      else setLog("Vídeo pronto!");
      if (p >= 100) { clearInterval(interval); setTimeout(() => { setGerando(false); setPronto(true); }, 500); }
    }, 350);
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">Fotos do imóvel</p>
          <p className="text-xs text-gray-400 mb-4">Arraste e solte ou clique para adicionar fotos.</p>

          <button onClick={adicionarFoto}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors py-8 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500">
            <Upload className="h-6 w-6" />
            <p className="text-sm font-medium">Arraste as fotos aqui</p>
            <p className="text-xs">ou clique para simular o upload</p>
          </button>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
            {fotos.map((f) => (
              <div key={f.id} className="relative group aspect-square rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                <ImageIcon className="h-6 w-6 text-gray-300" />
                <button onClick={() => removerFoto(f.id)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
                <p className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">{f.nome}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Configurações do vídeo</p>

          <p className="text-xs font-medium text-gray-600 mb-2">Formato</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setFormato("9:16")} className={`rounded-lg border p-3 text-left transition-colors ${formato === "9:16" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <div className="h-10 w-6 rounded bg-gray-300 mb-2" />
              <p className="text-xs font-medium text-gray-800">9:16 Vertical</p>
              <p className="text-[10px] text-gray-400">Reels / TikTok</p>
            </button>
            <button onClick={() => setFormato("16:9")} className={`rounded-lg border p-3 text-left transition-colors ${formato === "16:9" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <div className="h-6 w-10 rounded bg-gray-300 mb-2" />
              <p className="text-xs font-medium text-gray-800">16:9 Horizontal</p>
              <p className="text-[10px] text-gray-400">Portais / YouTube</p>
            </button>
          </div>

          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Trilha sonora</p>
          <select value={trilha} onChange={(e) => setTrilha(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white mb-4">
            {TRILHAS.map((t) => <option key={t}>{t}</option>)}
          </select>

          <button onClick={gerarVideo} disabled={gerando || fotos.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5">
            {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><Video className="h-4 w-4" /> Gerar vídeo tour</>}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col">
        <p className="text-sm font-semibold text-gray-900 mb-1">Estúdio de vídeo</p>
        <p className="text-xs text-gray-400 mb-4">Acompanhe a geração e visualize o resultado.</p>

        {!gerando && !pronto && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 py-16">
            <Video className="h-8 w-8 mb-3 text-gray-300" />
            <p className="text-sm">Configure e clique em "Gerar vídeo tour" para começar.</p>
          </div>
        )}

        {gerando && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10">
            <div className="relative h-28 w-28 rounded-full flex items-center justify-center">
              <svg className="h-28 w-28 -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="#2563eb" strokeWidth="8" fill="none" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - progresso / 100)} className="transition-all duration-300" />
              </svg>
              <span className="absolute text-lg font-semibold text-gray-800">{progresso}%</span>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> {log}</p>
          </div>
        )}

        {pronto && !gerando && (
          <div className="flex-1 flex flex-col">
            <div className={`relative mx-auto bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center ${formato === "9:16" ? "w-40 h-72" : "w-full h-56"}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-gray-900" />
              <button onClick={() => setTocando((v) => !v)} className="relative z-10 h-12 w-12 rounded-full bg-white/90 flex items-center justify-center text-gray-900">
                {tocando ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <div className="absolute bottom-3 inset-x-3 h-1 rounded-full bg-white/20">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: tocando ? "45%" : "0%" }} />
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">Cobertura Savassi · {formato} · {trilha}</p>
            <div className="flex gap-3 mt-5">
              <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5">
                <Download className="h-4 w-4" /> Baixar MP4
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5">
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   ANALISADOR JURÍDICO (produto extra visto na referência)
============================================================================ */

function riscoStyle(risco) {
  if (risco === "Alto") return { cor: "text-red-600", bg: "bg-red-50" };
  if (risco === "Médio") return { cor: "text-amber-600", bg: "bg-amber-50" };
  if (risco === "Baixo") return { cor: "text-emerald-600", bg: "bg-emerald-50" };
  return { cor: "text-gray-500", bg: "bg-gray-100" };
}

function NovaAnaliseModal({ onClose, onEnviar, enviando }) {
  const [nomeImovel, setNomeImovel] = useState("");
  const [arquivo, setArquivo] = useState(null);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={enviando ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-900">Nova análise jurídica</p>
          <button onClick={onClose} disabled={enviando} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nome ou referência do imóvel</label>
        <input value={nomeImovel} onChange={(e) => setNomeImovel(e.target.value)} placeholder="Ex: Cobertura Savassi"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 mb-4" />

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Documento (PDF)</label>
        <label className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors py-6 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-blue-500 cursor-pointer">
          <Upload className="h-5 w-5" />
          <p className="text-xs font-medium">{arquivo ? arquivo.name : "Clique para escolher o PDF"}</p>
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
        </label>

        <button
          onClick={() => onEnviar({ nomeImovel, arquivo })}
          disabled={!arquivo || enviando}
          className="w-full mt-5 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5">
          {enviando ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando documento...</> : <><FileText className="h-4 w-4" /> Enviar para análise</>}
        </button>
        <p className="text-[11px] text-gray-400 mt-3 text-center">Ferramenta de apoio — não substitui a revisão de um advogado.</p>
      </div>
    </div>
  );
}

function JuridicoScreen({ token }) {
  const [analises, setAnalises] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function carregarAnalises() {
    setCarregando(true);
    setErro("");
    try {
      const resp = await fetch(`${API_BASE}/juridico/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Não foi possível carregar as análises.");
      setAnalises(await resp.json());
    } catch (err) {
      setErro(err instanceof TypeError ? `Não consegui falar com o backend (${API_BASE}).` : err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarAnalises(); }, []);

  async function enviarAnalise({ nomeImovel, arquivo }) {
    setEnviando(true);
    setErro("");
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      if (nomeImovel) formData.append("nome_imovel", nomeImovel);

      const resp = await fetch(`${API_BASE}/juridico/analisar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) {
        const erroResp = await resp.json().catch(() => ({}));
        throw new Error(erroResp.detail || "Não foi possível analisar o documento.");
      }
      await carregarAnalises();
      setModalAberto(false);
    } catch (err) {
      setErro(err instanceof TypeError ? `Não consegui falar com o backend (${API_BASE}).` : err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Analisador Jurídico</p>
          <p className="text-xs text-gray-500 mt-1 max-w-lg">Analisa a matrícula e os documentos dos vendedores e aponta dívidas, processos e outros riscos do imóvel antes de fechar negócio.</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 shrink-0">
          <FileText className="h-4 w-4" /> Nova análise
        </button>
      </div>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{erro}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><p className="text-sm font-semibold text-gray-900">Análises recentes</p></div>

        {carregando ? (
          <div className="px-5 py-10 flex items-center justify-center text-gray-400 gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando análises...
          </div>
        ) : analises.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Nenhuma análise ainda. Clique em "Nova análise" para enviar o primeiro documento.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {analises.map((a) => {
              const s = riscoStyle(a.risco);
              return (
                <div key={a.id} className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg ${s.bg} ${s.cor} flex items-center justify-center shrink-0`}><AlertTriangle className="h-4 w-4" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800">{a.nome_imovel || a.nome_arquivo}</p>
                        {!a.gerado_por_ia && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">modo demonstração</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{a.nome_arquivo}</p>
                      <p className="text-xs text-gray-600 mt-1 max-w-lg">{a.resumo}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${s.bg} ${s.cor}`}>Risco {a.risco}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalAberto && (
        <NovaAnaliseModal onClose={() => setModalAberto(false)} onEnviar={enviarAnalise} enviando={enviando} />
      )}
    </div>
  );
}

/* ============================================================================
   CONFIGURAÇÕES
============================================================================ */

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${checked ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function ConfiguracoesScreen() {
  const [numero, setNumero] = useState("(31) 99887-6655");
  const [distribuicao, setDistribuicao] = useState("Round robin");
  const [ativos, setAtivos] = useState({ Diego: true, Marina: true, Rafael: false });
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function salvar() { setSalvo(true); setTimeout(() => setSalvo(false), 2000); }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Número do WhatsApp da imobiliária</p>
        <p className="text-xs text-gray-400 mb-4">Número usado pela IA para atender os leads automaticamente.</p>
        <div className="flex gap-3">
          <input value={numero} onChange={(e) => setNumero(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400" />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 rounded-lg"><Check className="h-3.5 w-3.5" /> Conectado</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Distribuição automática de leads</p>
        <p className="text-xs text-gray-400 mb-4">Defina como os leads qualificados são repassados entre corretores.</p>
        <select value={distribuicao} onChange={(e) => setDistribuicao(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 bg-white mb-5">
          <option>Round robin (revezamento entre corretores)</option>
          <option>Por região do imóvel</option>
          <option>Por disponibilidade em tempo real</option>
          <option>Manual (corretor escolhe na fila)</option>
        </select>

        <p className="text-xs font-medium text-gray-600 mb-2.5">Corretores ativos na distribuição</p>
        <div className="space-y-2">
          {Object.keys(ativos).map((nome) => (
            <div key={nome} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center">{nome[0]}</div>
                <p className="text-sm text-gray-700">{nome} {nome === "Diego" && "Souza"}{nome === "Marina" && "Silva"}{nome === "Rafael" && "Prado"}</p>
              </div>
              <Toggle checked={ativos[nome]} onChange={(v) => setAtivos((a) => ({ ...a, [nome]: v }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Notificações</p>
        <div className="flex items-center justify-between py-2">
          <div><p className="text-sm text-gray-700">Avisar corretor no WhatsApp</p><p className="text-xs text-gray-400">Quando um lead é encaminhado para a fila</p></div>
          <Toggle checked={notifWhatsapp} onChange={setNotifWhatsapp} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div><p className="text-sm text-gray-700">Resumo diário por e-mail</p><p className="text-xs text-gray-400">Relatório de leads e conversões do dia</p></div>
          <Toggle checked={notifEmail} onChange={setNotifEmail} />
        </div>
      </div>

      <button onClick={salvar} className={`flex items-center gap-2 rounded-lg text-sm font-medium px-5 py-2.5 transition-colors ${salvo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
        {salvo ? <><Check className="h-4 w-4" /> Alterações salvas</> : "Salvar alterações"}
      </button>
    </div>
  );
}

/* ============================================================================
   APP ROOT
============================================================================ */

export default function ReceivlyApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");

  const leadsFiltrados = useMemo(() => {
    if (!search.trim()) return LEADS;
    return LEADS.filter((l) => l.nome.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const unread = LEADS.filter((l) => l.status !== "Qualificado" && l.status !== "IA respondendo").length;

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={(u) => {
          setUser({ nome: u.nome, email: u.email });
          setToken(u.token);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  function logout() {
    setIsAuthenticated(false);
    setToken(null);
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      <Sidebar screen={screen} onNavigate={setScreen} unread={unread} user={user} onLogout={logout} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header screen={screen} user={user} onLogout={logout} search={search} setSearch={setSearch} />

        <main className="flex-1 min-w-0">
          {screen === "dashboard" && <DashboardScreen leads={leadsFiltrados} onSelectLead={setSelectedLead} />}
          {screen === "whatsapp" && <WhatsAppScreen token={token} />}
          {screen === "anuncios" && <AnunciosScreen />}
          {screen === "videos" && <VideosScreen />}
          {screen === "juridico" && <JuridicoScreen token={token} />}
          {screen === "configuracoes" && <ConfiguracoesScreen />}
        </main>
      </div>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}