import React, { useState, useEffect, useRef, useMemo } from "react";
import { ui } from "./ui/theme.js";
import { MapaCroquiComparaveis, ModalAjustePosicaoMapa } from "./ui/MapaComparaveis.jsx";
import { AssinaturaScreen, PlanoAssinaturaPanel, usePlano } from "./ui/PlanoAssinatura.jsx";
import { DashboardScreen } from "./ui/Dashboard.jsx";
import { FotoToursScreen } from "./ui/FotoTours.jsx";
import {
  LayoutGrid, MessageCircle, Video, Settings, Search, Bell, ChevronDown,
  Eye, EyeOff, LogOut, X, ArrowRight, Check, Copy, Upload, Image as ImageIcon,
  Play, Pause, Download, Share2, Sparkles, TrendingUp, Clock, Phone, MapPin,
  Home as HomeIcon, FileText, ShieldCheck, User, Users, Send, Bot, ArrowLeft,
  Trash2, ChevronRight, Star, Building2, AlertTriangle, Loader2, BadgeCheck,
  SlidersHorizontal, Camera, Globe, MessageSquare, Volume2, LayoutList,
  DollarSign, BedDouble, Car, PenLine, Calculator, ImagePlus, Plus, CreditCard,
  ChevronUp, ChevronLeft, Printer, MapPinned, FolderSearch, Layers, HelpCircle
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
  { cor: "bg-brand-500", texto: "Lead qualificado", detalhe: "Apto 2 quartos, região Pampulha, encaminhado para Marina", tempo: "há 41 min" },
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

function Logo({ className = "", light = true }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-brand-900/40 ring-1 ring-white/20">
        R
      </div>
      <div className="leading-tight">
        <p className={`text-sm font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>Receivly</p>
        <p className={`text-[10px] font-medium tracking-[0.12em] uppercase ${light ? "text-slate-500" : "text-slate-400"}`}>Painel imobiliária</p>
      </div>
    </div>
  );
}

/* ============================================================================
   LOADING / TRANSIÇÃO ENTRE TELAS
============================================================================ */

function TopProgressBar({ active }) {
  return (
    <div className={`fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none print:hidden transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0"}`}>
      <div className="h-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" style={{ width: "40%", animation: "receivly-loadingbar 0.6s ease-in-out infinite" }} />
    </div>
  );
}

function ScreenSkeleton() {
  return (
    <div className={`${ui.contentWrap} animate-pulse`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${ui.card} ${ui.cardPad} h-28`}>
            <div className="h-2.5 w-20 rounded-full bg-slate-100 mb-4" />
            <div className="h-6 w-16 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
      <div className={`${ui.card} ${ui.cardPad} space-y-3`}>
        <div className="h-3 w-40 rounded-full bg-slate-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-slate-50" />
        ))}
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

      onLogin({
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        eh_admin: usuario.eh_admin,
        token,
      });
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
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,108,246,0.35),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.2),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 via-slate-950 to-black" />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 w-full">
          <Logo />
          <div className="max-w-lg">
            <p className={`${ui.sectionKicker} text-brand-300 mb-5`}>Receivly para imobiliárias</p>
            <h1 className="text-4xl xl:text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight mb-5">
              Sua imobiliária não precisa de mais tarefas. Precisa de mais negócios.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Uma plataforma de IA para atender leads, analisar documentos, gerar anúncios e produzir laudos — enquanto seu time foca em fechar negócio.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-lg">
            {[
              { value: "+40 mil", label: "leads atendidos" },
              { value: "64%", label: "qualificação média" },
              { value: "300+", label: "imobiliárias" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--surface-page)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10"><Logo light={false} /></div>

          <div className={`${ui.card} ${ui.cardPad} shadow-lg shadow-slate-900/5`}>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
            {mode === "login" && "Entrar na sua conta"}
            {mode === "cadastro" && "Criar conta da imobiliária"}
            {mode === "recuperar" && "Recuperar senha"}
          </h2>
          <p className={`${ui.sectionDesc} mb-8`}>
            {mode === "login" && "Acesse o painel da sua imobiliária."}
            {mode === "cadastro" && "Leva menos de 2 minutos para começar."}
            {mode === "recuperar" && "Enviaremos um link de redefinição para seu e-mail."}
          </p>

          {recuperado ? (
            <div className={`${ui.alertSuccess} flex items-start gap-3`}>
              <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Link enviado!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Confira sua caixa de entrada em {email}.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <div className={`${ui.alertError} flex items-start gap-2`}>
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p>{erro}</p>
                </div>
              )}
              {mode === "cadastro" && (
                <>
                  <div className="relative">
                    <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder=" " className={`peer ${ui.inputFloating}`} />
                    <label className={ui.labelFloating}>Seu nome</label>
                  </div>
                  <div className="relative">
                    <input value={imobiliaria} onChange={(e) => setImobiliaria(e.target.value)} required placeholder=" " className={`peer ${ui.inputFloating}`} />
                    <label className={ui.labelFloating}>Nome da imobiliária</label>
                  </div>
                </>
              )}

              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder=" " className={`peer ${ui.inputFloating}`} />
                <label className={ui.labelFloating}>E-mail</label>
                {/(.+)@(.+)\.(.+)/.test(email) && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>

              {mode !== "recuperar" && (
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder=" "
                    className={`peer ${ui.inputFloating} pr-10`} />
                  <label className={ui.labelFloating}>Senha</label>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {mode === "login" && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("recuperar")} className="text-xs text-brand-600 hover:text-brand-700 font-semibold cursor-pointer">
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading} className={`w-full ${ui.btnPrimary}`}>
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

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" && (
              <>Ainda não tem conta?{" "}
                <button onClick={() => setMode("cadastro")} className="text-brand-600 font-semibold hover:text-brand-700 cursor-pointer">Criar conta da imobiliária</button>
              </>
            )}
            {mode === "cadastro" && (
              <>Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-brand-600 font-semibold hover:text-brand-700 cursor-pointer">Entrar</button>
              </>
            )}
            {mode === "recuperar" && (
              <button onClick={() => { setMode("login"); setRecuperado(false); }} className="text-brand-600 font-semibold hover:text-brand-700 cursor-pointer">Voltar para o login</button>
            )}
          </div>
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
  { id: "whatsapp", label: "IA para WhatsApp", icon: MessageCircle },
  { id: "anuncios", label: "IA para Anúncios", icon: PenLine, tag: "novo" },
  { id: "avaliacoes", label: "Avaliações Imobiliárias", icon: Calculator },
  { id: "fotos", label: "Foto Tours", icon: ImageIcon },
];
const NAV_CONTA = [
  { id: "assinatura", label: "Assinatura", icon: CreditCard, tag: "pro" },
  { id: "configuracoes", label: "Configurações", icon: Settings },
];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button onClick={() => onClick(item.id)}
      className={`${ui.navItem} ${active ? ui.navActive : ui.navIdle}`}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-400" : "text-slate-500"}`} />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />}
      {item.tag && (
        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${item.tag === "novo" ? "bg-brand-500/20 text-brand-300" : item.tag === "pro" ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-500"}`}>
          {item.tag}
        </span>
      )}
    </button>
  );
}

function Sidebar({ screen, onNavigate, unread, user, onLogout, plano, carregandoPlano }) {
  return (
    <aside className={`${ui.sidebar} print:hidden`}>
      <div className="p-5 border-b border-white/[0.06]"><Logo /></div>
      <nav className="flex-1 px-3 py-5 space-y-7 overflow-y-auto">
        <div>
          <p className={`px-3 ${ui.sectionKicker} text-slate-600 mb-2`}>Geral</p>
          <div className="space-y-0.5">
            {NAV_GERAL.map((item) => <NavItem key={item.id} item={item} active={screen === item.id} onClick={onNavigate} />)}
          </div>
        </div>
        <div>
          <p className={`px-3 ${ui.sectionKicker} text-slate-600 mb-2`}>Produtos</p>
          <div className="space-y-0.5">
            {NAV_PRODUTOS.map((item) => (
              <div key={item.id} className="relative">
                <NavItem item={item} active={screen === item.id} onClick={onNavigate} />
                {item.id === "whatsapp" && unread > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 min-w-5 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-950">
                    {unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className={`px-3 ${ui.sectionKicker} text-slate-600 mb-2`}>Conta</p>
          <div className="space-y-0.5">
            {NAV_CONTA.map((item) => <NavItem key={item.id} item={item} active={screen === item.id} onClick={onNavigate} />)}
          </div>
        </div>
      </nav>
      <div className="p-4 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => onNavigate("assinatura")}
          className="w-full rounded-xl bg-gradient-to-br from-brand-500/10 to-white/[0.03] border border-white/[0.06] p-3.5 text-left hover:border-brand-500/30 transition-colors cursor-pointer"
        >
          <p className="text-xs font-semibold text-white">{plano?.eh_admin ? "Ambiente admin" : "Receivly Pro"}</p>
          {carregandoPlano ? (
            <p className="text-[11px] text-slate-500 mt-1">Carregando...</p>
          ) : (
            <PlanoAssinaturaPanel token={null} plano={plano} carregando={false} compacto />
          )}
          {!plano?.eh_admin && (
            <p className="text-[10px] text-brand-400 mt-2 font-medium">Ver plano e pagar →</p>
          )}
        </button>
        <button onClick={onLogout} className="w-full mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer">
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
  dashboard: ["Início", "Resumo", "Visão geral"],
  whatsapp: ["PAINEL", "ATENDIMENTO", "IA para WhatsApp"],
  anuncios: ["PAINEL", "PRODUTOS", "IA para Anúncios"],
  avaliacoes: ["PAINEL", "PRODUTOS", "Avaliações Imobiliárias"],
  fotos: ["PAINEL", "PRODUTOS", "Foto Tours"],
  assinatura: ["PAINEL", "CONTA", "Assinatura"],
  configuracoes: ["PAINEL", "CONTA", "Configurações"],
};

function Header({ screen, user, onLogout, notificacoes = [], naoLidas = 0, onNotificacaoClick }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [bc0, bc1, title] = BREADCRUMBS[screen] || ["PAINEL", "", ""];

  return (
    <header className={`${ui.header} print:hidden`}>
      <div>
        <p className={`${ui.sectionKicker} text-slate-400`}>{bc0} · {bc1}</p>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button onClick={() => { setShowNotif((v) => !v); setShowUser(false); }}
            className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer">
            <Bell className="h-4 w-4" />
            {naoLidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            )}
          </button>
          {showNotif && (
            <div className={`${ui.dropdown} w-80 p-2 ui-fade-in max-h-96 overflow-y-auto`}>
              <p className={`px-2 py-1.5 ${ui.sectionKicker}`}>Notificações</p>
              {notificacoes.length === 0 ? (
                <p className="px-2 py-4 text-xs text-slate-400 text-center">Nenhuma notificação no momento.</p>
              ) : notificacoes.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onNotificacaoClick?.(a); setShowNotif(false); }}
                  className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 text-left cursor-pointer"
                >
                  <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${a.tipo === "avaliacao" ? "bg-emerald-500" : a.tipo === "whatsapp" ? "bg-brand-500" : "bg-amber-500"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">{a.texto}</p>
                    <p className="text-[11px] text-slate-400 truncate">{a.detalhe} · {a.tempo}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setShowUser((v) => !v); setShowNotif(false); }} className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold flex items-center justify-center shadow-sm">
              {user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <span className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-700">
              {user.nome}
              {user.eh_admin && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700">
                  Admin
                </span>
              )}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {showUser && (
            <div className={`${ui.dropdown} w-52`}>
              <p className="px-3 py-2 text-xs text-slate-400 truncate border-b border-slate-100 mb-1">{user.email}</p>
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                <LogOut className="h-3.5 w-3.5" /> Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function LeadDrawer({ lead, onClose }) {
  if (!lead) return null;
  const s = scoreStyle(lead.score);
  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className={`${ui.drawer} animate-in slide-in-from-right duration-200`}>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 ${ui.avatar} text-sm`}>{lead.avatar}</div>
            <div>
              <p className="font-semibold text-slate-900">{lead.nome}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.telefone}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          <div className={`rounded-xl ${s.bg} ring-1 ${s.ring} p-4 flex items-center justify-between`}>
            <div>
              <p className="text-xs text-slate-500">Score de qualificação IA</p>
              <p className={`text-2xl font-semibold ${s.text}`}>{lead.score}/100</p>
            </div>
            <Sparkles className={`h-6 w-6 ${s.text}`} />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2.5">FICHA DE PREFERÊNCIAS</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400 flex items-center gap-1"><HomeIcon className="h-3 w-3" /> Imóvel</p><p className="font-medium text-slate-800 mt-0.5">{lead.imovel}</p></div>
              <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> Bairro</p><p className="font-medium text-slate-800 mt-0.5">{lead.bairro}</p></div>
              <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Orçamento</p><p className="font-medium text-slate-800 mt-0.5">{lead.valor}</p></div>
              <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400 flex items-center gap-1"><Globe className="h-3 w-3" /> Canal</p><p className="font-medium text-slate-800 mt-0.5">{lead.canal}</p></div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2.5">LINHA DO TEMPO</p>
            <div className="space-y-4">
              {[
                { t: lead.timestamp, d: `Status atual: ${lead.status}` },
                { t: "há 1 dia", d: "IA identificou intenção de compra e extraiu preferências automaticamente" },
                { t: "há 1 dia", d: `Lead chegou via ${lead.canal}` },
              ].map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-brand-600 mt-1.5" />
                    {i < 2 && <span className="w-px flex-1 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs text-slate-400">{ev.t}</p>
                    <p className="text-sm text-slate-700">{ev.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2">
          <button className={`flex-1 ${ui.btnPrimary}`}>Assumir conversa</button>
          <button className={`${ui.btnSecondary} px-4`}>Encaminhar</button>
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
    <div className="ui-card p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 hover:shadow-sm transition-shadow" style={{ borderLeftColor: lead.score_ia < 50 ? "#ef4444" : lead.score_ia < 80 ? "#f59e0b" : "#10b981" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-slate-900 text-sm">{lead.nome}</p>
          <span className="text-[11px] text-slate-400">{lead.telefone}</span>
        </div>
        <p className="text-sm text-slate-600 mt-1 truncate">{conversa.ultima_mensagem || "Sem mensagens ainda."}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
          <span>Orçamento {lead.valor || "—"}</span>
          <span>{lead.bairro || "Bairro —"}</span>
          <span>{lead.quartos_interesse ? `${lead.quartos_interesse} quartos` : "Quartos —"}</span>
          <span>{lead.vagas_interesse ? `${lead.vagas_interesse} vagas` : "Vagas —"}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <ScoreBadge score={lead.score_ia} />
        <button onClick={() => onAssumir(conversa.id)} className={`${ui.btnPrimary} text-xs px-4 py-2 mt-1`}>Abrir conversa →</button>
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
    return <div className="p-10 flex items-center justify-center text-slate-400 gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando conversa...</div>;
  }
  if (!conversa) {
    return <div className="p-10 text-center text-red-500 text-sm">{erro || "Conversa não encontrada."}</div>;
  }

  const lead = conversa.lead;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-140px)] ui-card overflow-hidden">
      {/* coluna chat */}
      <div className="flex-1 flex flex-col border-r border-slate-100 min-w-0">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onVoltar} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4" /></button>
            <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center shrink-0">
              {lead.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 text-sm truncate">{lead.nome}</p>
              <p className="text-[11px] text-slate-400 truncate">{lead.telefone}</p>
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

        <div className={ui.chatArea}>
          {conversa.mensagens.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-6">Nenhuma mensagem ainda — use o simulador de lead, no painel à direita, pra começar a conversa.</p>
          )}
          {conversa.mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.remetente === "lead" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.remetente === "lead" ? "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                : m.remetente === "ia" ? "bg-brand-600 text-white rounded-br-sm"
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

        <div className="p-3 border-t border-slate-100 flex items-center gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarComoCorretorAsync()}
            placeholder={conversa.ia_ativa ? "Assuma a conversa para responder..." : "Digite uma mensagem..."} disabled={conversa.ia_ativa || enviando}
            className={`${ui.input} bg-slate-50 disabled:opacity-60`} />
          <button onClick={enviarComoCorretorAsync} disabled={conversa.ia_ativa || enviando} className={`h-10 w-10 ${ui.btnPrimary} p-0 disabled:opacity-40 disabled:cursor-not-allowed`}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* coluna insights */}
      <div className="w-full md:w-72 shrink-0 p-5 space-y-5 overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2">AI INSIGHTS</p>
          <div className="space-y-2.5">
            <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400">Orçamento</p><p className="text-sm font-medium text-slate-800">{lead.valor || "ainda não identificado"}</p></div>
            <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400">Tipo / interesse</p><p className="text-sm font-medium text-slate-800">{lead.imovel_interesse || "ainda não identificado"}</p></div>
            <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400">Bairro</p><p className="text-sm font-medium text-slate-800">{lead.bairro || "ainda não identificado"}</p></div>
            <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400">Quartos</p><p className="text-sm font-medium text-slate-800">{lead.quartos_interesse || "ainda não identificado"}</p></div>
            <div className="rounded-lg border border-slate-100 p-3"><p className="text-[11px] text-slate-400">Vagas</p><p className="text-sm font-medium text-slate-800">{lead.vagas_interesse || "ainda não identificado"}</p></div>
          </div>
        </div>

        <button onClick={alternarIa}
          className={`w-full ${conversa.ia_ativa ? ui.btnPrimary : "rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2.5 transition-colors cursor-pointer"}`}>
          {conversa.ia_ativa ? "Assumir conversa / Desativar IA" : "Devolver conversa para a IA"}
        </button>

        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3.5">
          <p className="text-[11px] font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> SIMULADOR DE LEAD (modo de teste)
          </p>
          <p className="text-[11px] text-amber-700 mb-2.5">Como o número real do WhatsApp ainda não está conectado, use isso pra simular o que o cliente estaria digitando.</p>
          <textarea value={textoSimulado} onChange={(e) => setTextoSimulado(e.target.value)} rows={2} placeholder="Ex: Qual o valor do condomínio?"
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 resize-none mb-2 transition-colors" />
          <button onClick={simularMensagemDoLead} disabled={simulando || !textoSimulado.trim()}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium py-2 transition-colors cursor-pointer disabled:cursor-not-allowed">
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
      <div className="absolute inset-0 bg-black/30 cursor-pointer" onClick={enviando ? undefined : onClose} />
      <div className={`relative w-full max-w-md ${ui.card} ${ui.cardPad} shadow-2xl`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-slate-900">Simular novo lead</p>
          <button onClick={onClose} disabled={enviando} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4">Sem número de WhatsApp real conectado ainda — isso simula a primeira mensagem de um cliente novo, pra testar o fluxo completo.</p>

        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nome do lead</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Luiza Faria"
          className={`${ui.input} mb-3`} />

        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Telefone (só pra identificar a conversa)</label>
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex: 31999990000"
          className={`${ui.input} mb-3`} />

        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Primeira mensagem</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
          className={`${ui.input} resize-none mb-4`} />

        <button onClick={() => onEnviar({ nome, telefone, texto })} disabled={!nome || !telefone || !texto || enviando}
          className={`w-full ${ui.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
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
  const [filtroBairro, setFiltroBairro] = useState("");
  const [filtroQuartos, setFiltroQuartos] = useState("");
  const [filtroVagas, setFiltroVagas] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

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

  function passaFiltro(c) {
    const l = c.lead;
    if (filtroBairro && !(l.bairro || "").toLowerCase().includes(filtroBairro.toLowerCase())) return false;
    if (filtroQuartos && !(l.quartos_interesse || "").includes(filtroQuartos)) return false;
    if (filtroVagas && !(l.vagas_interesse || "").includes(filtroVagas)) return false;
    if (filtroStatus === "fila" && c.ia_ativa) return false;
    if (filtroStatus === "ia" && !c.ia_ativa) return false;
    return true;
  }

  const filtradas = conversas.filter(passaFiltro);
  const fila = filtradas.filter((c) => !c.ia_ativa);
  const emAndamento = filtradas.filter((c) => c.ia_ativa);

  return (
    <div className={ui.contentWrap}>
      <div className={ui.screenHeader}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="max-w-lg">
            <p className={ui.sectionTitle}>IA para WhatsApp</p>
            <p className={`${ui.sectionDesc} mt-1`}>Conversa naturalmente com o cliente, extrai os dados dele sem formulário e chama o corretor certo assim que perceber que é hora de um humano assumir.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex gap-6">
              <div><p className="text-lg font-semibold text-slate-900">{conversas.length}</p><p className="text-[11px] text-slate-400">conversas totais</p></div>
              <div><p className="text-lg font-semibold text-slate-900">{fila.length}</p><p className="text-[11px] text-slate-400">aguardando corretor</p></div>
            </div>
            <button onClick={() => setModalAberto(true)} className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3.5 py-2.5 transition-colors cursor-pointer">
              <AlertTriangle className="h-3.5 w-3.5" /> Simular novo lead
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Número real do WhatsApp Business ainda não conectado — use o botão acima pra testar o atendimento.</p>
      </div>

      {erro && (
        <div className={`${ui.alertError} flex items-start gap-2`}>
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p>{erro}</p>
        </div>
      )}

      {!carregando && (
        <div className={`${ui.card} p-4 grid grid-cols-2 md:grid-cols-4 gap-3`}>
          <Campo label="Bairro"><input value={filtroBairro} onChange={(e) => setFiltroBairro(e.target.value)} placeholder="Filtrar..." className={campoInputClass} /></Campo>
          <Campo label="Quartos"><input value={filtroQuartos} onChange={(e) => setFiltroQuartos(e.target.value)} placeholder="Ex: 3" className={campoInputClass} /></Campo>
          <Campo label="Vagas"><input value={filtroVagas} onChange={(e) => setFiltroVagas(e.target.value)} placeholder="Ex: 2" className={campoInputClass} /></Campo>
          <Campo label="Status">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              <option value="todos">Todos</option>
              <option value="fila">Aguardando corretor</option>
              <option value="ia">IA respondendo</option>
            </select>
          </Campo>
        </div>
      )}

      {carregando ? (
        <div className={`${ui.card} px-5 py-10 flex items-center justify-center text-slate-400 gap-2 text-sm`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversas...
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={ui.sectionTitle}>Aguardando corretor</p>
                <p className="text-xs text-slate-400">A IA já encaminhou ou o corretor assumiu essas conversas.</p>
              </div>
            </div>
            {fila.length === 0 ? (
              <div className="ui-card px-5 py-8 text-center text-sm text-slate-400">Nenhuma conversa aguardando corretor no momento.</div>
            ) : (
              <div className="space-y-3">
                {fila.map((c) => <ConversaCard key={c.id} conversa={c} onAssumir={setChatAbertoId} />)}
              </div>
            )}
          </div>

          <div className="ui-card p-5">
            <p className="text-sm font-semibold text-slate-900 mb-1">Conversas em andamento</p>
            <p className="text-xs text-slate-400 mb-4">A IA ainda está atendendo, sem necessidade de corretor.</p>
            {emAndamento.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhuma conversa em andamento.</p>
            ) : (
              <div className="space-y-3">
                {emAndamento.map((c) => (
                  <div key={c.id} onClick={() => setChatAbertoId(c.id)} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 ${ui.avatar}`}>
                        {c.lead.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{c.lead.nome}</p>
                        <p className="text-xs text-slate-400 truncate">{c.ultima_mensagem || "Sem mensagens ainda"}</p>
                      </div>
                    </div>
                    <span className="text-xs text-brand-600 shrink-0 flex items-center gap-1"><Bot className="h-3 w-3" /> IA respondendo</span>
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

function AnunciosScreen({ token }) {
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
  const [erro, setErro] = useState("");
  const [geradoPorIa, setGeradoPorIa] = useState(false);

  const etapas = ["Analisando características do imóvel...", "Adaptando tom de voz...", "Escrevendo para cada canal...", "Finalizando..."];

  async function gerar() {
    setGerando(true);
    setResultado(null);
    setErro("");
    setGeradoPorIa(false);
    setEtapa(0);
    const interval = setInterval(() => {
      setEtapa((prev) => Math.min(prev + 1, etapas.length - 1));
    }, 550);

    try {
      const resp = await fetch(`${API_BASE}/anuncios/gerar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          descricao,
          tipo_imovel: tipo,
          bairro,
          preco,
          suites: Number(suites) || 0,
          vagas: Number(vagas) || 0,
          tom_de_voz: TONS_VOZ[tomIdx],
        }),
      });

      if (!resp.ok) {
        const detalhe = await resp.json().catch(() => ({}));
        throw new Error(detalhe.detail || "Não foi possível gerar os anúncios.");
      }

      const dados = await resp.json();
      setResultado(dados);
      setGeradoPorIa(Boolean(dados.gerado_por_ia));
      setAba("portal");
    } catch (exc) {
      setErro(exc.message || "Erro ao gerar anúncios.");
    } finally {
      clearInterval(interval);
      setGerando(false);
      setEtapa(etapas.length - 1);
    }
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
    <div className={`${ui.contentWrap} grid grid-cols-1 lg:grid-cols-2 gap-6 !space-y-0`}>
      {/* inputs */}
      <div className={`${ui.card} ${ui.cardPad} space-y-4 h-fit`}>
        <div>
          <p className={ui.sectionTitle}>Gerador de anúncios com IA</p>
          <p className={`${ui.sectionDesc} mt-1`}>Preencha as características do imóvel e a IA escreve para cada canal.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Descrição bruta do imóvel</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3}
            className={`${ui.input} resize-none`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo de imóvel</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${ui.input} cursor-pointer`}>
              {["Apartamento", "Casa", "Cobertura", "Studio", "Terreno"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Bairro</label>
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={ui.input} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Preço</label>
            <input value={preco} onChange={(e) => setPreco(e.target.value)} className={ui.input} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1"><BedDouble className="h-3 w-3" /> Suítes</label>
            <input type="number" min={0} value={suites} onChange={(e) => setSuites(e.target.value)} className={ui.input} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1"><Car className="h-3 w-3" /> Vagas</label>
            <input type="number" min={0} value={vagas} onChange={(e) => setVagas(e.target.value)} className={ui.input} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-2.5 flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Tom de voz da IA</label>
          <input type="range" min={0} max={3} step={1} value={tomIdx} onChange={(e) => setTomIdx(Number(e.target.value))}
            className="w-full accent-brand-600 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            {TONS_VOZ.map((t, i) => <span key={t} className={i === tomIdx ? "text-brand-600 font-semibold" : ""}>{t}</span>)}
          </div>
        </div>

        <button onClick={gerar} disabled={gerando}
          className={`w-full ${ui.btnPrimary} disabled:opacity-70 disabled:cursor-not-allowed`}>
          {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> {etapas[Math.min(etapa, etapas.length - 1)]}</> : <><Sparkles className="h-4 w-4" /> Gerar material de divulgação com IA</>}
        </button>
        {gerando && (
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full ui-progress-fill transition-all duration-500" style={{ width: `${(etapa / etapas.length) * 100}%` }} />
          </div>
        )}
        {erro && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}
      </div>

      {/* outputs */}
      <div className={`${ui.card} ${ui.cardPad} flex flex-col`}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className={ui.sectionTitle}>Resultados gerados</p>
          {resultado && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${geradoPorIa ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500"}`}>
              {geradoPorIa ? "via Groq" : "modo local"}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">Textos prontos para cada canal de divulgação.</p>

        {!resultado ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-slate-400">
            <PenLine className="h-8 w-8 mb-3 text-slate-300" />
            <p className="text-sm">Preencha os dados e clique em gerar para ver os textos aqui.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-slate-50 rounded-lg p-1 mb-4">
              {abas.map((a) => (
                <button key={a.id} onClick={() => setAba(a.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-colors ${aba === a.id ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700"} cursor-pointer`}>
                  <a.icon className="h-3.5 w-3.5" /> {a.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{resultado[aba]}</pre>
            </div>
            <button onClick={() => copiar(resultado[aba])}
              className={`mt-4 w-full flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-2.5 transition-colors ${copiado ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-900 hover:bg-gray-800 text-white"} cursor-pointer`}>
              {copiado ? <><Check className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar conteúdo</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   AVALIAÇÕES IMOBILIÁRIAS (integrado ao backend)
============================================================================ */

const IMOVEL_VAZIO = {
  endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", cep: "", matricula: "",
  tipo: "Apartamento", areaImovel: "", areaTerreno: "", quartos: "", banheiros: "", vagas: "",
  caracteristicas: "", observacoes: "",
  padraoConstrutivo: "normal", idadeAnos: "", estadoConservacao: "", testadaM: "",
  testadaReferenciaM: "10", vidaUtilAnos: "60",
  latitude: null, longitude: null, mapaSateliteUrl: null,
};

const OPCOES_PADRAO = [
  { value: "luxo", label: "Luxo / Alto padrão" },
  { value: "normal", label: "Normal / Médio" },
  { value: "simples", label: "Simples" },
  { value: "economico", label: "Econômico" },
  { value: "minimo", label: "Mínimo" },
  { value: "rustico", label: "Rústico" },
];

const CATEGORIAS_FOTO = ["Fachada", "Sala", "Cozinha", "Quartos", "Banheiros", "Área externa", "Outros"];

async function apiAvaliacoes(token, path, options = {}) {
  const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  let resp;
  try {
    resp = await fetch(`${API_BASE}/avaliacoes${path}`, { ...options, headers });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Não consegui conectar ao backend (${API_BASE}). Verifique se o servidor está rodando.`);
    }
    throw err;
  }
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`;
    try { const d = await resp.json(); msg = d.detail || msg; } catch { /* ignore */ }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  if (resp.status === 204) return null;
  const ct = resp.headers.get("content-type") || "";
  return ct.includes("application/json") ? resp.json() : resp;
}

function imovelFromApi(d) {
  if (!d) return { ...IMOVEL_VAZIO };
  return {
    endereco: d.endereco || "", numero: d.numero || "", complemento: d.complemento || "",
    bairro: d.bairro || "", cidade: d.cidade || "", estado: d.estado || "", cep: d.cep || "",
    matricula: d.matricula || "",
    tipo: d.tipo || "Apartamento",
    areaImovel: d.area_imovel != null ? String(d.area_imovel) : "",
    areaTerreno: d.area_terreno != null ? String(d.area_terreno) : "",
    quartos: d.quartos != null ? String(d.quartos) : "",
    banheiros: d.banheiros != null ? String(d.banheiros) : "",
    vagas: d.vagas != null ? String(d.vagas) : "",
    caracteristicas: d.caracteristicas || "", observacoes: d.observacoes || "",
    padraoConstrutivo: d.padrao_construtivo || "normal",
    idadeAnos: d.idade_anos != null ? String(d.idade_anos) : "",
    estadoConservacao: d.estado_conservacao != null ? String(d.estado_conservacao) : "",
    testadaM: d.testada_m != null ? String(d.testada_m) : "",
    testadaReferenciaM: d.testada_referencia_m != null ? String(d.testada_referencia_m) : "10",
    vidaUtilAnos: d.vida_util_anos != null ? String(d.vida_util_anos) : "60",
    latitude: d.latitude ?? null, longitude: d.longitude ?? null,
    mapaSateliteUrl: d.latitude && d.longitude
      ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${d.longitude - 0.002},${d.latitude - 0.002},${d.longitude + 0.002},${d.latitude + 0.002}&bboxSR=4326&imageSR=4326&size=800,480&format=jpg&f=image`
      : null,
  };
}

function imovelToApi(imovel) {
  const areaImovel = parseNumeroBR(imovel.areaImovel);
  return {
    endereco: imovel.endereco || null, numero: imovel.numero || null,
    complemento: imovel.complemento || null, bairro: imovel.bairro || null,
    cidade: imovel.cidade || null, estado: imovel.estado || null, cep: imovel.cep || null,
    matricula: imovel.matricula || null,
    tipo: imovel.tipo || "Apartamento",
    area_imovel: Number.isFinite(areaImovel) && areaImovel > 0 ? areaImovel : null,
    area_terreno: imovel.areaTerreno ? Number(imovel.areaTerreno) : null,
    quartos: imovel.quartos ? Number(imovel.quartos) : null,
    banheiros: imovel.banheiros ? Number(imovel.banheiros) : null,
    vagas: imovel.vagas ? Number(imovel.vagas) : null,
    caracteristicas: imovel.caracteristicas || null, observacoes: imovel.observacoes || null,
    padrao_construtivo: imovel.padraoConstrutivo || "normal",
    idade_anos: imovel.idadeAnos ? Number(imovel.idadeAnos) : null,
    estado_conservacao: imovel.estadoConservacao ? Number(imovel.estadoConservacao) : null,
    testada_m: imovel.testadaM ? Number(imovel.testadaM) : null,
    testada_referencia_m: imovel.testadaReferenciaM ? Number(imovel.testadaReferenciaM) : 10,
    vida_util_anos: imovel.vidaUtilAnos ? Number(imovel.vidaUtilAnos) : 60,
    latitude: imovel.latitude, longitude: imovel.longitude,
  };
}

function comparavelFromApi(c) {
  const processados = !!(c.fatores_calculados_por_ia || c.fatores_editados_manualmente);
  return {
    id: c.id, endereco: c.endereco, bairro: c.bairro || "", cidade: c.cidade || "",
    area: c.area, quartos: c.quartos ?? "", banheiros: c.banheiros ?? "", vagas: c.vagas ?? "",
    valor: c.valor, fonte: c.fonte || "", distancia: c.distancia || "",
    latitude: c.latitude ?? null, longitude: c.longitude ?? null,
    observacoes: c.observacoes || "",
    link: c.link || "", descricaoAnuncio: c.descricao_anuncio || "",
    padraoConstrutivo: c.padrao_construtivo || "", idadeAnos: c.idade_anos ?? "",
    estadoConservacao: c.estado_conservacao ?? "", testadaM: c.testada_m ?? "",
    fatorLocal: c.fator_local,
    fatorArea: c.fator_area,
    fatorDepreciacao: c.fator_depreciacao,
    fatorPadrao: c.fator_padrao,
    fatorTestada: c.fator_testada,
    fatoresCalculadosPorIa: !!c.fatores_calculados_por_ia,
    fatoresEditadosManualmente: !!c.fatores_editados_manualmente,
    fatoresProcessados: processados,
    justificativasFatores: c.justificativas_fatores || {},
  };
}

function urlFoto(f) {
  return f?.url || f?.urlOtimizada || f?.urlOriginal || "";
}

const COR_LAUDO_PADRAO = "#F59E0B";
const CORES_LAUDO_SUGERIDAS = ["#F59E0B", "#EA580C", "#EAB308", "#2563EB", "#059669", "#7C3AED", "#1F2937", "#000000"];

function normalizarCorLaudo(cor) {
  const c = (cor || "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(c) ? c.toUpperCase() : COR_LAUDO_PADRAO;
}

function corLaudoEfetiva(branding) {
  return normalizarCorLaudo(branding?.corDestaqueLaudo);
}

function brandingFromApi(b) {
  if (!b) {
    return {
      logoUrl: null, templateLaudoUrl: null, templateLaudoNome: null,
      exibirLogoLaudo: false, ocultarCabecalhoLaudo: false, corDestaqueLaudo: COR_LAUDO_PADRAO,
    };
  }
  const logoPath = b.logo_laudo_url || b.marca_dagua_url;
  return {
    logoUrl: logoPath ? `${API_BASE}${logoPath}` : null,
    templateLaudoUrl: b.template_laudo_url ? `${API_BASE}${b.template_laudo_url}` : null,
    templateLaudoNome: b.template_laudo_nome || null,
    exibirLogoLaudo: !!(b.exibir_logo_laudo ?? b.usar_marca_dagua),
    ocultarCabecalhoLaudo: !!b.ocultar_cabecalho_laudo,
    corDestaqueLaudo: normalizarCorLaudo(b.cor_destaque_laudo),
  };
}

function comparavelToApi(c) {
  return {
    endereco: c.endereco, bairro: c.bairro || null, cidade: c.cidade || null,
    area: parseNumeroBR(c.area) || 0, quartos: c.quartos ? Number(c.quartos) : null,
    banheiros: c.banheiros ? Number(c.banheiros) : null, vagas: c.vagas ? Number(c.vagas) : null,
    valor: parseNumeroBR(c.valor), fonte: c.fonte || null, distancia: c.distancia || null,
    observacoes: c.observacoes || null,
    link: c.link || null, descricao_anuncio: c.descricaoAnuncio || null,
    padrao_construtivo: c.padraoConstrutivo || null,
    idade_anos: c.idadeAnos !== "" && c.idadeAnos != null ? Number(c.idadeAnos) : null,
    estado_conservacao: c.estadoConservacao !== "" && c.estadoConservacao != null ? Number(c.estadoConservacao) : null,
    testada_m: c.testadaM !== "" && c.testadaM != null ? Number(c.testadaM) : null,
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
  };
}

function fotoFromApi(f) {
  return {
    id: f.id, nome: f.nome_arquivo, categoria: f.categoria, ordem: f.ordem,
    tamanhoOriginal: f.tamanho_original, tamanhoOtimizado: f.tamanho_otimizado,
    url: `${API_BASE}${f.url}`, remota: true,
  };
}

function PdfPreview({ url, title, className = "w-full min-h-[680px] border border-slate-200 rounded bg-white" }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    setBlobUrl(null);
    setErro(null);
    if (!url) return undefined;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Não foi possível carregar o PDF. Verifique se o backend está rodando.");
        return r.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((err) => {
        if (active) setErro(err.message || "Erro ao carregar PDF.");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (erro) {
    return (
      <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800">
        <p>{erro}</p>
        <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-brand-600 hover:text-brand-700 text-xs font-medium">Abrir em nova aba</a>
      </div>
    );
  }
  if (!blobUrl) {
    return (
      <div className={`flex items-center justify-center gap-2 text-sm text-slate-500 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando PDF...
      </div>
    );
  }
  return <iframe title={title || "PDF"} src={`${blobUrl}#toolbar=0`} className={className} />;
}

function documentoFromApi(d) {
  const ct = (d.content_type || "").toLowerCase();
  const nome = (d.nome_arquivo || "").toLowerCase();
  const ehPdf = ct.includes("pdf") || nome.endsWith(".pdf");
  const ehImagem = ct.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(nome);
  return {
    id: d.id,
    nome: d.nome_arquivo,
    descricao: d.descricao || "",
    contentType: d.content_type || "",
    tamanhoBytes: d.tamanho_bytes,
    url: `${API_BASE}${d.url}`,
    ehPdf,
    ehImagem,
    ehVisualizavel: ehPdf || ehImagem,
  };
}

function formatarDataAvaliacao(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function mascaraCep(v) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function formatBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Área do imóvel avaliado: cadastro ou mediana dos comparáveis. */
function areaImovelEfetiva(imovel, comparaveis = []) {
  const cadastrada = parseNumeroBR(imovel?.areaImovel);
  if (Number.isFinite(cadastrada) && cadastrada > 0) return cadastrada;
  const areas = comparaveis.map((c) => Number(c.area)).filter((a) => a > 0).sort((a, b) => a - b);
  if (!areas.length) return 0;
  return areas[Math.floor(areas.length / 2)];
}

/** Formata número para exibição/edição pt-BR (485000 → "485.000"). */
function formatNumeroBR(val) {
  if (val == null || val === "") return "";
  const n = typeof val === "number" ? val : parseNumeroBR(val);
  if (!Number.isFinite(n)) return String(val);
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Converte texto pt-BR (485.000, 1.485.000, 485,50, R$ 485.000) em número. */
function parseNumeroBR(val) {
  if (val == null || val === "") return NaN;
  if (typeof val === "number") return val;
  let s = String(val).trim().replace(/\s/g, "").replace(/^R\$\s?/i, "");
  if (!s) return NaN;

  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");

  if (temVirgula && temPonto) {
    const ultimoVirgula = s.lastIndexOf(",");
    const ultimoPonto = s.lastIndexOf(".");
    if (ultimoVirgula > ultimoPonto) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (temVirgula) {
    const partes = s.split(",");
    const ultima = partes[partes.length - 1];
    if (partes.length > 1 && ultima.length === 3 && partes.every((p) => /^\d+$/.test(p))) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (temPonto) {
    const partes = s.split(".");
    const ultima = partes[partes.length - 1];
    if (partes.length > 1 && ultima.length === 3 && partes.every((p) => /^\d+$/.test(p))) {
      s = s.replace(/\./g, "");
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Formata valor monetário enquanto digita (pt-BR). */
function mascaraValorMoedaBR(val) {
  const raw = String(val ?? "");
  if (!raw.trim()) return "";
  const soDigitos = /^\d+$/.test(raw.replace(/\s/g, ""));
  if (soDigitos) {
    return parseInt(raw.replace(/\D/g, ""), 10).toLocaleString("pt-BR");
  }
  const n = parseNumeroBR(raw);
  return Number.isFinite(n) ? formatNumeroBR(n) : raw;
}

/** Valor numérico a partir do campo monetário; usa fallback se vazio ou inválido. */
function valorMoedaBR(val, fallback = 0) {
  if (val == null || String(val).trim() === "") return fallback;
  const n = parseNumeroBR(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const campoInputClass = ui.input;

function LabelObrigatorio({ obrigatorio, children }) {
  return (
    <>
      {children}
      {obrigatorio && <span className="text-amber-600 ml-0.5 font-semibold" title="Campo obrigatório">*</span>}
    </>
  );
}

function Campo({ label, children, obrigatorio, erro }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1.5 block">
        <LabelObrigatorio obrigatorio={obrigatorio}>{label}</LabelObrigatorio>
      </label>
      {children}
      {erro && <p className="text-[11px] text-red-500 mt-1">{erro}</p>}
    </div>
  );
}

function CampoComHint({ label, hint, children, obrigatorio, erro }) {
  return (
    <div>
      <div className="flex items-start gap-1.5 mb-1.5">
        <label className="text-xs font-medium text-slate-600">
          <LabelObrigatorio obrigatorio={obrigatorio}>{label}</LabelObrigatorio>
        </label>
        {hint && (
          <span className="group relative shrink-0 mt-0.5">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
            <span className="pointer-events-none invisible group-hover:visible absolute z-20 left-0 top-5 w-60 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed shadow-xl">
              {hint}
            </span>
          </span>
        )}
      </div>
      {children}
      {erro && <p className="text-[11px] text-red-500 mt-1">{erro}</p>}
    </div>
  );
}

function ModalConfirmacao({ titulo, mensagem, confirmarLabel = "Confirmar", cancelarLabel = "Cancelar", perigo, carregando, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={carregando ? undefined : onCancelar} />
      <div className={`relative w-full max-w-sm ${ui.card} ${ui.cardPad} shadow-2xl ui-fade-in`}>
        <p className="text-sm font-semibold text-slate-900">{titulo}</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{mensagem}</p>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onCancelar} disabled={carregando} className={`flex-1 ${ui.btnSecondary} disabled:opacity-50`}>
            {cancelarLabel}
          </button>
          <button type="button" onClick={onConfirmar} disabled={carregando}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold py-2.5 px-4 transition-all disabled:opacity-50 ${
              perigo ? "bg-red-600 hover:bg-red-700 text-white shadow-sm" : ui.btnPrimary
            }`}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmarLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaginacaoControles({ pagina, totalPaginas, totalItens, porPagina, onPagina }) {
  if (totalItens <= porPagina) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, totalItens);
  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
      <p className="text-xs text-slate-500">{inicio}–{fim} de {totalItens}</p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPagina(pagina - 1)} disabled={pagina <= 1}
          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-slate-600 px-2">{pagina} / {totalPaginas}</span>
        <button type="button" onClick={() => onPagina(pagina + 1)} disabled={pagina >= totalPaginas}
          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const AVALIACOES_POR_PAGINA = 8;

function calcularAjustes(comparavel, imovel, comparaveis = []) {
  // Método Comparativo Direto / Tratamento por Fatores (NBR 14.653). O Fator Área usa a
  // fórmula informada pela avaliadora (Abunahman). Local, Depreciação, Padrão e Testada
  // dependem do critério dela: seguem neutros (1,00) até serem configurados. Como na tabela
  // do laudo de referência, cada ajuste é calculado sobre o unitário base e somado a ele.
  const areaImovel = areaImovelEfetiva(imovel, comparaveis.length ? comparaveis : [comparavel]) || comparavel.area || 1;
  const areaComparavel = comparavel.area || areaImovel;
  const diffPercentual = Math.abs((areaComparavel - areaImovel) / areaImovel) * 100;
  const expoente = diffPercentual <= 30 ? 0.25 : 0.125;
  const fatorAreaCalculado = Math.pow(areaComparavel / areaImovel, expoente);
  const fatorArea = comparavel.fatorArea ?? comparavel.fator_area ?? fatorAreaCalculado;

  const fatorLocal = comparavel.fatorLocal ?? 1;
  const fatorDepreciacao = comparavel.fatorDepreciacao ?? 1;
  const fatorPadrao = comparavel.fatorPadrao ?? 1;
  const fatorTestada = comparavel.fatorTestada ?? 1;
  const fatorOferta = comparavel.fatorOferta ?? comparavel.fator_oferta ?? 1;
  const fatoresProcessados = comparavel.fatoresProcessados ?? false;
  const fatoresEditadosManualmente = comparavel.fatoresEditadosManualmente ?? false;

  const valorUnitarioBruto = comparavel.valor / areaComparavel;
  const valorUnitarioBase = valorUnitarioBruto * fatorOferta;
  const ajustar = (f) => valorUnitarioBase * (f - 1);
  const ajustes = {
    local: ajustar(fatorLocal),
    area: ajustar(fatorArea),
    depreciacao: ajustar(fatorDepreciacao),
    padrao: ajustar(fatorPadrao),
    testada: ajustar(fatorTestada),
  };
  const somaAjustes = Object.values(ajustes).reduce((s, v) => s + v, 0);
  const valorUnitarioHomogeneizado = valorUnitarioBase + somaAjustes;
  const fatorTotal = valorUnitarioBase ? valorUnitarioHomogeneizado / valorUnitarioBase : 1;
  const resultadoAjustado = valorUnitarioHomogeneizado * areaImovel;

  return {
    fatorArea, fatorLocal, fatorDepreciacao, fatorPadrao, fatorTestada, fatorOferta, ajustes, fatorTotal,
    valorUnitarioBruto, valorUnitarioBase, valorUnitarioHomogeneizado, resultadoAjustado, fatoresProcessados, fatoresEditadosManualmente,
  };
}

function estatisticasComparaveis(comparaveis) {
  if (comparaveis.length === 0) return null;
  const valores = comparaveis.map((c) => c.valor);
  const valorM2 = comparaveis.map((c) => c.valor / c.area);
  return {
    quantidade: comparaveis.length,
    min: Math.min(...valores),
    max: Math.max(...valores),
    mediaM2: valorM2.reduce((a, b) => a + b, 0) / valorM2.length,
  };
}

function statusAvaliacaoStyle(status) {
  if (status === "Concluída") return { bg: "bg-emerald-50", text: "text-emerald-700" };
  if (status === "Em andamento") return { bg: "bg-amber-50", text: "text-amber-700" };
  return { bg: "bg-slate-100", text: "text-slate-500" };
}

function AvaliacaoStepper({ etapaAtual, onIrPara }) {
  const etapas = [
    { n: 1, label: "Imóvel" }, { n: 2, label: "Comparáveis" }, { n: 3, label: "Cálculos" },
    { n: 4, label: "Fotos" }, { n: 5, label: "Resultado" }, { n: 6, label: "Relatório" },
  ];
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {etapas.map((e, i) => (
        <React.Fragment key={e.n}>
          <button onClick={() => e.n <= etapaAtual && onIrPara(e.n)} disabled={e.n > etapaAtual}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              e.n === etapaAtual ? "bg-brand-600 text-white" : e.n < etapaAtual ? "text-brand-600 hover:bg-brand-50" : "text-slate-300 cursor-not-allowed"
            } cursor-pointer`}>
            <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] shrink-0 ${e.n === etapaAtual ? "bg-white/20" : e.n < etapaAtual ? "bg-blue-100" : "bg-slate-100"}`}>
              {e.n < etapaAtual ? <Check className="h-2.5 w-2.5" /> : e.n}
            </span>
            {e.label}
          </button>
          {i < etapas.length - 1 && <div className={`h-px w-3 shrink-0 ${e.n < etapaAtual ? "bg-brand-200" : "bg-slate-200"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function AvaliacoesScreen({ avaliacoes, carregando, erro, onNovaAvaliacao, onContinuar, onExcluir, excluindoId, plano, onIrAssinatura }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [excluirAlvo, setExcluirAlvo] = useState(null);

  const tiposDisponiveis = [...new Set(avaliacoes.map((a) => a.tipo).filter(Boolean))];

  const filtradas = avaliacoes.filter((a) => {
    const termo = busca.trim().toLowerCase();
    const enderecoLinha = [a.endereco, a.numero, a.bairro, a.cidade, a.tipo].filter(Boolean).join(" ").toLowerCase();
    if (termo && !enderecoLinha.includes(termo)) return false;
    if (filtroStatus && a.status !== filtroStatus) return false;
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / AVALIACOES_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginadas = filtradas.slice(
    (paginaAtual - 1) * AVALIACOES_POR_PAGINA,
    paginaAtual * AVALIACOES_POR_PAGINA
  );

  useEffect(() => { setPagina(1); }, [busca, filtroStatus, filtroTipo]);

  async function confirmarExclusao() {
    if (!excluirAlvo) return;
    await onExcluir(excluirAlvo);
    setExcluirAlvo(null);
  }

  return (
    <div className={`${ui.contentWrap} !space-y-4 max-h-[calc(100vh-7rem)] flex flex-col`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className={ui.sectionTitle}>Avaliações imobiliárias</p>
          <p className={`${ui.sectionDesc} mt-1`}>Cadastre o imóvel, adicione comparáveis e deixe o Receivly ajudar nos cálculos e no relatório.</p>
          {plano?.ativo && (
            <p className="text-xs text-slate-500 mt-2">
              Este mês: <strong>{plano.avaliacoes_usadas_mes ?? 0}/{plano.avaliacoes_limite_mes ?? 25}</strong> incluídas
              {(plano.creditos_avaliacao ?? 0) > 0 && <> · <strong>{plano.creditos_avaliacao}</strong> crédito(s) extra</>}
            </p>
          )}
        </div>
        <button
          onClick={onNovaAvaliacao}
          disabled={carregando || (plano && !plano.pode_criar_avaliacao)}
          className={`flex items-center gap-2 ${ui.btnPrimary} px-4 disabled:opacity-60`}
        >
          <Calculator className="h-4 w-4" /> Nova avaliação
        </button>
      </div>

      {plano && !plano.ativo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>Assine o plano para criar avaliações.</span>
          <button type="button" onClick={onIrAssinatura} className="text-sm font-semibold text-brand-600 hover:underline cursor-pointer">Ir para Assinatura →</button>
        </div>
      )}

      {plano?.ativo && !plano.pode_criar_avaliacao && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>Limite mensal atingido. Compre créditos extras para continuar.</span>
          <button type="button" onClick={onIrAssinatura} className="text-sm font-semibold text-brand-600 hover:underline cursor-pointer">Comprar créditos →</button>
        </div>
      )}

      {erro && (
        <div className={`${ui.alertError} text-sm`}>
          {erro}
          {(erro.includes("Limite") || erro.includes("Plano inativo") || erro.includes("Assine")) && onIrAssinatura && (
            <button type="button" onClick={onIrAssinatura} className="block mt-2 text-brand-600 font-semibold hover:underline cursor-pointer">Abrir Assinatura</button>
          )}
        </div>
      )}

      <div className={`${ui.searchPanel}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por endereço, bairro, cidade ou tipo..."
              className={`${ui.input} pl-9`} />
          </div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
            className={`${ui.input} cursor-pointer`}>
            <option value="">Todos os status</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Concluída">Concluída</option>
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
            className={`${ui.input} cursor-pointer`}>
            <option value="">Todos os tipos</option>
            {tiposDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className={`${ui.card} overflow-hidden flex-1 min-h-0 flex flex-col`}>
        {carregando ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
        ) : filtradas.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            {avaliacoes.length === 0 ? "Nenhuma avaliação ainda. Clique em \"Nova avaliação\" para começar." : "Nenhum imóvel encontrado com os filtros aplicados."}
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50 flex-1 min-h-0 overflow-y-auto">
              {paginadas.map((a) => {
                const s = statusAvaliacaoStyle(a.status);
                const enderecoLinha = [a.endereco, a.numero].filter(Boolean).join(", ");
                return (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.tipo}{a.bairro ? ` — ${a.bairro}` : ""}</p>
                        <p className="text-[11px] text-slate-400 truncate">{enderecoLinha || "Sem endereço"}{a.cidade ? `, ${a.cidade}` : ""} · {formatarDataAvaliacao(a.atualizado_em)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{a.status}</span>
                      <p className="text-sm font-medium text-slate-800 w-24 text-right hidden sm:block">{a.valor_final ? formatBRL(a.valor_final) : "—"}</p>
                      <button onClick={() => onContinuar(a.id)} className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5 cursor-pointer whitespace-nowrap">
                        Continuar <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setExcluirAlvo(a.id)} disabled={excluindoId === a.id}
                        className="text-slate-300 hover:text-red-500 disabled:opacity-50 cursor-pointer p-1" title="Excluir avaliação">
                        {excluindoId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginacaoControles
              pagina={paginaAtual}
              totalPaginas={totalPaginas}
              totalItens={filtradas.length}
              porPagina={AVALIACOES_POR_PAGINA}
              onPagina={setPagina}
            />
          </>
        )}
      </div>

      {excluirAlvo && (
        <ModalConfirmacao
          titulo="Excluir avaliação?"
          mensagem="Esta ação remove a avaliação, comparáveis, fotos e cálculos associados. Não pode ser desfeita."
          confirmarLabel="Excluir"
          perigo
          carregando={excluindoId === excluirAlvo}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setExcluirAlvo(null)}
        />
      )}
    </div>
  );
}

function EtapaImovel({ imovel, setImovel, onProximo, token, buscandoCep, erroCep, onConsultarCep, salvando }) {
  const [mostrarErros, setMostrarErros] = useState(false);

  function set(campo, valor) { setImovel((i) => ({ ...i, [campo]: valor })); }

  function handleCepChange(e) {
    const formatado = mascaraCep(e.target.value);
    set("cep", formatado);
    if (formatado.replace(/\D/g, "").length === 8) onConsultarCep(formatado);
  }

  const enderecoValido = Boolean(imovel.endereco?.trim());
  const areaValida = parseNumeroBR(imovel.areaImovel) > 0;
  const podeContinuar = enderecoValido && areaValida;
  const inputErroClass = " border-red-300 ring-1 ring-red-200 focus:border-red-400 focus:ring-red-200";

  function handleContinuar() {
    if (!podeContinuar) {
      setMostrarErros(true);
      return;
    }
    onProximo();
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 ui-card p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Dados do imóvel</p>
          <p className="text-xs text-slate-500 mt-1">
            Informe o CEP para preencher o endereço automaticamente. Campos com <span className="text-amber-600 font-semibold">*</span> são obrigatórios.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="CEP">
            <div className="relative">
              <input value={imovel.cep} onChange={handleCepChange} placeholder="00000-000" className={campoInputClass} />
              {buscandoCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-blue-500" />}
            </div>
            {erroCep && <p className="text-[11px] text-red-500 mt-1">{erroCep}</p>}
          </Campo>
          <Campo label="Tipo do imóvel">
            <select value={imovel.tipo} onChange={(e) => set("tipo", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              {["Apartamento", "Casa", "Sala comercial", "Terreno", "Galpão"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
        </div>
        <Campo
          label="Endereço (localização do imóvel)"
          obrigatorio
          erro={mostrarErros && !enderecoValido ? "Informe o endereço do imóvel." : null}
        >
          <input
            value={imovel.endereco}
            onChange={(e) => set("endereco", e.target.value)}
            className={campoInputClass + (mostrarErros && !enderecoValido ? inputErroClass : "")}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Número"><input value={imovel.numero} onChange={(e) => set("numero", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Complemento"><input value={imovel.complemento} onChange={(e) => set("complemento", e.target.value)} className={campoInputClass} /></Campo>
        </div>
        <Campo label="Matrícula do imóvel">
          <input value={imovel.matricula} onChange={(e) => set("matricula", e.target.value)} placeholder="Ex: 12.345 do 1º CRI de Belo Horizonte" className={campoInputClass} />
          <p className="text-[11px] text-slate-400 mt-1.5">Opcional. Só o número da matrícula não preenche os demais campos — use o CEP ou informe manualmente. Para extrair dados, envie o PDF da certidão no Anexo I (etapa Relatório).</p>
        </Campo>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Bairro"><input value={imovel.bairro} onChange={(e) => set("bairro", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Cidade"><input value={imovel.cidade} onChange={(e) => set("cidade", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Estado"><input value={imovel.estado} onChange={(e) => set("estado", e.target.value)} className={campoInputClass} maxLength={2} /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Área do imóvel (m²)"
            obrigatorio
            erro={mostrarErros && !areaValida ? "Informe a área em m² (maior que zero)." : null}
          >
            <input
              value={imovel.areaImovel}
              onChange={(e) => set("areaImovel", e.target.value)}
              placeholder="Ex: 70"
              className={campoInputClass + (mostrarErros && !areaValida ? inputErroClass : "")}
            />
          </Campo>
          <Campo label="Área do terreno (m²) — quando aplicável"><input value={imovel.areaTerreno} onChange={(e) => set("areaTerreno", e.target.value)} className={campoInputClass} /></Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Quartos"><input value={imovel.quartos} onChange={(e) => set("quartos", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Banheiros"><input value={imovel.banheiros} onChange={(e) => set("banheiros", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Vagas de garagem"><input value={imovel.vagas} onChange={(e) => set("vagas", e.target.value)} className={campoInputClass} /></Campo>
        </div>
        <Campo label="Características adicionais"><input value={imovel.caracteristicas} onChange={(e) => set("caracteristicas", e.target.value)} className={campoInputClass} /></Campo>
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <CampoComHint label="Padrão construtivo" hint="Qualidade geral do acabamento e do projeto: luxo (alto padrão), normal (padrão de mercado), simples ou econômico. Use o que mais se aproxima do imóvel na vistoria.">
            <select value={imovel.padraoConstrutivo} onChange={(e) => set("padraoConstrutivo", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              {OPCOES_PADRAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </CampoComHint>
          <CampoComHint label="Idade aparente (anos)" hint="Há quantos anos a edificação foi construída ou reformada por completo. Ex.: imóvel de 2010 em 2026 ≈ 16 anos. Se não souber, deixe em branco.">
            <input type="number" min={0} value={imovel.idadeAnos} onChange={(e) => set("idadeAnos", e.target.value)} className={campoInputClass} placeholder="Ex: 15" />
          </CampoComHint>
          <CampoComHint label="Estado de conservação (0–100)" hint="Nota da vistoria: 90–100 novo/ótimo, 75–89 bom, 60–74 regular, 40–59 precisa reparos, abaixo de 40 mau estado. Quanto maior, melhor conservado.">
            <input type="number" min={0} max={100} value={imovel.estadoConservacao} onChange={(e) => set("estadoConservacao", e.target.value)} className={campoInputClass} placeholder="Ex: 75" />
          </CampoComHint>
          <CampoComHint label="Testada do lote (m)" hint="Largura da frente do terreno em metros. Só para casas, sobrados ou terrenos — deixe em branco para apartamentos.">
            <input type="number" min={0} step="0.1" value={imovel.testadaM} onChange={(e) => set("testadaM", e.target.value)} className={campoInputClass} placeholder="Ex: 12" />
          </CampoComHint>
        </div>
        <Campo label="Observações"><textarea rows={3} value={imovel.observacoes} onChange={(e) => set("observacoes", e.target.value)} className={campoInputClass + " resize-none"} /></Campo>
      </div>

      <div className="space-y-4">
        <div className="ui-card p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3">LOCALIZAÇÃO — IMAGEM DE SATÉLITE</p>
          <div className="relative h-56 rounded-lg overflow-hidden bg-gray-900 border border-slate-200">
            {imovel.mapaSateliteUrl ? (
              <>
                <img src={imovel.mapaSateliteUrl} alt="Vista de satélite do imóvel" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-10 w-10 rounded-full bg-brand-600/90 border-2 border-white shadow-lg flex items-center justify-center">
                    <MapPinned className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                  <span className="text-[10px] font-medium text-white bg-black/60 rounded px-2 py-1">{imovel.bairro || imovel.cidade || "Localização"}</span>
                  {imovel.latitude && <span className="text-[9px] text-white/80 bg-black/40 rounded px-1.5 py-0.5">{imovel.latitude.toFixed(5)}, {imovel.longitude.toFixed(5)}</span>}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-800 to-slate-900">
                <Globe className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs text-center px-4">Informe o CEP para carregar a imagem de satélite</p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Imagem satélite Esri World Imagery · geocodificação via OpenStreetMap.</p>
        </div>

        <div className="ui-card p-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">RESUMO</p>
          <p className="text-sm font-medium text-slate-800">{imovel.tipo} — {imovel.bairro}</p>
          <p className="text-xs text-slate-500 mt-1">{imovel.areaImovel} m² · {imovel.quartos} quartos · {imovel.vagas} vagas</p>
        </div>
      </div>

      <div className="xl:col-span-3 flex flex-col items-end gap-2">
        {!podeContinuar && !salvando && (
          <p className="text-xs text-slate-500">
            Para continuar, preencha{!enderecoValido ? " o endereço" : ""}{!enderecoValido && !areaValida ? " e" : ""}{!areaValida ? " a área do imóvel (m²)" : ""}.
          </p>
        )}
        <button
          type="button"
          onClick={handleContinuar}
          disabled={salvando}
          className={`flex items-center gap-2 ${ui.btnPrimary} px-5 disabled:opacity-50`}
        >
          {salvando ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <>Continuar para comparáveis <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}

function ModalComparavel({ onClose, onSalvar, salvando, inicial = null, titulo = "Adicionar imóvel comparável", rotuloSalvar = "Adicionar comparável" }) {
  const [dados, setDados] = useState(() => inicial ? {
    endereco: inicial.endereco || "",
    bairro: inicial.bairro || "",
    cidade: inicial.cidade || "",
    area: inicial.area ? String(inicial.area) : "",
    quartos: inicial.quartos != null && inicial.quartos !== "" ? String(inicial.quartos) : "",
    banheiros: inicial.banheiros != null && inicial.banheiros !== "" ? String(inicial.banheiros) : "",
    vagas: inicial.vagas != null && inicial.vagas !== "" ? String(inicial.vagas) : "",
    valor: inicial.valor ? formatNumeroBR(inicial.valor) : "",
    fonte: inicial.fonte || "",
    distancia: inicial.distancia || "",
    observacoes: inicial.observacoes || "",
  } : { endereco: "", bairro: "", cidade: "", area: "", quartos: "", banheiros: "", vagas: "", valor: "", fonte: "", distancia: "", observacoes: "" });
  function set(c, v) { setDados((d) => ({ ...d, [c]: v })); }
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-900">{titulo}</p>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Campo label="Endereço"><input value={dados.endereco} onChange={(e) => set("endereco", e.target.value)} className={campoInputClass} /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Bairro"><input value={dados.bairro} onChange={(e) => set("bairro", e.target.value)} className={campoInputClass} /></Campo>
            <Campo label="Cidade"><input value={dados.cidade} onChange={(e) => set("cidade", e.target.value)} className={campoInputClass} /></Campo>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Área (m²)"><input value={dados.area} onChange={(e) => set("area", e.target.value)} className={campoInputClass} /></Campo>
            <Campo label="Quartos"><input value={dados.quartos} onChange={(e) => set("quartos", e.target.value)} className={campoInputClass} /></Campo>
            <Campo label="Vagas"><input value={dados.vagas} onChange={(e) => set("vagas", e.target.value)} className={campoInputClass} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Valor anunciado (R$)"><input value={dados.valor} onChange={(e) => set("valor", e.target.value)} placeholder="Ex: 485.000" className={campoInputClass} /></Campo>
            <Campo label="Fonte"><input value={dados.fonte} onChange={(e) => set("fonte", e.target.value)} placeholder="Ex: OLX, Zap..." className={campoInputClass} /></Campo>
          </div>
          <Campo label="Distância do imóvel avaliado (km)"><input value={dados.distancia} onChange={(e) => set("distancia", e.target.value)} placeholder="Ex: 0,5" className={campoInputClass} /></Campo>
          <Campo label="Observações"><textarea rows={2} value={dados.observacoes} onChange={(e) => set("observacoes", e.target.value)} className={campoInputClass + " resize-none"} /></Campo>
        </div>
        <button
          onClick={() => onSalvar({ ...dados, area: parseNumeroBR(dados.area) || 0, valor: parseNumeroBR(dados.valor) || 0 })}
          disabled={!dados.endereco || !dados.valor || salvando || !parseNumeroBR(dados.valor) || !(parseNumeroBR(dados.area) > 0)}
          className={`w-full mt-5 ${ui.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
          {salvando ? "Salvando..." : rotuloSalvar}
        </button>
      </div>
    </div>
  );
}

function EtapaComparaveis({ imovel, comparaveis, setComparaveis, onVoltar, onProximo, token, avaliacaoId, onAdicionarComparavel, onEditarComparavel, onRemoverComparavel, onGeocodificarComparaveis, onMoverComparavel, erroBusca, usageLimits, onUsageUpdate, corDestaqueLaudo }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [salvandoModal, setSalvandoModal] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);
  const [mapaCompId, setMapaCompId] = useState(null);
  const [salvandoMapa, setSalvandoMapa] = useState(false);
  const areaBase = Number(imovel.areaImovel) || 0;
  const [criterios, setCriterios] = useState({
    tipo: imovel.tipo,
    areaMin: areaBase ? Math.round(areaBase * 0.8) : "",
    areaMax: areaBase ? Math.round(areaBase * 1.2) : "",
    raio: "2",
  });
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [metaBusca, setMetaBusca] = useState(null);
  const [erroLocal, setErroLocal] = useState(null);
  const stats = estatisticasComparaveis(comparaveis);

  function setCriterio(campo, valor) { setCriterios((c) => ({ ...c, [campo]: valor })); }

  const searchesUsed = usageLimits?.market_searches_used ?? 0;
  const searchesLimit = usageLimits?.market_searches_limit ?? 2;
  const comparablesLimit = usageLimits?.comparables_per_search_limit ?? 10;
  const searchesRemaining = Math.max(0, searchesLimit - searchesUsed);
  const searchLimitReached = searchesRemaining <= 0;

  async function buscar() {
    if (!avaliacaoId) {
      setErroLocal("Salve a avaliação antes de buscar comparáveis.");
      return;
    }
    if (searchLimitReached) return;

    setBuscando(true);
    setResultados(null);
    setMetaBusca(null);
    setErroLocal(null);
    try {
      const payload = await apiAvaliacoes(token, `/${avaliacaoId}/pesquisar-mercado`, {
        method: "POST",
        body: JSON.stringify({
          tipo: criterios.tipo,
          endereco: imovel.endereco || "",
          numero: imovel.numero || "",
          complemento: imovel.complemento || "",
          bairro: imovel.bairro || "",
          cidade: imovel.cidade || "",
          estado: imovel.estado || "",
          quartos: imovel.quartos ? Number(imovel.quartos) : null,
          banheiros: imovel.banheiros ? Number(imovel.banheiros) : null,
          vagas: imovel.vagas ? Number(imovel.vagas) : null,
          area_imovel: imovel.areaImovel ? Number(imovel.areaImovel) : null,
          area_min: criterios.areaMin ? Number(criterios.areaMin) : null,
          area_max: criterios.areaMax ? Number(criterios.areaMax) : null,
          raio_km: Number(criterios.raio) || 2,
        }),
      });
      setResultados((payload.results || []).map((r, i) => ({ ...r, _uid: `${r.endereco}-${i}` })));
      setMetaBusca(payload.meta || null);
      if (payload.usage && onUsageUpdate) onUsageUpdate(payload.usage);
    } catch (err) {
      setErroLocal(err.message);
    } finally {
      setBuscando(false);
    }
  }

  function jaAdicionado(r) {
    return comparaveis.some((c) => c.endereco === r.endereco && c.valor === r.valor);
  }

  async function adicionar(r) {
    if (jaAdicionado(r)) return;
    await onAdicionarComparavel({
      endereco: r.endereco, bairro: r.bairro || imovel.bairro, cidade: r.cidade || imovel.cidade,
      area: r.area, quartos: r.quartos || "", banheiros: "", vagas: r.vagas || "",
      valor: r.valor, fonte: r.fonte || "", distancia: "",
      link: r.link || "", descricaoAnuncio: r.descricao_anuncio || "",
      padraoConstrutivo: r.padrao_construtivo || "", idadeAnos: r.idade_anos ?? "",
      estadoConservacao: r.estado_conservacao ?? "", testadaM: r.testada_m ?? "",
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      observacoes: r.descricao_anuncio || (r.link ? `Link: ${r.link}` : ""),
    });
  }

  async function adicionarTodos() {
    for (const r of resultados || []) {
      if (!jaAdicionado(r)) await adicionar(r);
    }
  }

  async function salvarManual(dados) {
    setSalvandoModal(true);
    try {
      if (editandoId != null) {
        await onEditarComparavel(editandoId, dados);
        setEditandoId(null);
      } else {
        await onAdicionarComparavel(dados);
        setModalAberto(false);
      }
    } finally {
      setSalvandoModal(false);
    }
  }

  const comparavelEditando = editandoId != null ? comparaveis.find((c) => c.id === editandoId) : null;

  return (
    <div className="space-y-6">
      <div className={`${ui.searchPanel}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm"><FolderSearch className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Buscar imóveis comparáveis</p>
            <p className="text-xs text-slate-500 mt-0.5">A busca parte da localização do imóvel avaliado. Até {comparablesLimit} imóveis por busca.</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-100 px-3.5 py-2.5 mb-4 text-xs">
          <span className="text-slate-600">
            Buscas web: <span className="font-semibold text-slate-900">{searchesUsed}/{searchesLimit}</span>
            {searchesRemaining > 0 ? ` · ${searchesRemaining} restante${searchesRemaining > 1 ? "s" : ""}` : " · limite atingido"}
          </span>
          {usageLimits && searchesUsed >= searchesLimit - 1 && searchesRemaining > 0 && (
            <span className="text-amber-600 font-medium">Última busca disponível</span>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-3.5 py-2.5 mb-4">
          <MapPinned className="h-4 w-4 text-brand-600 shrink-0" />
          <p className="text-sm text-slate-700 truncate">{imovel.endereco}, {imovel.numero} — {imovel.bairro}, {imovel.cidade}/{imovel.estado}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Campo label="Tipo do imóvel">
            <select value={criterios.tipo} onChange={(e) => setCriterio("tipo", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              {["Apartamento", "Casa", "Sala comercial", "Terreno", "Galpão"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo label="Área mínima (m²)"><input value={criterios.areaMin} onChange={(e) => setCriterio("areaMin", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Área máxima (m²)"><input value={criterios.areaMax} onChange={(e) => setCriterio("areaMax", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Raio de busca">
            <select value={criterios.raio} onChange={(e) => setCriterio("raio", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              <option value="1">1 km</option><option value="2">2 km</option><option value="5">5 km</option>
            </select>
          </Campo>
        </div>

        <button onClick={buscar} disabled={buscando || searchLimitReached}
          className={`w-full ${ui.btnPrimary} py-3 disabled:opacity-80 disabled:cursor-not-allowed`}>
          {buscando ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando comparáveis...</> : searchLimitReached ? <>Limite de buscas atingido</> : <><Search className="h-4 w-4" /> Buscar comparáveis (até {comparablesLimit})</>}
        </button>

        {buscando && (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (<div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />))}
          </div>
        )}

        {(erroLocal || erroBusca) && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{erroLocal || erroBusca}</p>
        )}

        {metaBusca?.provedor === "demo" && (
          <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-xs text-violet-900">
            <p className="font-semibold">Modo demonstração</p>
            <p className="text-violet-700 mt-0.5">Comparáveis fictícios para apresentação — nenhuma busca web nem custo de IA.</p>
          </div>
        )}

        {metaBusca && metaBusca.provedor !== "demo" && (
          <p className="text-[11px] text-slate-500 mt-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            Provedor: <span className="font-semibold text-slate-700">{metaBusca.provedor}</span>
            {metaBusca.modelo && <> · modelo {metaBusca.modelo}</>}
            {metaBusca.duracao_ms != null && <> · {metaBusca.duracao_ms} ms</>}
            {metaBusca.erro && <span className="text-amber-600"> · {metaBusca.erro}</span>}
          </p>
        )}

        {resultados && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500">{resultados.length} imóveis encontrados</p>
              <button onClick={adicionarTodos} className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer">+ Adicionar todos à avaliação</button>
            </div>
            <div className="space-y-2">
              {resultados.map((r) => (
                <div key={r._uid} className="flex items-center justify-between bg-white rounded-lg border border-slate-100 px-4 py-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.endereco}</p>
                    <p className="text-xs text-slate-400">{r.bairro} · {r.area} m² · {r.quartos} quartos · {r.vagas} vagas · {r.fonte}{r.gerado_por_ia ? " · IA" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-slate-800">{formatBRL(r.valor)}</p>
                    {jaAdicionado(r) ? (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 whitespace-nowrap"><Check className="h-3.5 w-3.5" /> Adicionado</span>
                    ) : (
                      <button onClick={() => adicionar(r)} className="text-xs font-medium text-brand-600 hover:text-brand-700 whitespace-nowrap cursor-pointer">+ Adicionar à avaliação</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ui-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Comparáveis desta avaliação</p>
            <p className="text-xs text-slate-500 mt-1">Imóveis selecionados como referência. Você também pode adicionar um manualmente.</p>
          </div>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3.5 py-2.5 cursor-pointer transition-colors">
            <Plus className="h-3.5 w-3.5" /> Adicionar manualmente
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-400">Comparáveis encontrados</p><p className="text-lg font-semibold text-slate-900">{stats.quantidade}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-400">Faixa de preços anunciados</p><p className="text-sm font-semibold text-slate-900">{formatBRL(stats.min)} — {formatBRL(stats.max)}</p><p className="text-[10px] text-slate-400 mt-0.5">Preço pedido nos anúncios, não o valor final da avaliação</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-400">Valor médio/m²</p><p className="text-sm font-semibold text-slate-900">{formatBRL(stats.mediaM2)}</p></div>
          </div>
        )}

        {comparaveis.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <p className="text-xs font-semibold text-slate-600">Mapa das amostras (satélite)</p>
              <button
                type="button"
                disabled={geocodificando || !onGeocodificarComparaveis}
                onClick={async () => {
                  setGeocodificando(true);
                  try { await onGeocodificarComparaveis(); } finally { setGeocodificando(false); }
                }}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 cursor-pointer"
              >
                {geocodificando ? "Localizando..." : "Localizar amostras no mapa"}
              </button>
            </div>
            <MapaCroquiComparaveis imovel={imovel} comparaveis={comparaveis} altura={360} corDestaque={corDestaqueLaudo} />
            <p className="text-[10px] text-slate-400 mt-1.5">Para corrigir a posição de uma amostra, use o ícone de mapa ao lado da lixeira na tabela.</p>
          </div>
        )}
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 border-b border-slate-100">
                <th className="font-medium px-5 py-2.5">Endereço</th>
                <th className="font-medium px-5 py-2.5">Área</th>
                <th className="font-medium px-5 py-2.5">Quartos/Vagas</th>
                <th className="font-medium px-5 py-2.5">Valor</th>
                <th className="font-medium px-5 py-2.5">Valor/m²</th>
                <th className="font-medium px-5 py-2.5">Fonte</th>
                <th className="font-medium px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {comparaveis.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3"><p className="font-medium text-slate-800">{c.endereco}</p><p className="text-[11px] text-slate-400">{c.bairro}, {c.cidade}</p></td>
                  <td className="px-5 py-3 text-slate-600">{c.area} m²</td>
                  <td className="px-5 py-3 text-slate-600">{c.quartos}q · {c.vagas}v</td>
                  <td className="px-5 py-3 text-slate-800 font-medium">{formatBRL(c.valor)}</td>
                  <td className="px-5 py-3 text-slate-600">{c.area > 0 ? formatBRL(c.valor / c.area) : "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{c.fonte}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => setEditandoId(c.id)} title="Editar comparável" className="text-slate-400 hover:text-brand-600 cursor-pointer"><PenLine className="h-4 w-4" /></button>
                      <button type="button" onClick={async () => {
                        if (c.latitude == null && onGeocodificarComparaveis) await onGeocodificarComparaveis();
                        setMapaCompId(c.id);
                      }} title="Ajustar posição no mapa" className="text-slate-400 hover:text-brand-600 cursor-pointer"><MapPinned className="h-4 w-4" /></button>
                      <button type="button" onClick={() => onRemoverComparavel(c.id)} title="Remover" className="text-slate-300 hover:text-red-500 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {comparaveis.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">Nenhum comparável adicionado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} disabled={comparaveis.length === 0} className={`flex items-center gap-2 ${ui.btnPrimary} px-5 disabled:opacity-50 disabled:cursor-not-allowed`}>
          Continuar para cálculos <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {modalAberto && <ModalComparavel onClose={() => setModalAberto(false)} onSalvar={salvarManual} salvando={salvandoModal} />}
      {comparavelEditando && (
        <ModalComparavel
          inicial={comparavelEditando}
          titulo="Editar comparável"
          rotuloSalvar="Salvar alterações"
          onClose={() => setEditandoId(null)}
          onSalvar={salvarManual}
          salvando={salvandoModal}
        />
      )}
      {mapaCompId != null && (() => {
        const idx = comparaveis.findIndex((c) => c.id === mapaCompId);
        const comp = comparaveis[idx];
        if (!comp) return null;
        return (
          <ModalAjustePosicaoMapa
            comparavel={comp}
            indice={idx + 1}
            imovel={imovel}
            comparaveis={comparaveis}
            corDestaque={corDestaqueLaudo}
            salvando={salvandoMapa}
            onClose={() => setMapaCompId(null)}
            onSalvar={async (lat, lng) => {
              setSalvandoMapa(true);
              try {
                await onMoverComparavel(comp.id, lat, lng);
                setMapaCompId(null);
              } finally {
                setSalvandoMapa(false);
              }
            }}
          />
        );
      })()}
    </div>
  );
}

function FatorLinha({ nome, valor, definido }) {
  return (
    <div className="flex justify-between items-center">
      <span>{nome}</span>
      <span className={definido ? "text-slate-700 font-medium" : "text-slate-400 italic"}>
        {valor.toFixed(3)}
        {!definido && " · a definir"}
      </span>
    </div>
  );
}

function AvisoDismissivel({ id, children, className = "" }) {
  const [visivel, setVisivel] = useState(() => localStorage.getItem(`receivly_aviso_${id}`) !== "1");
  if (!visivel) return null;
  return (
    <div className={`relative ${className}`}>
      <button type="button" onClick={() => { localStorage.setItem(`receivly_aviso_${id}`, "1"); setVisivel(false); }}
        className="absolute top-2 right-2 h-7 w-7 rounded-lg hover:bg-black/5 flex items-center justify-center text-slate-500 cursor-pointer"
        aria-label="Fechar aviso">
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

function ModalEditarFatores({ comparavel, indice, imovel, onClose, onSalvar, salvando }) {
  const areaImovel = Number(imovel?.areaImovel) || comparavel.area || 1;
  const areaComparavel = comparavel.area || areaImovel;
  const diffPct = Math.abs((areaComparavel - areaImovel) / areaImovel) * 100;
  const fatorAreaDefault = Math.pow(areaComparavel / areaImovel, diffPct <= 30 ? 0.25 : 0.125);
  const [fatores, setFatores] = useState({
    fatorLocal: comparavel.fatorLocal ?? 1,
    fatorArea: comparavel.fatorArea ?? fatorAreaDefault,
    fatorDepreciacao: comparavel.fatorDepreciacao ?? 1,
    fatorPadrao: comparavel.fatorPadrao ?? 1,
    fatorTestada: comparavel.fatorTestada ?? 1,
  });
  const just = comparavel.justificativasFatores || {};

  function setF(campo, v) { setFatores((f) => ({ ...f, [campo]: Number(v) || 1 })); }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Editar fatores — Comparável {String(indice + 1).padStart(2, "0")}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{comparavel.endereco}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Valores entre 0,750 e 1,250. Revise todos os fatores antes de salvar.</p>
        <div className="space-y-3">
          {[
            { key: "fatorLocal", label: "Fator Local", hint: just.local },
            { key: "fatorArea", label: "Fator Área", hint: just.area || "Abunahman — calculado pela diferença de área entre comparável e imóvel." },
            { key: "fatorDepreciacao", label: "Fator Depreciação", hint: just.depreciacao },
            { key: "fatorPadrao", label: "Fator Padrão", hint: just.padrao },
            { key: "fatorTestada", label: "Fator Testada", hint: just.testada },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <Campo label={label}>
                <input type="number" step="0.001" min="0.75" max="1.25" value={fatores[key]}
                  onChange={(e) => setF(key, e.target.value)} className={campoInputClass} />
              </Campo>
              {hint && <p className="text-[10px] text-slate-400 mt-1 italic">{hint}</p>}
            </div>
          ))}
        </div>
        <button onClick={() => onSalvar(fatores)} disabled={salvando}
          className={`w-full mt-5 ${ui.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
          {salvando ? "Salvando..." : "Salvar fatores"}
        </button>
      </div>
    </div>
  );
}

function EtapaCalculos({ imovel, comparaveis, onVoltar, onProximo, calculandoFatores, erroFatores, fatoresCalculados, onEditarFatores, onRecalcularFatores, onContinuarComFatoresLocais }) {
  const [editando, setEditando] = useState(null);
  const [salvandoFatores, setSalvandoFatores] = useState(false);
  return (
    <div className="space-y-6">
      {calculandoFatores && (
        <div className="rounded-xl border border-blue-200 bg-brand-50 p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Calculando fatores...</p>
            <p className="text-xs text-brand-700 mt-0.5">Aplicando fórmulas de homogeneização (NBR 14.653).</p>
          </div>
        </div>
      )}

      {erroFatores && !fatoresCalculados && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-2">
          <p className="text-sm text-red-700">{erroFatores}</p>
          <button type="button" onClick={onContinuarComFatoresLocais}
            className="text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg px-3 py-1.5 cursor-pointer">
            Continuar com fatores calculados localmente (editáveis)
          </button>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-900">Tratamento por fatores</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Os fatores são calculados por fórmula (NBR 14.653). Em comparáveis manuais, depreciação e padrão
              podem ficar neutros — revise e ajuste cada fator antes de continuar.
            </p>
          </div>
        </div>
        {fatoresCalculados && (
          <button type="button" onClick={onRecalcularFatores} disabled={calculandoFatores}
            className="text-xs font-medium text-amber-800 hover:text-amber-950 border border-amber-200 bg-white rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-50 shrink-0">
            Recalcular fatores
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {comparaveis.map((c, i) => {
          const r = calcularAjustes(c, imovel, comparaveis);
          const areaImovel = areaImovelEfetiva(imovel, comparaveis);
          const diffAreaPct = areaImovel ? Math.abs((c.area - areaImovel) / areaImovel) * 100 : 0;
          return (
            <div key={c.id} className="ui-card p-4">
              <p className="text-xs font-semibold text-slate-400 mb-1">COMPARÁVEL {String(i + 1).padStart(2, "0")}</p>
              <p className="text-sm font-medium text-slate-800 truncate">{c.endereco}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><p className="text-slate-400">Valor</p><p className="font-medium text-slate-800">{formatBRL(c.valor)}</p></div>
                <div><p className="text-slate-400">Área</p><p className="font-medium text-slate-800">{c.area} m²</p></div>
                <div><p className="text-slate-400">Unitário base</p><p className="font-medium text-slate-800">{formatBRL(r.valorUnitarioBase)}/m²</p></div>
                <div><p className="text-slate-400">Fator total</p><p className="font-medium text-slate-800">{r.fatorTotal.toFixed(3)}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                <FatorLinha nome="Fator Local" valor={r.fatorLocal} definido={r.fatoresProcessados} />
                <FatorLinha nome="Fator Área" valor={r.fatorArea} definido={true} />
                <FatorLinha nome="Fator Depreciação" valor={r.fatorDepreciacao} definido={r.fatoresProcessados} />
                <FatorLinha nome="Fator Padrão" valor={r.fatorPadrao} definido={r.fatoresProcessados} />
                <FatorLinha nome="Fator Testada" valor={r.fatorTestada} definido={r.fatoresProcessados} />
              </div>
              <button onClick={() => setEditando(i)} className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
                Editar fatores
              </button>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-xs text-slate-400">Unitário homogeneizado</span>
                <span className="text-xs font-medium text-slate-700">{formatBRL(r.valorUnitarioHomogeneizado)}/m²</span>
              </div>
              <div className="mt-1.5 flex justify-between items-baseline gap-2">
                <span className="text-xs text-slate-400">Estimativa via comparável{areaImovel ? ` (${areaImovel} m²)` : ""}</span>
                <span className="text-sm font-semibold text-slate-900">{formatBRL(r.resultadoAjustado)}</span>
              </div>
              {diffAreaPct > 40 && (
                <p className="text-[10px] text-amber-700 mt-2 leading-relaxed">
                  Área do comparável ({c.area} m²) difere {diffAreaPct.toFixed(0)}% do imóvel avaliado — pode distorcer o unitário.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center flex-wrap gap-3">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} disabled={calculandoFatores || !fatoresCalculados} className={`flex items-center gap-2 ${ui.btnPrimary} px-5 disabled:opacity-50 disabled:cursor-not-allowed`}>
          Continuar para fotos <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {editando !== null && comparaveis[editando] && (
        <ModalEditarFatores
          comparavel={comparaveis[editando]}
          indice={editando}
          imovel={imovel}
          onClose={() => setEditando(null)}
          onSalvar={async (fatores) => {
            setSalvandoFatores(true);
            try {
              await onEditarFatores(comparaveis[editando].id, fatores);
              setEditando(null);
            } finally {
              setSalvandoFatores(false);
            }
          }}
          salvando={salvandoFatores}
        />
      )}
    </div>
  );
}

function comprimirImagem(file, maxLargura = 1600, qualidade = 0.72) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    img.onload = () => {
      const escala = Math.min(1, maxLargura / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * escala;
      canvas.height = img.height * escala;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve({ url: URL.createObjectURL(blob), tamanhoOtimizado: blob.size }), "image/jpeg", qualidade);
    };
    reader.readAsDataURL(file);
  });
}

function PainelIdentidadeLaudo({ branding, onEnviarLogo, onEnviarTemplate, onToggleLogo, onToggleOcultarCabecalho, onAlterarCorDestaque, enviandoBranding, compact }) {
  const inputLogoRef = useRef(null);
  const inputTemplateRef = useRef(null);
  const corAtual = corLaudoEfetiva(branding);
  const [corHexLocal, setCorHexLocal] = useState(corAtual);
  useEffect(() => { setCorHexLocal(corAtual); }, [corAtual]);
  return (
    <div className={`rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-5 print:hidden ${compact ? "" : ""}`}>
      <p className="text-sm font-semibold text-slate-900 mb-1">Identidade visual do laudo</p>
      <p className="text-xs text-slate-500 mb-4">
        Logo e template Word (.docx) valem para todos os laudos da imobiliária. São aplicados ao <strong>Gerar Word</strong> e <strong>Gerar PDF</strong> na etapa Relatório.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600">Logo no documento</p>
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo da imobiliária" className="h-16 object-contain bg-slate-50 rounded border border-slate-100 p-2" />
          ) : (
            <p className="text-[11px] text-slate-400">Nenhuma logo enviada (PNG/JPG recomendado)</p>
          )}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!!branding?.exibirLogoLaudo} onChange={(e) => onToggleLogo(e.target.checked)} className="rounded" disabled={!branding?.logoUrl || branding?.ocultarCabecalhoLaudo} />
              Exibir logo no laudo
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!!branding?.ocultarCabecalhoLaudo} onChange={(e) => onToggleOcultarCabecalho?.(e.target.checked)} className="rounded" />
              Ocultar cabeçalho (sem logo nem nome)
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button type="button" onClick={() => inputLogoRef.current?.click()} disabled={enviandoBranding}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer disabled:opacity-50">
              {enviandoBranding ? "Enviando..." : branding?.logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
          </div>
          <input ref={inputLogoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onEnviarLogo(e.target.files[0]); e.target.value = ""; }} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600">Template Word (.docx)</p>
          {branding?.templateLaudoNome ? (
            <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 rounded px-3 py-2 border border-slate-100">
              <FileText className="h-4 w-4 text-brand-600 shrink-0" />
              <span className="truncate">{branding.templateLaudoNome}</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Envie seu modelo Word (.docx). O laudo é gerado dentro do arquivo, mantendo cabeçalho e rodapé.
              Sem template, usamos o layout padrão do sistema.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => inputTemplateRef.current?.click()} disabled={enviandoBranding}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer disabled:opacity-50">
              {branding?.templateLaudoNome ? "Trocar template" : "Anexar template"}
            </button>
            {branding?.templateLaudoUrl && (
              <a href={branding.templateLaudoUrl} download={branding.templateLaudoNome} target="_blank" rel="noreferrer"
                className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <Download className="h-3.5 w-3.5" /> Baixar
              </a>
            )}
          </div>
          <input ref={inputTemplateRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onEnviarTemplate(e.target.files[0]); e.target.value = ""; }} />
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-600">Cor de destaque do laudo</p>
        <p className="text-[11px] text-slate-500">
          Usada no sumário, gráficos, pontos das amostras no mapa satélite e detalhes da prévia. No template Word avançado, use <code className="text-[10px] bg-slate-100 px-1 rounded">{"{{ cor_destaque_laudo }}"}</code>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {CORES_LAUDO_SUGERIDAS.map((cor) => (
            <button key={cor} type="button" title={cor} disabled={enviandoBranding}
              onClick={() => onAlterarCorDestaque?.(cor)}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 cursor-pointer disabled:opacity-50 ${corAtual === cor ? "border-slate-900 ring-2 ring-offset-1 ring-slate-400" : "border-white shadow-sm"}`}
              style={{ backgroundColor: cor }} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="color" value={corAtual} disabled={enviandoBranding}
            onChange={(e) => onAlterarCorDestaque?.(normalizarCorLaudo(e.target.value))}
            className="h-10 w-14 rounded border border-slate-200 bg-white cursor-pointer disabled:opacity-50" />
          <input type="text" value={corHexLocal} maxLength={7} disabled={enviandoBranding}
            onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCorHexLocal(v.toUpperCase()); }}
            onBlur={() => onAlterarCorDestaque?.(normalizarCorLaudo(corHexLocal))}
            className={`w-28 ${campoInputClass} font-mono text-xs uppercase disabled:opacity-50`} />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: corAtual }}>SUMÁRIO · gráficos</span>
        </div>
      </div>
    </div>
  );
}

function EtapaFotos({ fotos, setFotos, onVoltar, onProximo, onEnviarFoto, onRemoverFoto, onAtualizarFoto, enviando }) {
  const inputRef = useRef(null);

  async function adicionarArquivos(fileList) {
    const arquivos = Array.from(fileList);
    for (const file of arquivos) {
      await onEnviarFoto(file);
    }
  }

  function organizarAutomaticamente() {
    setFotos((fs) => [...fs].sort((a, b) => CATEGORIAS_FOTO.indexOf(a.categoria) - CATEGORIAS_FOTO.indexOf(b.categoria)));
  }

  function mover(id, direcao) {
    setFotos((fs) => {
      const idx = fs.findIndex((f) => f.id === id);
      const novoIdx = idx + direcao;
      if (novoIdx < 0 || novoIdx >= fs.length) return fs;
      const copia = [...fs];
      [copia[idx], copia[novoIdx]] = [copia[novoIdx], copia[idx]];
      return copia;
    });
  }

  function formatKB(bytes) { return bytes ? `${(bytes / 1024).toFixed(0)} KB` : "—"; }

  return (
    <div className="space-y-6">
      <div className="ui-card p-5">
        <p className="text-sm font-semibold text-slate-900 mb-4">Fotografias do imóvel</p>

        <div onDrop={(e) => { e.preventDefault(); adicionarArquivos(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-brand-50/40 transition-colors py-10 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 cursor-pointer">
          <ImagePlus className="h-7 w-7" />
          <p className="text-sm font-medium">Arraste suas fotografias aqui</p>
          <p className="text-xs">ou clique para selecionar</p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => adicionarArquivos(e.target.files)} />
        </div>

        {enviando && (
          <div className="mt-3 flex items-center gap-2 text-xs text-brand-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando foto...</div>
        )}

        {fotos.length > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <p className="text-xs text-slate-400">{fotos.length} foto(s) salvas no servidor</p>
            <button onClick={organizarAutomaticamente} className="flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 transition-colors cursor-pointer"><Layers className="h-3.5 w-3.5" /> Organizar automaticamente</button>
          </div>
        )}
      </div>

      {fotos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {fotos.map((foto, i) => (
            <div key={foto.id} className="ui-card overflow-hidden hover:shadow-sm transition-shadow">
              <div className="relative aspect-video bg-slate-100">
                <img src={urlFoto(foto)} alt={foto.nome} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => mover(foto.id, -1)} className="h-6 w-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => mover(foto.id, 1)} className="h-6 w-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button onClick={() => onRemoverFoto(foto.id)} className="h-6 w-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/50 text-white rounded px-1.5 py-0.5">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-800 truncate">{foto.nome}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <select value={foto.categoria} onChange={(e) => onAtualizarFoto(foto.id, { categoria: e.target.value })} className="text-[11px] border border-slate-200 rounded px-1.5 py-1 bg-white cursor-pointer">
                    {CATEGORIAS_FOTO.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <p className="text-[11px] text-slate-400">{formatKB(foto.tamanhoOriginal)}{foto.tamanhoOtimizado && <> → <span className="text-emerald-600 font-medium">{formatKB(foto.tamanhoOtimizado)}</span></>}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} className={`flex items-center gap-2 ${ui.btnPrimary} px-5`}>Continuar para resultado <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function EtapaResultado({ imovel, comparaveis, resultado, onVoltar, onProximo, concluindo }) {
  const calc = useMemo(() => calcularLaudo(imovel, comparaveis), [imovel, comparaveis]);
  const faixa = useMemo(() => faixaValorLaudo(calc), [calc]);
  const areaEfetiva = areaImovelEfetiva(imovel, comparaveis);
  const areaCadastrada = parseNumeroBR(imovel.areaImovel);
  const areaInformada = Number.isFinite(areaCadastrada) && areaCadastrada > 0;
  const valorEstimado = (resultado?.valor_estimado > 0 ? resultado.valor_estimado : null) ?? calc.valorCalculado;
  const min = faixa.minimo;
  const max = faixa.maximo;
  const valorM2 = (resultado?.valor_medio_m2 > 0 ? resultado.valor_medio_m2 : null) ?? calc.unitarioFinal;
  const posicaoFaixa = max > min ? ((valorEstimado - min) / (max - min)) * 100 : 50;
  const [mostrarTabela, setMostrarTabela] = useState(true);

  return (
    <div className="space-y-6">
      <div className="ui-card p-6">
        <p className="text-xs font-semibold text-slate-400 mb-1">IMÓVEL AVALIADO</p>
        <p className="text-lg font-semibold text-slate-900 mb-6">{imovel.tipo} — {imovel.bairro}</p>

        <div className="text-center py-6 border-y border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Valor estimado</p>
          <p className="text-4xl font-semibold text-slate-900">{formatBRL(valorEstimado)}</p>
          {faixa.confiavel ? (
            <p className="text-xs text-slate-400 mt-2">Faixa ({faixa.rotulo}): {formatBRL(min)} — {formatBRL(max)}</p>
          ) : (
            <p className="text-xs text-amber-700 mt-2">{faixa.rotulo}</p>
          )}
        </div>

        {faixa.confiavel && (
          <div className="mt-6">
            <div className="relative h-2 rounded-full bg-gradient-to-r from-gray-200 via-blue-200 to-gray-200">
              <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-brand-600 border-2 border-white shadow" style={{ left: `calc(${posicaoFaixa}% - 8px)` }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1.5"><span>{formatBRL(min)}</span><span>{formatBRL(max)}</span></div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="rounded-lg bg-slate-50 p-3 text-center"><p className="text-[11px] text-slate-400">Comparáveis</p><p className="text-lg font-semibold text-slate-900">{comparaveis.length}</p></div>
          <div className="rounded-lg bg-slate-50 p-3 text-center"><p className="text-[11px] text-slate-400">Área</p><p className="text-lg font-semibold text-slate-900">{areaEfetiva || "—"} m²</p></div>
          <div className="rounded-lg bg-slate-50 p-3 text-center"><p className="text-[11px] text-slate-400">Valor médio/m²</p><p className="text-lg font-semibold text-slate-900">{formatBRL(valorM2)}</p></div>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 text-center">
          Unitário final: {formatBRL(valorM2)}/m² × {areaEfetiva} m² = {formatBRL(valorEstimado)} (NBR 14.653 + saneamento ±30%).
        </p>
        {!areaInformada && areaEfetiva > 0 && (
          <p className="text-[11px] text-amber-700 mt-2 text-center">
            Área não informada no cadastro do imóvel — usamos {areaEfetiva} m² (mediana dos comparáveis). Volte à etapa Imóvel para informar a área correta.
          </p>
        )}
      </div>

      {comparaveis.length > 0 && (
        <div className="ui-card p-5">
          <button type="button" onClick={() => setMostrarTabela((v) => !v)}
            className="flex items-center justify-between w-full text-left cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-900">Memória de cálculo — Homogeneização</p>
              <p className="text-xs text-slate-500 mt-0.5">Tabela no formato do laudo de referência (seção K)</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${mostrarTabela ? "rotate-180" : ""}`} />
          </button>
          {mostrarTabela && (
            <div className="mt-4 print:block">
              <TabelaHomogeneizacaoK calc={calc} ehLocacao={false} titulo="" />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} disabled={concluindo} className={`flex items-center gap-2 ${ui.btnPrimary} px-5 disabled:opacity-60`}>
          {concluindo ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <>Ver relatório <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   LAUDO COMPLETO (Etapa 6): seções A a O, no modelo do laudo da avaliadora
--------------------------------------------------------------------------- */

// <<PURE-START>>
const T_STUDENT_80 = [null, 3.078, 1.886, 1.638, 1.533, 1.476, 1.440, 1.415, 1.397, 1.383, 1.372, 1.363, 1.356, 1.350, 1.345, 1.341, 1.337, 1.333, 1.330, 1.328, 1.325, 1.323, 1.321, 1.319, 1.318, 1.316, 1.315, 1.314, 1.313, 1.311, 1.310];

function tStudent80(gl) {
  if (gl < 1) return 0;
  return gl <= 30 ? T_STUDENT_80[gl] : 1.282;
}

function mediaSimples(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function desvioPadraoAmostral(arr) {
  if (arr.length < 2) return 0;
  const m = mediaSimples(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

// Homogeneização e saneamento seguindo as contas que aparecem no laudo da avaliadora:
// ajustes somados ao unitário base; saneamento por limites de +/-30% da média; desvio padrão
// amostral; t de Student (80%, bilateral, n-1 graus); intervalo = t * s / raiz(n-1).
function calcularLaudo(imovel, comparaveis) {
  const areaImovel = areaImovelEfetiva(imovel, comparaveis);
  const linhas = comparaveis.map((c, i) => {
    const r = calcularAjustes(c, imovel, comparaveis);
    return {
      n: i + 1,
      c,
      unitarioBruto: r.valorUnitarioBruto,
      fatorOferta: r.fatorOferta,
      base: r.valorUnitarioBase,
      fatores: { local: r.fatorLocal, area: r.fatorArea, depreciacao: r.fatorDepreciacao, padrao: r.fatorPadrao, testada: r.fatorTestada },
      ajustes: r.ajustes,
      fatorTotal: r.fatorTotal,
      homogeneizado: r.valorUnitarioHomogeneizado,
    };
  });

  const mediaSeca = mediaSimples(linhas.map((l) => l.base));
  const mediaHomog = mediaSimples(linhas.map((l) => l.homogeneizado));
  const limiteSup = mediaHomog * 1.3;
  const limiteInf = mediaHomog * 0.7;
  linhas.forEach((l) => {
    l.saneado = l.homogeneizado >= limiteInf && l.homogeneizado <= limiteSup;
    if (!l.saneado) {
      l.motivoExclusao = l.homogeneizado > limiteSup
        ? `Unitário acima do limite superior (+30% da média): ${limiteSup.toFixed(2)}/m²`
        : `Unitário abaixo do limite inferior (-30% da média): ${limiteInf.toFixed(2)}/m²`;
    }
  });

  const saneados = linhas.filter((l) => l.saneado).map((l) => l.homogeneizado);
  const n = saneados.length;
  const mediaSaneada = n > 0 ? mediaSimples(saneados) : mediaHomog;
  const desvio = desvioPadraoAmostral(saneados);
  const coefVariacao = mediaSaneada && n >= 2 ? desvio / mediaSaneada : null;
  const t = n >= 2 ? Number(tStudent80(n - 1).toFixed(2)) : 0;
  const meiaLargura = n > 1 ? (t * desvio) / Math.sqrt(n - 1) : 0;
  const maximo = mediaSaneada + meiaLargura;
  const minimo = mediaSaneada - meiaLargura;
  const intervalo = mediaSaneada && n >= 2 ? ((maximo - minimo) / mediaSaneada) * 100 : null;

  return {
    linhas,
    areaImovel,
    mediaSeca,
    mediaHomog,
    limiteSup,
    limiteInf,
    saneamento: {
      n,
      total: linhas.length,
      excluidos: linhas.length - n,
      mediaSaneada,
      desvio,
      coefVariacao,
      t,
      maximo,
      minimo,
      intervalo,
      intervaloConfiavel: n >= 2,
    },
    unitarioFinal: mediaSaneada,
    valorCalculado: mediaSaneada * areaImovel * 1.0,
  };
}

function faixaValorLaudo(calc) {
  const san = calc.saneamento;
  const area = calc.areaImovel || 0;
  const central = calc.valorCalculado;
  if (san.n >= 2 && san.intervalo != null && san.intervalo > 0) {
    return {
      minimo: san.minimo * area,
      maximo: san.maximo * area,
      tipo: "student",
      rotulo: `Intervalo de confiabilidade (${fmt2(san.intervalo)}%, t=${fmt2(san.t)})`,
      confiavel: true,
    };
  }
  return {
    minimo: central,
    maximo: central,
    tipo: san.n === 1 ? "unico_elemento" : "insuficiente",
    rotulo: san.n === 1
      ? "Sem faixa estatística — apenas 1 comparável após saneamento"
      : "Faixa estatística indisponível — amostra insuficiente",
    confiavel: false,
  };
}

function diagnosticoRobustezLaudo(calc) {
  const san = calc.saneamento;
  const excluidos = calc.linhas.filter((l) => !l.saneado);
  const alertas = [];

  if (calc.linhas.length < 5) {
    alertas.push({
      nivel: "aviso",
      titulo: "Amostra pequena",
      texto: `Foram utilizados ${calc.linhas.length} comparável(is). A NBR 14.653 recomenda pelo menos 5 elementos para grau II de fundamentação.`,
    });
  }
  if (san.excluidos > 0) {
    alertas.push({
      nivel: san.n <= 1 ? "critico" : "aviso",
      titulo: `${san.excluidos} comparável(is) excluído(s) no saneamento`,
      texto: excluidos.map((l) => `Comp. ${l.n}: ${fmt2(l.homogeneizado)}/m² — ${l.motivoExclusao}`).join(" · "),
    });
  }
  if (san.n === 1) {
    alertas.push({
      nivel: "critico",
      titulo: "Valor sustentado por apenas 1 comparável",
      texto: `A média homogeneizada era ${fmt2(calc.mediaHomog)}/m², mas após o saneamento ±30% restou só o comparável ${calc.linhas.find((l) => l.saneado)?.n}. O valor final (${fmt2(san.mediaSaneada)}/m²) não representa consenso de mercado — revise os comparáveis ou os fatores.`,
    });
  }
  if (san.n === 0) {
    alertas.push({
      nivel: "critico",
      titulo: "Nenhum comparável passou no saneamento",
      texto: "Todos os unitários homogeneizados ficaram fora da faixa ±30% da média. Foi usada a média homogeneizada sem saneamento; revise a amostra.",
    });
  }
  if (san.n >= 2 && san.coefVariacao != null && san.coefVariacao > 0.25) {
    alertas.push({
      nivel: "aviso",
      titulo: "Alta dispersão entre comparáveis",
      texto: `Coeficiente de variação ${(san.coefVariacao * 100).toFixed(1)}% — os comparáveis divergem bastante mesmo após homogeneização.`,
    });
  }
  if (san.n === 1 && san.coefVariacao === null) {
    alertas.push({
      nivel: "aviso",
      titulo: "CV = 0% não indica precisão",
      texto: "Com um único elemento saneado, desvio padrão e coeficiente de variação ficam zerados por definição — isso não significa alta confiabilidade.",
    });
  }

  return { alertas, excluidos, robusto: san.n >= 3 && san.intervaloConfiavel };
}

function numeroPorExtenso(n) {
  const un = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dz = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const ct = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  function ate999(x) {
    if (x === 100) return "cem";
    const c = Math.floor(x / 100);
    const r = x % 100;
    const partes = [];
    if (c) partes.push(ct[c]);
    if (r) {
      if (r < 20) partes.push(un[r]);
      else {
        const d = Math.floor(r / 10);
        const u = r % 10;
        partes.push(u ? dz[d] + " e " + un[u] : dz[d]);
      }
    }
    return partes.join(" e ");
  }
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1000000);
  const milhares = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  const grupos = [];
  if (milhoes) grupos.push(ate999(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
  if (milhares) grupos.push(milhares === 1 ? "mil" : ate999(milhares) + " mil");
  if (resto) grupos.push(ate999(resto));
  return grupos.join(" e ");
}

function valorPorExtenso(v) {
  const n = Math.round(v);
  if (n === 1) return "um real";
  const soMilhoes = n >= 1000000 && n % 1000000 === 0;
  return numeroPorExtenso(n) + (soMilhoes ? " de reais" : " reais");
}

function paginasPorExtenso(valor) {
  const n = parseInt(String(valor || "").replace(/\D/g, ""), 10);
  if (!n || n < 1) return "[número por extenso]";
  return numeroPorExtenso(n);
}

function curriculoFromPerfil(p) {
  const url = p?.curriculo_arquivo_url ? `${API_BASE}${p.curriculo_arquivo_url}` : null;
  return {
    formacao: p?.curriculo_formacao || "",
    experiencia: p?.curriculo_experiencia || "",
    arquivoUrl: url,
    arquivoNome: p?.curriculo_arquivo_nome || "",
    ehPdf: !!url,
  };
}

function curriculoTemConteudo(c) {
  if (!c) return false;
  if (c.arquivoUrl) return true;
  return !!(c.formacao?.trim() || c.experiencia?.trim());
}

function quesitosFromApi(dados) {
  const url = dados?.quesitos_arquivo_url ? `${API_BASE}${dados.quesitos_arquivo_url}` : null;
  return {
    incluir: !!dados?.incluir_anexo_quesitos,
    texto: dados?.respostas_quesitos || "",
    arquivoUrl: url,
    arquivoNome: dados?.quesitos_arquivo_nome || "",
    ehPdf: !!url,
  };
}

function quesitosTemConteudo(q) {
  if (!q) return false;
  if (q.arquivoUrl) return true;
  return !!(q.texto?.trim());
}

function linhasCurriculo(texto) {
  return (texto || "").split("\n").map((l) => l.trim()).filter(Boolean);
}

function estimarPaginasLaudo(laudo, fotos, documentos, curriculo) {
  let n = 14;
  if (laudo.documentoJudicial) n += 1;
  if ((fotos?.length || 0) > 6) n += Math.ceil((fotos.length - 6) / 6);
  if ((documentos?.length || 0) > 0) n += 1 + documentos.length;
  if (laudo.incluirAnexoCurriculo !== false && curriculoTemConteudo(curriculo)) n += 2;
  return n;
}

function aplicarVariaveis(texto, vars) {
  return (texto || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
}

const ESTADOS_NOME = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

function nomeEstado(uf) {
  const chave = (uf || "").trim().toUpperCase();
  return ESTADOS_NOME[chave] || uf || "[estado]";
}

function textoLaudoEfetivo(textos, chave) {
  const salvo = (textos?.[chave] || "").trim();
  if (salvo) return textos[chave];
  const padrao = DEFAULT_TEXTOS[chave];
  return (padrao || "").trim() ? padrao : "";
}

function textosLaudoEfetivos(laudo) {
  const textos = laudo?.textos || {};
  const chaves = new Set([...Object.keys(DEFAULT_TEXTOS), ...Object.keys(textos)]);
  return Object.fromEntries([...chaves].map((chave) => {
    if (chave === "metodologia") return [chave, textoMetodologia(laudo)];
    return [chave, textoLaudoEfetivo(textos, chave)];
  }));
}

function qualificacaoLaudoDefault(creci, cnai, qualificacaoCustom) {
  if (qualificacaoCustom?.trim()) return qualificacaoCustom.trim();
  const partes = [creci, cnai].filter(Boolean);
  if (partes.length === 0) return "[informe CRECI e CNAI em Configurações]";
  return `${partes.join(", ")}, conforme Resolução COFECI n.º 1066/2007 e Ato Normativo COFECI n.º 001/2011 para emitir Parecer Técnico de Avaliação Mercadológica.`;
}

function pontoFundamentacaoNum(p, item) {
  const n = Number(p[item]);
  return Number.isFinite(n) ? n : 0;
}

function formatPontoFundamentacao(v) {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : parseNumeroBR(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function grauFundamentacao(p) {
  const p1 = pontoFundamentacaoNum(p, 1);
  const p2 = pontoFundamentacaoNum(p, 2);
  const p3 = pontoFundamentacaoNum(p, 3);
  const p4 = pontoFundamentacaoNum(p, 4);
  const total = p1 + p2 + p3 + p4;
  if (total >= 10 && p2 >= 3 && p4 >= 3 && p1 >= 2 && p3 >= 2) return { total, grau: "III" };
  if (total >= 6 && p2 >= 2 && p4 >= 2 && p1 >= 1 && p3 >= 1) return { total, grau: "II" };
  if (total >= 4 && p1 >= 1 && p2 >= 1 && p3 >= 1 && p4 >= 1) return { total, grau: "I" };
  return { total, grau: "—" };
}

function grauPrecisao(intervalo) {
  if (intervalo <= 30) return "III";
  if (intervalo <= 40) return "II";
  if (intervalo <= 50) return "I";
  return "—";
}

function fmt2(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt3(v) {
  return (v || 0).toFixed(3).replace(".", ",");
}
function brl2(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FATORES_HOMOG_KEYS = ["local", "area", "depreciacao", "padrao", "testada"];
const FATORES_HOMOG_LABELS = ["Local", "Área", "Depreciação", "Padrão", "Testada"];

function AlertaRobustezLaudo({ calc, compact = false }) {
  const { alertas } = diagnosticoRobustezLaudo(calc);
  if (alertas.length === 0) return null;

  return (
    <div className={`space-y-2 ${compact ? "" : "mb-4"}`}>
      {alertas.map((a, i) => (
        <div key={i} className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
          a.nivel === "critico"
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          <p className="font-semibold">{a.titulo}</p>
          <p className="mt-0.5 opacity-90">{a.texto}</p>
        </div>
      ))}
    </div>
  );
}

function TabelaHomogeneizacaoK({ calc, ehLocacao = false, titulo = "K. HOMOGENEIZAÇÃO", mostrarAlertas = false }) {
  const san = calc.saneamento;
  const sufixoUnid = ehLocacao ? " mês" : "";

  return (
    <div className="space-y-5">
      {titulo && <Secao>{titulo}</Secao>}
      {mostrarAlertas && <AlertaRobustezLaudo calc={calc} />}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border border-gray-300 border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1">N.º</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1">Unitário (R$/m²{sufixoUnid})</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1">Fator oferta</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1">Unitário base</th>
              <th colSpan={5} className="border border-gray-300 px-1 py-1">Fator de ajuste</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1">Unitário homogeneizado</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1">Unitário saneado</th>
            </tr>
            <tr>
              {FATORES_HOMOG_LABELS.map((t) => (<th key={t} className="border border-gray-300 px-1 py-1">{t}</th>))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 italic text-slate-500">
              <td className="border border-slate-200 px-1 py-0.5 font-medium not-italic">Aval.</td>
              <td className="border border-slate-200 px-1 py-0.5" colSpan={3}></td>
              {FATORES_HOMOG_KEYS.map((k) => (<td key={k} className="border border-slate-200 px-1 py-0.5 text-right">{fmt3(1)}</td>))}
              <td className="border border-slate-200 px-1 py-0.5" colSpan={2}></td>
            </tr>
            {calc.linhas.map((l) => (
              <React.Fragment key={l.n}>
                <tr className="italic text-slate-400">
                  <td className="border border-slate-200 px-1 py-0.5"></td>
                  <td className="border border-slate-200 px-1 py-0.5" colSpan={3}></td>
                  {FATORES_HOMOG_KEYS.map((k) => (<td key={k} className="border border-slate-200 px-1 py-0.5 text-right">{fmt3(l.fatores[k])}</td>))}
                  <td className="border border-slate-200 px-1 py-0.5" colSpan={2}></td>
                </tr>
                <tr className={l.saneado ? "" : "bg-red-50/80"}>
                  <td className="border border-slate-200 px-1 py-1 text-center">{l.n}</td>
                  <td className="border border-slate-200 px-1 py-1 text-right">{fmt2(l.unitarioBruto)}</td>
                  <td className="border border-slate-200 px-1 py-1 text-right">{fmt2(l.fatorOferta)}</td>
                  <td className="border border-slate-200 px-1 py-1 text-right">{fmt2(l.base)}</td>
                  {FATORES_HOMOG_KEYS.map((k) => (<td key={k} className="border border-slate-200 px-1 py-1 text-right">{fmt2(l.ajustes[k])}</td>))}
                  <td className="border border-slate-200 px-1 py-1 text-right font-medium">{fmt2(l.homogeneizado)}</td>
                  <td className={`border border-slate-200 px-1 py-1 text-right font-medium ${l.saneado ? "" : "text-red-700"}`}>
                    {l.saneado ? fmt2(l.homogeneizado) : "excluído"}
                  </td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="border border-gray-300 px-1 py-1">Média seca</td>
              <td className="border border-gray-300 px-1 py-1 text-right">{fmt2(calc.mediaSeca)}</td>
              <td className="border border-gray-300 px-1 py-1" colSpan={2}></td>
              <td className="border border-gray-300 px-1 py-1 text-right italic font-normal text-slate-500" colSpan={5}>Médias</td>
              <td className="border border-gray-300 px-1 py-1 text-right">{fmt2(calc.mediaHomog)}</td>
              <td className="border border-gray-300 px-1 py-1 text-right">{fmt2(san.mediaSaneada)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
        <QuadroDados titulo="HOMOGENEIZAÇÃO" linhas={[
          ["Número de elementos", String(calc.linhas.length)],
          [`Unitário médio homogeneizado (R$/m²${sufixoUnid})`, fmt2(calc.mediaHomog)],
          [`Limite superior (R$/m²${sufixoUnid}) (+30%)`, fmt2(calc.limiteSup)],
          [`Limite inferior (R$/m²${sufixoUnid}) (-30%)`, fmt2(calc.limiteInf)],
        ]} />
        <QuadroDados titulo="SANEAMENTO" linhas={[
          ["Número de elementos saneados", String(san.n)],
          [`Unitário médio saneado (R$/m²${sufixoUnid})`, fmt2(san.mediaSaneada)],
          ["Desvio padrão", fmt2(san.desvio)],
          ["Coeficiente de variação", san.coefVariacao != null ? san.coefVariacao.toFixed(4).replace(".", ",") : "N/A (n < 2)"],
          ["t de Student", san.n >= 2 ? fmt2(san.t) : "N/A"],
          [`Máximo (R$/m²${sufixoUnid})`, san.n >= 2 ? fmt2(san.maximo) : "N/A"],
          [`Mínimo (R$/m²${sufixoUnid})`, san.n >= 2 ? fmt2(san.minimo) : "N/A"],
          ["Intervalo de confiabilidade", san.intervalo != null ? fmt2(san.intervalo) + "%" : "N/A"],
        ]} />
      </div>
    </div>
  );
}
// <<PURE-END>>

function tituloLaudoCapa(laudo) {
  const natureza = laudo.naturezaImovel === "rural" ? "RURAL" : "URBANO";
  if (laudo.finalidade === "locacao") {
    return `LAUDO TÉCNICO DE AVALIAÇÃO\nDE LOCAÇÃO DE IMÓVEL ${natureza}`;
  }
  return `LAUDO TÉCNICO DE AVALIAÇÃO\nMERCADOLÓGICA DE IMÓVEL ${natureza}`;
}

const METODOLOGIA_TITULOS = {
  comparativo: "Método Comparativo Direto de Dados",
  evolutivo: "Método Evolutivo",
};

const METODOLOGIA_PADRAO = {
  comparativo: `Para determinação do {{valorTipo}}, utilizou-se o Método Comparativo Direto de Dados. Tal método estabelece de forma direta um sistema de comparação com imóveis similares, através da coleta de dados em pesquisa junto a imobiliárias, profissionais especializados, proprietários, anúncios classificados, órgãos públicos e outros veículos que possam fornecer informações básicas e concretas dos imóveis ofertados ou vendidos recentemente.

A similaridade dos imóveis pesquisados é de fundamental importância para que tenhamos elementos que possam ser comparados de forma direta.

O processo comparativo, muito embora a pesquisa abranja imóveis similares em tamanho, padrão e local, requer uma melhoria no seu grau de precisão, obtida por outro processo auxiliar, denominado Homogeneização de Valores. Tal processo, recomendado por normas técnicas, visa corrigir as discrepâncias dos elementos comparativos, através de fatores cuja aplicação de um ou outro depende de cada caso. Assim, os fatores fundamentais, como: localização, atualização, fonte, padrão construtivo, idade e conservação, etc., são levados em conta para que os elementos sejam mais comparáveis, não obstante a similaridade já pré-selecionada na pesquisa.

O método comparativo, dado as características do imóvel em questão e pela viabilidade de sua aplicação ao caso, é o que mais se ajusta para a determinação do {{valorTipo}}.

Para melhorar ainda mais a precisão, após o processo de homogeneização, a média obtida passa por processo de saneamento de valores que eventualmente situam-se muito distantes do seu valor médio, distorcendo o valor unitário. Em geral, utiliza-se um intervalo de confiança, eliminando-se os valores fora deste intervalo e recalculando-se a nova média (média saneada). Assim, o valor unitário obtido pode ser considerado como o real {{valorTipo}}.

Justificativa da metodologia: dentro da região de influência na qual se insere o imóvel foi possível identificar uma amostragem em tamanho suficiente para se obter um valor médio confiável. Tal fato nos levou à aplicação do método comparativo, com maior precisão para o caso em questão.`,

  evolutivo: `Para determinação do {{valorTipo}}, utilizou-se o Método Evolutivo, conforme preconiza a NBR 14.653 e as práticas consolidadas pelo IBAPE.

O método evolutivo determina o valor do imóvel pela soma do custo de reprodução ou reposição da edificação, depreciada por idade, estado de conservação e obsolescências, acrescido do valor do terreno, quando for o caso. A depreciação física foi considerada mediante o método Ross-Heidecke, tendo em vista a idade aparente e o estado de conservação verificados em vistoria.

O custo unitário básico de construção foi obtido por meio de tabelas e boletins técnicos de referência (como CUB/SINAPI ou equivalente regional), aplicados ao padrão construtivo e às características do imóvel avaliando.

Justificativa da metodologia: diante das peculiaridades do imóvel avaliando e da necessidade de refletir a formação de custo do bem edificado, optou-se pelo método evolutivo, por ser o mais adequado à determinação do {{valorTipo}} no presente caso.`,
};

function metodoAvaliacaoAtual(laudo) {
  return laudo?.metodoAvaliacao === "evolutivo" ? "evolutivo" : "comparativo";
}

function textoMetodologia(laudo) {
  const salvo = (laudo?.textos?.metodologia || "").trim();
  if (salvo) return laudo.textos.metodologia;
  return METODOLOGIA_PADRAO[metodoAvaliacaoAtual(laudo)] || METODOLOGIA_PADRAO.comparativo;
}

const DEFAULT_TEXTOS = {
  introducao: `O presente {{tituloLaudo}} tem por finalidade atender à solicitação de {{solicitante}}, com o objetivo de {{objetivo}} do {{imovel}}.

O laudo é assinado por {{avaliador}}, {{qualificacao}}.

Entende-se por “PTAM - Parecer Técnico de Avaliação Mercadológica” o documento no qual é apresentada, com base em critérios técnicos, uma análise de mercado com vistas à determinação do valor de comercialização de um imóvel, judicial ou extrajudicialmente, observando-se o disposto na Resolução COFECI n.º 1.066/07, que está em consonância com a NBR 14.653 e recomendações de associações de classe como o IBAPE - Instituto Brasileiro de Avaliações e Perícias de Engenharia.`,

  premissas: `As análises, opiniões e conclusões apresentadas neste trabalho fundamentam-se nos dados disponíveis, nas diligências realizadas, nas vistorias efetuadas e nos levantamentos e pesquisas pertinentes ao imóvel avaliando, à sua região e ao mercado imobiliário local, observadas as condições verificadas na data de referência da avaliação.

Para a elaboração deste laudo, foram consideradas autênticas e corretas as informações constantes da certidão de matrícula, dos títulos e demais documentos disponibilizados, bem como as informações obtidas por meio de pesquisas e consultas realizadas. Não foram conduzidas investigações específicas destinadas à identificação de eventuais vícios, irregularidades documentais ou questões de natureza jurídica, ressalvadas aquelas expressamente indicadas neste trabalho. A responsabilidade do profissional limita-se ao âmbito técnico de sua atuação, nos termos da legislação e das normas profissionais aplicáveis.

A determinação do {{valorTipo}} do imóvel foi realizada com base nos critérios técnicos e metodológicos adotados neste laudo, sem vinculação aos honorários profissionais estabelecidos para sua elaboração.

O profissional responsável declara não possuir, na presente data, interesse pessoal ou econômico no imóvel avaliando que possa comprometer sua independência e imparcialidade, tampouco ter conhecimento de circunstâncias que caracterizem conflito de interesses em relação ao objeto da avaliação.

As informações e os resultados apresentados neste laudo destinam-se à finalidade para a qual o trabalho foi contratado. Sua divulgação, reprodução ou utilização para finalidade diversa deverá observar as condições acordadas com o solicitante, a legislação aplicável e os deveres de confidencialidade pertinentes.`,

  resultados: `Esta análise visa condensar de forma objetiva o trabalho executado enfocando o imóvel avaliando, na realidade do mercado imobiliário macrorregional em que o mesmo se encontra.

O {{valorTipo}} de um bem pressupõe uma situação em que as partes interessadas, conhecedoras das possibilidades de seu uso, encontrem-se na situação em que tanto o {{parteA}} quanto o {{parteB}} estejam interessados, porém não compelidos a concretizar {{negocio}}.`,

  documentacao: "",
  vistoria: "",
  adequacao: "",
  localizacao: `O imóvel avaliando ({{tipoImovel}}) está localizado na {{endereco}}, n.º {{numero}}{{complementoSuffix}}, no bairro de {{bairro}}, no município de {{cidade}}, no Estado de {{estadoNome}}.`,
  mercadoAtual: "",
  perspectivas: "",

  valoresResultantes: `Os valores resultantes encontram-se dentro da média pesquisada, quando considerados todos os fatores que influenciam na sua formação.`,

  metodologia: METODOLOGIA_PADRAO.comparativo,

  homogeneizacao: `Concluída a pesquisa de ofertas de imóveis semelhantes faz-se necessária a aplicação do processo denominado homogeneização de valores. Tal processo consiste basicamente na aplicação de diversos fatores objetivando tornar as pesquisas mais comparáveis ao imóvel avaliando, pois por mais semelhantes que sejam sempre apresentam algumas diferenças com relação ao imóvel que na maioria das vezes é adotado como paradigma de comparação.

Os diversos fatores de homogeneização compreendem índices cujos valores são baseados em estudos consagrados e advêm de normas avaliatórias, cabendo ao avaliador sua correta aplicação e confiando ao seu bom senso a utilização dos fatores que realmente participam da formação do preço do imóvel.

Desta forma, os formadores de preços escolhidos para o caso em questão serão destacados e utilizados para correção das diferenças dos elementos pesquisados comparados ao imóvel considerado como situação paradigma e após aplicado também no imóvel objeto de avaliação.

Após análise do caso, considerou-se fatores de homogeneização que serão utilizados nos cálculos que resultarão no {{valorTipo}} do imóvel.`,

  tratamento: `Na técnica de Tratamento por Fatores, o valor unitário é obtido pela comparação de elementos semelhantes ao imóvel avaliando, tratados através de fatores de ajustes valorizantes ou desvalorizantes em relação à situação paradigma pré-estabelecida pelos dados do próprio avaliando.

Para o cálculo do valor unitário médio da situação paradigma, aplicou-se um fator igual a 1,00 nos valores ofertados dos elementos comparativos (fator oferta), devido a todos estarem negociados, conforme pesquisado no mercado e norma para Avaliação de Imóveis Urbanos IBAPE/SP – 2011. Após esse cálculo foram estudadas as seguintes variáveis:

Fator Local: corresponde a diferenças de valores entre imóveis situados em locais distintos, ou seja, corrige as variações decorrentes da localização mais ou menos valiosa da amostra em relação ao imóvel avaliando (ou situação paradigma). O fator deve ser limitado apenas à parcela de influência que a localização contribui na composição do valor final do imóvel.

Fator Área: os elementos comparativos foram corrigidos em função de sua área, observando-se que existe uma diferença de valores unitários de acordo com a área, sendo os de maior área com unitários menores. Fórmula constante do “Curso Básico de Engenharia Legal e de Avaliações” (Sérgio Antonio Abunahman): (Área comparativo / Área avaliando) elevado a 1/4, quando a diferença entre as áreas do comparativo e do avaliando for menor que 30%; elevado a 1/8, quando maior que 30%.

Fator Depreciação: para a determinação das depreciações, aplica-se o “Método Ross-Heidecke”, cujo valor atual da benfeitoria é obtido através da aplicação do percentual redutor relativo à depreciação física acumulada (idade e conservação do imóvel).

Fator Padrão: os diferentes padrões construtivos e projetos dos elementos coletados e imóvel avaliando sofrem ajustes para melhor comparação, segundo índices relacionados com os custos unitários de edificações tabelados por boletins periódicos. A obsolescência de determinados imóveis é considerada neste fator, assim como a qualidade do projeto e a incidência de equipamentos.

Fator Testada: permite homogeneizar os valores unitários em relação às testadas dos imóveis pesquisados com a testada do lote padrão estabelecido, através da relação entre a projetada (Fp) e a de referência (Fr = 10,00 m): se Fp < 2 x Fr, F.Test. = (Fp/Fr) elevado a 0,25; se Fp > 2 x Fr, F.Test. = 1,19.`,

  especificacao: `Segundo a NBR 14.653 – Parte 2, a especificação de uma avaliação está relacionada tanto com o empenho do avaliador, como com o mercado e as informações que possam ser dele extraídas. O estabelecimento inicial pelo contratante do grau de fundamentação desejado tem por objetivo a determinação do empenho no trabalho avaliatório, mas não representa garantia de alcance de graus elevados de fundamentação. Quanto ao grau de precisão, este depende exclusivamente das características do mercado e das amostras coletadas e, por isso, não é passível de fixação a priori.

A seguir apresentamos as tabelas que, segundo a NBR 14.653 – Parte 2, definem os graus de fundamentação e precisão deste laudo de avaliação:`,

  encerramento: `O presente laudo técnico de avaliação é composto de {{numPaginas}} ({{numPaginasExtenso}}) páginas, todas de um só lado, e assinado pelo profissional que subscreve esta última.`,
};

const JUDICIAL_INICIAL = {
  destinatario: "",
  autor: "",
  reu: "",
  assunto: "",
  rg: "",
  cpf: "",
  creciInscricaoData: "",
  creciRegiao: "4.ª Região / MG",
};

const LAUDO_INICIAL = {
  solicitante: "Proprietário do imóvel",
  processo: "",
  documentoJudicial: false,
  judicial: { ...JUDICIAL_INICIAL },
  naturezaImovel: "urbano",
  finalidade: "venda",
  local: "Belo Horizonte",
  data: new Date().toISOString().slice(0, 10),
  nomeProfissional: "",
  tituloProfissional: "",
  qualificacaoLaudo: "",
  creci: "",
  cnai: "",
  valorAdotado: "",
  numPaginas: "",
  incluirAnexoCurriculo: true,
  metodoAvaliacao: "comparativo",
  pontos: {},
  textos: DEFAULT_TEXTOS,
};

function textoApresentacaoJudicial(laudo) {
  const j = laudo.judicial || JUDICIAL_INICIAL;
  const nome = laudo.nomeProfissional || "[nome do profissional]";
  const creci = laudo.creci || "[CRECI]";
  const cnai = laudo.cnai || "[CNAI]";
  return `${nome}, portador(a) do RG n.º ${j.rg || "[RG]"} e CPF n.º ${j.cpf || "[CPF]"}, corretor(a) de imóveis devidamente registrado(a) no ${creci}, inscrito(a) em ${j.creciInscricaoData || "[data]"} no CRECI da ${j.creciRegiao || "4.ª Região / MG"}, registrado(a) perante o Cadastro Nacional de Avaliadores Imobiliários (CNAI) sob o n.º ${cnai}, avaliador(a) habilitado(a) conforme a Resolução COFECI nº 1066/2007 e o Ato Normativo COFECI nº 001/2011 para emitir Parecer Técnico de Avaliação Mercadológica de bens móveis e de bens imóveis e suas parcelas, ativo(a) com perícias judiciais na especialidade mercado, perito(a) nomeado(a) por V. Exa., apresenta, conclusivamente, depois das diligências e vistorias realizadas, o resultado da Avaliação Mercadológica do imóvel supramencionado.`;
}

function laudoInicialFromPerfil(perfil) {
  if (!perfil) return { ...LAUDO_INICIAL, textos: { ...DEFAULT_TEXTOS } };
  const creci = perfil.creci || "";
  const cnai = perfil.cnai || "";
  return {
    ...LAUDO_INICIAL,
    textos: { ...DEFAULT_TEXTOS },
    nomeProfissional: perfil.nome || "",
    tituloProfissional: perfil.titulo_profissional || "",
    qualificacaoLaudo: qualificacaoLaudoDefault(creci, cnai, perfil.qualificacao_laudo),
    creci,
    cnai,
    local: perfil.local_laudo || LAUDO_INICIAL.local,
  };
}

function Paragrafos({ texto, vars }) {
  const blocos = aplicarVariaveis(texto, vars).split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <>
      {blocos.map((p, i) => {
        const m = p.match(/^(Fator [^:]{1,30}):\s*([\s\S]*)$/);
        return (
          <p key={i} className="text-[13px] leading-relaxed text-slate-700 text-justify mb-3">
            {m ? <><strong className="text-slate-900">{m[1]}:</strong> {m[2]}</> : p}
          </p>
        );
      })}
    </>
  );
}

function PaginaJudicialLaudo({ laudo, branding, dataLonga }) {
  const j = laudo.judicial || JUDICIAL_INICIAL;
  return (
    <LaudoPagina laudo={laudo} branding={branding}>
      <p className="text-[13px] font-bold text-center leading-snug uppercase mb-8">
        {j.destinatario || "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ª VARA ___ DA COMARCA DE ___ - ESTADO DE ___."}
      </p>
      <div className="text-[13px] text-slate-800 space-y-1 mb-8 max-w-lg">
        <p className="font-bold">REFERÊNCIA:</p>
        <p><strong>Processo:</strong> n.º {laudo.processo || "[número do processo]"}</p>
        <p><strong>Autor:</strong> {j.autor || "[autor]"}</p>
        <p><strong>Réu:</strong> {j.reu || "[réu]"}</p>
        <p><strong>Assunto:</strong> {j.assunto || "[assunto]"}</p>
      </div>
      <p className="text-[13px] text-slate-800 leading-relaxed text-justify mb-10">
        {textoApresentacaoJudicial(laudo)}
      </p>
      <p className="text-[13px] text-slate-800 text-center">
        {laudo.local || "[cidade]"}, {dataLonga}.
      </p>
    </LaudoPagina>
  );
}

function LaudoPagina({ laudo, branding, children }) {
  const ocultarCabecalho = branding?.ocultarCabecalhoLaudo;
  const mostrarLogo = !ocultarCabecalho && branding?.exibirLogoLaudo && branding?.logoUrl;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto px-10 py-8 print:border-0 print:shadow-none print:rounded-none print:break-after-page">
      {!ocultarCabecalho && (
        <div className="pb-4 mb-5 border-b border-slate-200">
          {mostrarLogo ? (
            <img src={branding.logoUrl} alt="Logo da imobiliária" className="h-16 max-w-[220px] object-contain object-left" />
          ) : (
            <div>
              <p className="text-sm font-bold tracking-wide text-slate-900 uppercase">{laudo.nomeProfissional || "Nome do profissional"}</p>
              {laudo.tituloProfissional && (
                <p className="text-[10px] text-slate-500 mt-0.5">{laudo.tituloProfissional}</p>
              )}
              <p className="text-[10px] tracking-widest text-slate-400 mt-1">AVALIAÇÃO IMOBILIÁRIA</p>
            </div>
          )}
        </div>
      )}
      {children}
      <div className="mt-8 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
        <span>{laudo.creci} · {laudo.cnai}</span>
        <span>Gerado com Receivly</span>
      </div>
    </div>
  );
}

function Secao({ children }) {
  return <h3 className="text-sm font-bold text-slate-900 mt-6 mb-3 first:mt-0">{children}</h3>;
}
function SubSecao({ children }) {
  return <h4 className="text-[13px] font-bold text-slate-900 mt-4 mb-2">{children}</h4>;
}

function QuadroDados({ titulo, linhas }) {
  return (
    <div className="border border-gray-400 text-[11px] break-inside-avoid">
      <div className="bg-slate-200 text-center font-bold py-1 border-b border-gray-400">{titulo}</div>
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex border-b border-slate-200 last:border-0">
          <div className="w-1/2 text-right px-2 py-1 border-r border-gray-300">{rotulo}</div>
          <div className="w-1/2 text-center px-2 py-1">{valor}</div>
        </div>
      ))}
    </div>
  );
}

function FichaLinha({ rotulo, valor }) {
  return (
    <div className="flex border-b border-slate-200 last:border-0">
      <div className="w-40 shrink-0 px-2 py-1 text-slate-500 border-r border-slate-200">{rotulo}</div>
      <div className="px-2 py-1 text-slate-800">{valor}</div>
    </div>
  );
}

function GraficoUnitarios({ linhas, media, minimo, maximo, corDestaque = COR_LAUDO_PADRAO }) {
  const corBarra = corLaudoEfetiva({ corDestaqueLaudo: corDestaque });
  const W = 560;
  const H = 220;
  const pad = { l: 46, r: 12, t: 14, b: 28 };
  const valores = linhas.map((l) => l.homogeneizado);
  const topo = (Math.max(...valores, maximo || 0, 1)) * 1.12;
  const bw = (W - pad.l - pad.r) / Math.max(linhas.length, 1);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / topo);
  const ticks = [0, topo / 2, topo];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-gray-300 rounded bg-white">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(t)} x2={W - pad.r} y2={y(t)} stroke="#e5e7eb" />
          <text x={pad.l - 6} y={y(t) + 3} fontSize="9" textAnchor="end" fill="#6b7280">{Math.round(t)}</text>
        </g>
      ))}
      {linhas.map((l, i) => (
        <g key={l.n}>
          <rect x={pad.l + i * bw + bw * 0.2} y={y(l.homogeneizado)} width={bw * 0.6} height={H - pad.b - y(l.homogeneizado)} fill={l.saneado ? corBarra : "#d1d5db"} />
          <text x={pad.l + i * bw + bw / 2} y={H - pad.b + 14} fontSize="10" textAnchor="middle" fill="#374151">{l.n}</text>
        </g>
      ))}
      <line x1={pad.l} y1={y(media)} x2={W - pad.r} y2={y(media)} stroke="#2563eb" strokeWidth="1.5" />
      <line x1={pad.l} y1={y(maximo)} x2={W - pad.r} y2={y(maximo)} stroke="#94a3b8" strokeDasharray="4 3" />
      <line x1={pad.l} y1={y(minimo)} x2={W - pad.r} y2={y(minimo)} stroke="#94a3b8" strokeDasharray="4 3" />
      <text x={W - pad.r} y={y(media) - 4} fontSize="9" textAnchor="end" fill="#2563eb">média saneada</text>
    </svg>
  );
}

function PaginaCurriculoTexto({ curriculo }) {
  const formacao = linhasCurriculo(curriculo.formacao);
  const experiencia = linhasCurriculo(curriculo.experiencia);
  return (
    <div className="text-[12px] text-slate-800 leading-relaxed">
      {formacao.length > 0 && (
        <div className="mb-6">
          <p className="text-[13px] font-bold text-slate-900 mb-2">• Formação Profissional</p>
          <ul className="space-y-1.5">
            {formacao.map((item, i) => (
              <li key={i}>{item.endsWith(";") ? item : `${item};`}</li>
            ))}
          </ul>
        </div>
      )}
      {experiencia.length > 0 && (
        <div>
          <p className="text-[13px] font-bold text-slate-900 mb-2">• Experiência Profissional</p>
          <ul className="space-y-1.5">
            {experiencia.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EtapaRelatorio({ imovel, comparaveis, fotos, documentos, onEnviarDocumento, onRemoverDocumento, enviandoDocumento, quesitos, onToggleIncluirQuesitos, onSalvarTextoQuesitos, onEnviarQuesitosPdf, onRemoverQuesitosPdf, enviandoQuesitosPdf, laudo, setLaudo, setImovel, token, avaliacaoId, onVoltar, branding, onGerarWord, onGerarPdf, gerandoWord, gerandoPdf }) {
  const [editando, setEditando] = useState(false);
  const [gerandoPerspectivas, setGerandoPerspectivas] = useState(false);
  const [erroPerspectivas, setErroPerspectivas] = useState(null);
  const [curriculo, setCurriculo] = useState(null);
  const [textoQuesitosLocal, setTextoQuesitosLocal] = useState("");
  const [pontoEditando, setPontoEditando] = useState(null);
  const [pontoTexto, setPontoTexto] = useState("");
  const perspectivasIniciadasRef = useRef(false);
  const ehLocacao = laudo.finalidade === "locacao";
  const calc = useMemo(() => calcularLaudo(imovel, comparaveis), [imovel, comparaveis]);
  const san = calc.saneamento;

  const valorArredondado = Math.round(calc.valorCalculado / 10) * 10;
  const valorFinal = valorMoedaBR(laudo.valorAdotado, valorArredondado);
  const sufixoUnid = ehLocacao ? " mês" : "";
  const extenso = valorPorExtenso(valorFinal).toUpperCase() + (ehLocacao ? " POR MÊS" : "");

  const todosFatores = calc.linhas.flatMap((l) => [...Object.values(l.fatores), l.fatorTotal]);
  const minFator = todosFatores.length ? Math.min(...todosFatores) : 1;
  const maxFator = todosFatores.length ? Math.max(...todosFatores) : 1;
  const dentroIntervalo = todosFatores.every((f) => f >= 0.8 && f <= 1.25);
  const padraoPontos = { 1: 2, 2: calc.linhas.length >= 5 ? 2 : 1, 3: 2, 4: dentroIntervalo ? 3 : 2 };
  const pontos = { 1: laudo.pontos[1] ?? padraoPontos[1], 2: laudo.pontos[2] ?? padraoPontos[2], 3: laudo.pontos[3] ?? padraoPontos[3], 4: laudo.pontos[4] ?? padraoPontos[4] };
  const fund = grauFundamentacao(pontos);
  const grauPrec = grauPrecisao(san.intervalo);

  const complemento = imovel.complemento ? ", " + imovel.complemento : "";
  const complementoSuffix = imovel.complemento ? `, ${imovel.complemento}` : "";
  const dataLonga = new Date(laudo.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const vars = {
    solicitante: laudo.solicitante || "[solicitante]",
    objetivo: ehLocacao ? "determinar o valor de locação mensal" : "determinar o valor de mercado",
    valorTipo: ehLocacao ? "valor de locação mensal" : "valor de mercado",
    parteA: ehLocacao ? "locatário" : "comprador",
    parteB: ehLocacao ? "locador" : "vendedor",
    negocio: ehLocacao ? "a locação" : "a venda",
    imovel: `imóvel (${(imovel.tipo || "").toLowerCase()}) situado em ${imovel.endereco}, nº ${imovel.numero}${complemento}, ${imovel.bairro}, ${imovel.cidade}/${imovel.estado}`,
    avaliador: laudo.nomeProfissional,
    profissional: laudo.nomeProfissional,
    tituloProfissional: laudo.tituloProfissional || "",
    qualificacao: laudo.qualificacaoLaudo || qualificacaoLaudoDefault(laudo.creci, laudo.cnai),
    creci: laudo.creci,
    cnai: laudo.cnai,
    tituloLaudo: laudo.finalidade === "locacao"
      ? `Laudo Técnico de Avaliação de Locação de Imóvel ${laudo.naturezaImovel === "rural" ? "Rural" : "Urbano"}`
      : `Laudo Técnico de Avaliação Mercadológica de Imóvel ${laudo.naturezaImovel === "rural" ? "Rural" : "Urbano"}`,
    matricula: imovel.matricula || "",
    tipoImovel: (imovel.tipo || "imóvel").toLowerCase(),
    endereco: imovel.endereco || "[endereço]",
    numero: imovel.numero || "s/n",
    complementoSuffix,
    bairro: imovel.bairro || "[bairro]",
    cidade: imovel.cidade || "[cidade]",
    estadoNome: nomeEstado(imovel.estado),
    numPaginas: laudo.numPaginas || "[nº de páginas]",
    numPaginasExtenso: paginasPorExtenso(laudo.numPaginas),
    dataLonga,
    local: laudo.local || "[local]",
  };

  const matriculaExibida = imovel.matricula || "";

  const mesAno = new Date(laudo.data + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const fotoCapa = fotos.find((f) => f.categoria === "Fachada") || fotos[0];

  const setCampo = (campo, valor) => setLaudo((l) => ({ ...l, [campo]: valor }));
  const setJudicial = (campo, valor) => setLaudo((l) => ({ ...l, judicial: { ...(l.judicial || JUDICIAL_INICIAL), [campo]: valor } }));
  const setTexto = (chave, valor) => setLaudo((l) => ({ ...l, textos: { ...l.textos, [chave]: valor } }));
  function setPonto(item, valor) {
    const trimmed = String(valor ?? "").trim();
    setLaudo((l) => {
      const next = { ...l.pontos };
      if (!trimmed) {
        delete next[item];
        return { ...l, pontos: next };
      }
      const n = parseNumeroBR(trimmed);
      if (Number.isFinite(n) && n >= 0) next[item] = n;
      return { ...l, pontos: next };
    });
  }

  function iniciarEdicaoPonto(item, valorAtual) {
    setPontoEditando(item);
    setPontoTexto(formatPontoFundamentacao(valorAtual));
  }

  function finalizarEdicaoPonto(item) {
    setPonto(item, pontoTexto);
    setPontoEditando(null);
    setPontoTexto("");
  }
  const metodoAtual = metodoAvaliacaoAtual(laudo);

  function setMetodoAvaliacao(metodo) {
    if (metodo !== "comparativo" && metodo !== "evolutivo") return;
    setLaudo((l) => ({
      ...l,
      metodoAvaliacao: metodo,
      textos: { ...l.textos, metodologia: METODOLOGIA_PADRAO[metodo] },
    }));
  }

  function textoTemVariaveis(texto) {
    return /\{\{\w+\}\}/.test(texto || "");
  }

  function textoParaEditor(texto) {
    if (!texto?.trim()) return "";
    return textoTemVariaveis(texto) ? aplicarVariaveis(texto, vars) : texto;
  }

  async function gerarPerspectivasIA(forcar = false) {
    if (!token || !avaliacaoId || gerandoPerspectivas) return;
    const atual = (laudo.textos.perspectivas || "").trim();
    if (atual && !forcar) return;

    setGerandoPerspectivas(true);
    setErroPerspectivas(null);
    try {
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/ia/texto-laudo`, {
        method: "POST",
        body: JSON.stringify({
          tipo: "perspectivas",
          finalidade: laudo.finalidade || "venda",
          texto_atual: forcar ? atual : "",
          valor_estimado: valorFinal,
        }),
      });
      setTexto("perspectivas", resp.texto);
    } catch (err) {
      setErroPerspectivas(err.message);
    } finally {
      setGerandoPerspectivas(false);
    }
  }

  useEffect(() => {
    if (!token || !avaliacaoId || perspectivasIniciadasRef.current) return;
    if ((laudo.textos.perspectivas || "").trim()) return;
    perspectivasIniciadasRef.current = true;
    gerarPerspectivasIA(false);
  }, [token, avaliacaoId, laudo.textos.perspectivas]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (p) setCurriculo(curriculoFromPerfil(p)); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setTextoQuesitosLocal(quesitos?.texto || "");
  }, [quesitos?.texto]);

  useEffect(() => {
    if (laudo.numPaginas) return;
    const est = estimarPaginasLaudo(laudo, fotos, documentos, curriculo, quesitos);
    setLaudo((l) => (l.numPaginas ? l : { ...l, numPaginas: String(est) }));
  }, [fotos.length, documentos.length, laudo.documentoJudicial, laudo.incluirAnexoCurriculo, curriculo, quesitos?.incluir, quesitos?.texto, quesitos?.arquivoUrl]);

  // Função (e não componente) para não perder o foco do textarea a cada tecla.
  const bloco = (chave, placeholder, rows, opts = {}) => {
    const textoBruto = chave === "metodologia" ? textoMetodologia(laudo) : textoLaudoEfetivo(laudo.textos, chave);
    const usaModeloAutomatico = textoTemVariaveis(textoBruto);
    const textoRestauravel = chave === "metodologia"
      ? METODOLOGIA_PADRAO[metodoAtual]
      : DEFAULT_TEXTOS[chave];
    if (editando) {
      return (
        <div key={chave} className="mb-3">
          <textarea
            value={textoParaEditor(textoBruto)}
            rows={rows || 6}
            onChange={(e) => setTexto(chave, e.target.value)}
            placeholder={placeholder || "Escreva aqui."}
            className="w-full rounded-lg border border-blue-200 bg-brand-50/30 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 transition-colors"
          />
          {usaModeloAutomatico && (
            <p className="print:hidden text-[10px] text-slate-500 mt-1.5">
              Nome, imóvel e demais dados já aparecem preenchidos. Se você alterar o texto, ele fica fixo.
            </p>
          )}
          {opts.restauravel && textoRestauravel && (
            <button type="button" onClick={() => setTexto(chave, textoRestauravel)}
              className="print:hidden mt-1.5 text-[10px] font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
              Restaurar texto padrão{chave === "metodologia" ? " do método selecionado" : " (atualiza com os dados do laudo)"}
            </button>
          )}
        </div>
      );
    }
    if (!textoBruto.trim()) {
      return (
        <button key={chave} onClick={() => setEditando(true)}
          className="print:hidden w-full text-left text-xs italic text-amber-700 bg-amber-50 border border-dashed border-amber-200 rounded px-3 py-2 mb-3 cursor-pointer">
          {placeholder || "A preencher pelo profissional responsável."} (clique para escrever)
        </button>
      );
    }
    return <Paragrafos key={chave} texto={textoBruto} vars={vars} />;
  };

  const sumario = [
    ["A. Introdução"], ["B. Premissas e ressalvas"], ["C. Resultados"], ["D. Subsídios utilizados"],
    ["D.1 Documentação fornecida", true], ["D.2 Vistoria", true], ["D.3 Adequação", true],
    ["E. Localização"], ["F. Comentários mercadológicos"],
    ["F.1 Mercado atual", true], ["F.2 Perspectivas futuras", true], ["F.3 Valores resultantes", true],
    ["G. Relatório fotográfico"], ["H. Metodologia"],
    ["H.1 Metodologia utilizada", true], ["H.2 Homogeneização de valores", true],
    ["I. Tratamento por fatores"], ["J. Levantamento de pesquisa"],
    ["J.1 Croqui das amostras", true], ["J.2 Fichas de pesquisa", true],
    ["K. Homogeneização"], ["L. Cálculo do " + vars.valorTipo], ["M. Gráficos"],
    ["N. Especificação da avaliação"], ["O. Encerramento"],
  ];

  const itensFund = [
    [1, "Caracterização do imóvel", "Completa quanto aos fatores utilizados no tratamento"],
    [2, "Quantidade mínima de dados de mercado efetivamente utilizados", `Quantidade mínima de dados de mercado para atingir grau II: 5 (utilizados: ${calc.linhas.length})`],
    [3, "Identificação dos dados de mercado", "Apresentação de informações relativas a todas as características dos dados analisados"],
    [4, "Intervalo admissível de ajuste para cada fator e para o conjunto de fatores", `Intervalo admissível para atingir grau III: 0,80 a 1,25 (aplicado: ${fmt2(minFator)} a ${fmt2(maxFator)})`],
  ];

  return (
    <div className="space-y-6">
      <div className="ui-card p-5 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Laudo de avaliação</p>
            <p className="text-xs text-slate-500 mt-1">
              Prévia HTML (seções A a O e anexos). Logo e template Word ficam em <strong>Configurações → Identidade visual</strong>.
              Use <strong>Gerar Word</strong> ou <strong>Gerar PDF</strong> para baixar com seu layout.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditando((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2.5 ${editando ? ui.btnPrimary : ui.btnSecondary} cursor-pointer transition-colors`}>
              <PenLine className="h-3.5 w-3.5" /> {editando ? "Concluir edição" : "Editar textos"}
            </button>
            <button type="button" onClick={onGerarWord} disabled={gerandoWord || gerandoPdf}
              className={`flex items-center gap-1.5 ${ui.btnPrimary} text-xs px-3.5 disabled:opacity-50`}>
              <FileText className="h-3.5 w-3.5" /> {gerandoWord ? "Gerando..." : "Gerar relatório (Word)"}
            </button>
            <button type="button" onClick={onGerarPdf} disabled={gerandoPdf || gerandoWord}
              className={`flex items-center gap-1.5 ${ui.btnSecondary} text-xs px-3.5 disabled:opacity-50`}>
              <Download className="h-3.5 w-3.5" /> {gerandoPdf ? "Gerando..." : "Gerar PDF"}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium px-3.5 py-2.5 cursor-pointer transition-colors">
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-3 mb-3 border-b border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-800">Documento judicial</p>
            <p className="text-[11px] text-slate-500">Ative para incluir a página de apresentação ao juízo antes do laudo.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer shrink-0">
            <input type="checkbox" checked={!!laudo.documentoJudicial} onChange={(e) => setCampo("documentoJudicial", e.target.checked)} className="rounded" />
            Laudo pericial / judicial
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 py-3 mb-3 border-b border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-800">Anexo II — Currículo do profissional</p>
            <p className="text-[11px] text-slate-500">
              {curriculoTemConteudo(curriculo)
                ? "Capa + formação/experiência ou PDF do currículo, após o Anexo I."
                : "Preencha em Configurações → Anexo II (formação, experiência ou PDF)."}
            </p>
          </div>
          <label className={`flex items-center gap-2 text-sm shrink-0 ${curriculoTemConteudo(curriculo) ? "text-slate-700 cursor-pointer" : "text-slate-400 cursor-not-allowed"}`}>
            <input type="checkbox" checked={!!laudo.incluirAnexoCurriculo && curriculoTemConteudo(curriculo)}
              disabled={!curriculoTemConteudo(curriculo)}
              onChange={(e) => setCampo("incluirAnexoCurriculo", e.target.checked)} className="rounded" />
            Incluir Anexo II
          </label>
        </div>

        <div className="py-3 mb-3 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Anexo III — Respostas aos quesitos</p>
              <p className="text-[11px] text-slate-500">Opcional. Use quando o processo tiver quesitos a responder; fica após o Anexo II.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer shrink-0">
              <input type="checkbox" checked={!!quesitos?.incluir}
                onChange={(e) => onToggleIncluirQuesitos(e.target.checked)} className="rounded" />
              Incluir Anexo III
            </label>
          </div>
          {quesitos?.incluir && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
              <Campo label="Respostas aos quesitos">
                <textarea value={textoQuesitosLocal}
                  onChange={(e) => setTextoQuesitosLocal(e.target.value)}
                  onBlur={() => onSalvarTextoQuesitos(textoQuesitosLocal)}
                  rows={8}
                  placeholder={"1. Primeiro quesito formulado pelo juízo...\nResposta: ...\n\n2. Segundo quesito...\nResposta: ..."}
                  className={campoInputClass + " resize-y min-h-[160px] text-xs"} />
              </Campo>
              <p className="text-[10px] text-slate-500">Salvo automaticamente ao sair do campo. Ou envie um PDF pronto:</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className={`inline-flex items-center gap-2 ${ui.btnSecondary} text-xs px-3 py-2 cursor-pointer ${enviandoQuesitosPdf ? "opacity-50 pointer-events-none" : ""}`}>
                  {enviandoQuesitosPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {enviandoQuesitosPdf ? "Enviando..." : "Enviar PDF dos quesitos"}
                  <input type="file" accept=".pdf,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onEnviarQuesitosPdf(f); e.target.value = ""; }} />
                </label>
                {quesitos?.arquivoUrl && (
                  <>
                    <a href={quesitos.arquivoUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:text-brand-700">{quesitos.arquivoNome || "Ver PDF"}</a>
                    <button type="button" onClick={onRemoverQuesitosPdf} disabled={enviandoQuesitosPdf}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer">Remover PDF</button>
                  </>
                )}
              </div>
              {quesitos?.arquivoUrl && (
                <p className="text-[10px] text-amber-700">Com PDF anexado, a prévia usa o arquivo em vez do texto acima.</p>
              )}
            </div>
          )}
        </div>

        {laudo.documentoJudicial && (
          <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50/40 space-y-3">
            <p className="text-xs font-semibold text-amber-900">Página de apresentação ao juízo</p>
            <Campo label="Destinatário (juízo)">
              <textarea rows={2} value={laudo.judicial?.destinatario || ""} onChange={(e) => setJudicial("destinatario", e.target.value)}
                placeholder="Ex: EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 22ª VARA CÍVEL DA COMARCA DE BELO HORIZONTE - MG."
                className={campoInputClass + " resize-y text-xs uppercase"} />
            </Campo>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Campo label="Processo"><input value={laudo.processo} onChange={(e) => setCampo("processo", e.target.value)} placeholder="5080104-13.2022.8.13.0024" className={campoInputClass} /></Campo>
              <Campo label="Assunto"><input value={laudo.judicial?.assunto || ""} onChange={(e) => setJudicial("assunto", e.target.value)} placeholder="Renovatória de Locação..." className={campoInputClass} /></Campo>
              <Campo label="Autor"><input value={laudo.judicial?.autor || ""} onChange={(e) => setJudicial("autor", e.target.value)} className={campoInputClass} /></Campo>
              <Campo label="Réu"><input value={laudo.judicial?.reu || ""} onChange={(e) => setJudicial("reu", e.target.value)} className={campoInputClass} /></Campo>
              <Campo label="RG do profissional"><input value={laudo.judicial?.rg || ""} onChange={(e) => setJudicial("rg", e.target.value)} className={campoInputClass} /></Campo>
              <Campo label="CPF do profissional"><input value={laudo.judicial?.cpf || ""} onChange={(e) => setJudicial("cpf", e.target.value)} className={campoInputClass} /></Campo>
              <Campo label="Data inscrição CRECI"><input value={laudo.judicial?.creciInscricaoData || ""} onChange={(e) => setJudicial("creciInscricaoData", e.target.value)} placeholder="16/12/2016" className={campoInputClass} /></Campo>
              <Campo label="Região CRECI"><input value={laudo.judicial?.creciRegiao || ""} onChange={(e) => setJudicial("creciRegiao", e.target.value)} placeholder="4.ª Região / MG" className={campoInputClass} /></Campo>
            </div>
            <p className="text-[10px] text-slate-500">Nome, CRECI e CNAI vêm dos campos abaixo. Local e data usam «Local do laudo» e «Data».</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Campo label="Solicitante"><input value={laudo.solicitante} onChange={(e) => setCampo("solicitante", e.target.value)} className={campoInputClass} /></Campo>
          {!laudo.documentoJudicial && (
            <Campo label="Processo (opcional)"><input value={laudo.processo} onChange={(e) => setCampo("processo", e.target.value)} placeholder="Ex: 5080104-13.2022.8.13.0024" className={campoInputClass} /></Campo>
          )}
          <Campo label="Natureza do imóvel">
            <select value={laudo.naturezaImovel || "urbano"} onChange={(e) => setCampo("naturezaImovel", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              <option value="urbano">Urbano</option>
              <option value="rural">Rural</option>
            </select>
          </Campo>
          <Campo label="Finalidade do laudo">
            <select value={laudo.finalidade} onChange={(e) => setCampo("finalidade", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              <option value="venda">Valor de mercado (venda)</option>
              <option value="locacao">Valor de locação mensal</option>
            </select>
          </Campo>
          <Campo label="Nome no laudo"><input value={laudo.nomeProfissional} onChange={(e) => setCampo("nomeProfissional", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Título profissional"><input value={laudo.tituloProfissional} onChange={(e) => setCampo("tituloProfissional", e.target.value)} placeholder="Ex: Corretor de imóveis" className={campoInputClass} /></Campo>
          <Campo label="CRECI"><input value={laudo.creci} onChange={(e) => setCampo("creci", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="CNAI"><input value={laudo.cnai} onChange={(e) => setCampo("cnai", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Local do laudo"><input value={laudo.local} onChange={(e) => setCampo("local", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Data do laudo"><input type="date" value={laudo.data} onChange={(e) => setCampo("data", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Número de páginas">
            <input type="number" min={1} value={laudo.numPaginas} onChange={(e) => setCampo("numPaginas", e.target.value)}
              placeholder={String(estimarPaginasLaudo(laudo, fotos, documentos, curriculo, quesitos))} className={campoInputClass} />
            <p className="text-[10px] text-slate-400 mt-1">Estimativa da prévia: {estimarPaginasLaudo(laudo, fotos, documentos, curriculo, quesitos)}. Ajuste após gerar o Word, se necessário.</p>
          </Campo>
          <Campo label={`Valor adotado (calculado e arredondado: ${brl2(valorArredondado)})`}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
              <input
                value={laudo.valorAdotado}
                onChange={(e) => setCampo("valorAdotado", mascaraValorMoedaBR(e.target.value))}
                onBlur={(e) => {
                  const n = parseNumeroBR(e.target.value);
                  setCampo("valorAdotado", Number.isFinite(n) && n > 0 ? formatNumeroBR(n) : "");
                }}
                inputMode="decimal"
                placeholder={formatNumeroBR(valorArredondado)}
                className={campoInputClass + " pl-9"}
              />
            </div>
          </Campo>
        </div>

        {editando && (
          <p className="text-[11px] text-brand-700 bg-brand-50 border border-blue-100 rounded-lg px-3 py-2 mt-3">
            Modo edição: clique em qualquer texto para alterar. Marcadores como {"{{solicitante}}"}, {"{{matricula}}"}, {"{{imovel}}"} e {"{{valorTipo}}"} são preenchidos automaticamente com os dados da avaliação.
          </p>
        )}
      </div>

      {laudo.documentoJudicial && <PaginaJudicialLaudo laudo={laudo} branding={branding} dataLonga={dataLonga} />}

      {/* Capa */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <div className="text-center py-4">
          <h2 className="text-2xl font-light text-slate-900 leading-snug whitespace-pre-line">{tituloLaudoCapa(laudo)}</h2>
          {fotoCapa && <img src={urlFoto(fotoCapa)} alt="Imóvel avaliado" className="mx-auto mt-6 rounded border-4 border-black max-h-64 object-cover" />}
        </div>
        <div className="space-y-1.5 text-[13px] text-slate-800 mt-4">
          <p><strong>Solicitante:</strong> {laudo.solicitante}</p>
          {laudo.processo && <p><strong>Processo:</strong> n.º {laudo.processo}</p>}
          {matriculaExibida && <p><strong>Matrícula:</strong> n.º {matriculaExibida}</p>}
          <p><strong>Imóvel:</strong> {imovel.tipo}</p>
          <p><strong>Endereço:</strong> {imovel.endereco}, n.º {imovel.numero}</p>
          {imovel.complemento && <p>Complemento: {imovel.complemento}</p>}
          <p>Bairro: {imovel.bairro} - Cidade: {imovel.cidade} - UF: {imovel.estado} - CEP: {imovel.cep}</p>
          <p className="pt-2"><strong>Finalidade do Laudo:</strong> {ehLocacao ? "Determinação do Valor de Locação Mensal" : "Determinação do Valor de Mercado"}</p>
        </div>
      </LaudoPagina>

      {/* Sumário */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <h3 className="text-sm font-bold mb-3" style={{ color: corLaudoEfetiva(branding) }}>SUMÁRIO</h3>
        <div className="space-y-1">
          {sumario.map(([titulo, sub]) => (
            <p key={titulo} className={`text-[13px] ${sub ? "pl-5 italic text-slate-600" : "font-bold text-slate-900 uppercase"} border-b border-dotted border-slate-200 pb-0.5`}>{titulo}</p>
          ))}
        </div>
      </LaudoPagina>

      {/* A e B */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>A. INTRODUÇÃO</Secao>
        {bloco("introducao", "Introdução — opcional; use «Editar textos» para personalizar", 10, { restauravel: true })}
        <Secao>B. PREMISSAS E RESSALVAS</Secao>
        {bloco("premissas", "Premissas e ressalvas", 14)}
      </LaudoPagina>

      {/* C e D */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>C. RESULTADOS</Secao>
        {bloco("resultados", "Resultados", 6)}
        <div className="border border-black mt-4 mb-2">
          <div className="flex">
            <div className="bg-black text-white font-bold px-4 py-2 text-sm flex-1">{ehLocacao ? "VALOR DE LOCAÇÃO:" : "VALOR DE MERCADO:"}</div>
            <div className="font-bold px-4 py-2 text-sm flex-1">{brl2(valorFinal)}{ehLocacao ? " / MÊS" : ""}</div>
          </div>
          <div className="border-t border-black px-4 py-2 text-center text-xs">{extenso}</div>
        </div>
        <Secao>D. SUBSÍDIOS UTILIZADOS</Secao>
        <SubSecao>D.1. DOCUMENTAÇÃO FORNECIDA</SubSecao>
        {bloco("documentacao", "Documentação fornecida (matrícula, contrato, planilhas...)", 4)}
        <div className="print:hidden mb-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">Anexar páginas de documentação</p>
          <p className="text-[10px] text-slate-500 mb-3">PDF ou imagem (matrícula, contrato, RIC…). Cada arquivo vira uma página no Anexo I do laudo.</p>
          <label className={`inline-flex items-center gap-2 ${ui.btnSecondary} text-xs px-3 py-2 cursor-pointer ${enviandoDocumento ? "opacity-50 pointer-events-none" : ""}`}>
            {enviandoDocumento ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {enviandoDocumento ? "Enviando..." : "Adicionar documento"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onEnviarDocumento(f); e.target.value = ""; }} />
          </label>
          {documentos.length > 0 && (
            <ul className="mt-3 space-y-2">
              {documentos.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{doc.nome}</p>
                    {!doc.ehVisualizavel && <p className="text-[10px] text-amber-700">Word — inclua manualmente no Word final</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700">Abrir</a>
                    <button type="button" onClick={() => onRemoverDocumento(doc.id)} className="text-red-600 hover:text-red-700 cursor-pointer">Remover</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <SubSecao>D.2. VISTORIA</SubSecao>
        {bloco("vistoria", "Data da vistoria, presentes e principais características observadas", 5)}
        <SubSecao>D.3. ADEQUAÇÃO</SubSecao>
        {bloco("adequacao", "Adequação entre a documentação e a situação física constatada", 4)}
      </LaudoPagina>

      {/* E e F */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>E. LOCALIZAÇÃO</Secao>
        {bloco("localizacao", "Complemente com comentários sobre o entorno, acesso e vizinhança", 5, { restauravel: true })}
        <Secao>F. COMENTÁRIOS MERCADOLÓGICOS</Secao>
        <SubSecao>F.1. MERCADO ATUAL</SubSecao>
        {bloco("mercadoAtual", "Comentários sobre o mercado atual", 5)}
        <div className="flex items-center justify-between gap-2">
          <SubSecao>F.2. PERSPECTIVAS FUTURAS</SubSecao>
          <button type="button" onClick={() => gerarPerspectivasIA(true)} disabled={gerandoPerspectivas}
            className="print:hidden shrink-0 flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 cursor-pointer">
            {gerandoPerspectivas ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {gerandoPerspectivas ? "Gerando..." : "Regenerar com IA"}
          </button>
        </div>
        {gerandoPerspectivas && !(laudo.textos.perspectivas || "").trim() ? (
          <div className="print:hidden mb-3 rounded-lg border border-dashed border-brand-200 bg-brand-50/40 px-3 py-4 text-xs text-slate-600 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600 shrink-0" />
            Gerando perspectivas futuras com IA...
          </div>
        ) : (
          bloco("perspectivas", "Perspectivas futuras do mercado", 5)
        )}
        {erroPerspectivas && (
          <p className="print:hidden text-[11px] text-red-600 mb-3">{erroPerspectivas}</p>
        )}
        <SubSecao>F.3. VALORES RESULTANTES</SubSecao>
        {bloco("valoresResultantes", "Conclusão geral sobre os valores obtidos na pesquisa", 3, { restauravel: true })}
      </LaudoPagina>

      {/* G */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>G. RELATÓRIO FOTOGRÁFICO</Secao>
        {fotos.length === 0 ? (
          <p className="text-xs italic text-slate-400 border border-dashed border-slate-200 rounded px-3 py-6 text-center">Nenhuma fotografia adicionada (etapa 4).</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {fotos.map((f, i) => (
              <figure key={f.id} className="break-inside-avoid">
                <img src={urlFoto(f)} alt={f.nome} className="w-full aspect-[4/3] object-cover border-2 border-black rounded" />
                <figcaption className="text-[11px] text-center text-slate-600 mt-1">Foto {String(i + 1).padStart(2, "0")} — {f.categoria}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </LaudoPagina>

      {/* H */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>H. METODOLOGIA</Secao>
        <SubSecao>H.1. METODOLOGIA UTILIZADA</SubSecao>
        <div className="print:hidden mb-3">
          <Campo label="Método de avaliação">
            <select value={metodoAtual} onChange={(e) => setMetodoAvaliacao(e.target.value)}
              className={(campoInputClass + " bg-white max-w-md") + " cursor-pointer"}>
              <option value="comparativo">Comparativo direto de dados</option>
              <option value="evolutivo">Evolutivo</option>
            </select>
          </Campo>
          <p className="text-[10px] text-slate-500 mt-1">Ao trocar o método, o texto abaixo volta ao padrão — você pode editar depois em «Editar textos».</p>
        </div>
        <p className="text-[13px] font-bold underline text-slate-900 mb-2">{METODOLOGIA_TITULOS[metodoAtual]}</p>
        {bloco("metodologia", "Metodologia utilizada", 16, { restauravel: true })}
        <SubSecao>H.2. HOMOGENEIZAÇÃO DE VALORES</SubSecao>
        {bloco("homogeneizacao", "Homogeneização de valores", 12)}
      </LaudoPagina>

      {/* I */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>I. TRATAMENTO POR FATORES</Secao>
        {bloco("tratamento", "Tratamento por fatores", 22)}
      </LaudoPagina>

      {/* J */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>J. LEVANTAMENTO DE PESQUISA</Secao>
        <SubSecao>J.1. CROQUI DAS AMOSTRAS</SubSecao>
        <div className="relative z-0 isolate overflow-hidden rounded-lg">
          <MapaCroquiComparaveis imovel={imovel} comparaveis={comparaveis} altura={360} modoRelatorio corDestaque={corLaudoEfetiva(branding)} />
        </div>
        <p className="text-[11px] text-center text-slate-500 mt-1 mb-4 print:hidden">Croqui de localização do avaliando e das amostras — ajuste as posições na etapa Comparáveis (ícone de mapa)</p>
        <SubSecao>J.2. FICHAS DE PESQUISA</SubSecao>
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3">
          {calc.linhas.map((l) => (
            <div key={l.n} className="border border-gray-400 text-[11px] break-inside-avoid">
              <div className="flex justify-between border-b border-gray-300 px-2 py-1 bg-slate-50">
                <span className="font-semibold">Ficha de pesquisa nº {String(l.n).padStart(2, "0")}</span>
                <span className="capitalize">{mesAno}</span>
              </div>
              <FichaLinha rotulo="Endereço" valor={`${l.c.endereco}${l.c.bairro ? " - " + l.c.bairro : ""}${l.c.cidade ? " - " + l.c.cidade : ""}`} />
              <FichaLinha rotulo="Fonte" valor={l.c.fonte || "—"} />
              <FichaLinha rotulo="Tipo do imóvel" valor={imovel.tipo} />
              <FichaLinha rotulo="Área útil (m²)" valor={fmt2(l.c.area)} />
              <FichaLinha rotulo="Quartos / Banheiros / Vagas" valor={`${l.c.quartos ?? "—"} / ${l.c.banheiros ?? "—"} / ${l.c.vagas ?? "—"}`} />
              <FichaLinha rotulo="Distância do avaliando" valor={l.c.distancia ? l.c.distancia + " km" : "—"} />
              <FichaLinha rotulo="Características" valor={l.c.observacoes || "—"} />
              <FichaLinha rotulo="Oferta" valor={ehLocacao ? "Locação" : "Venda"} />
              <FichaLinha rotulo={ehLocacao ? "Preço locação" : "Valor de venda"} valor={brl2(l.c.valor)} />
              <FichaLinha rotulo="Unitário" valor={`${brl2(l.unitarioBruto)} / m²${sufixoUnid}`} />
            </div>
          ))}
        </div>
        <p className="print:hidden text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mt-3">
          Campos usados nas fichas da avaliadora, como padrão construtivo, estado de conservação, idade aparente e testada, ainda não são coletados nesta versão.
        </p>
      </LaudoPagina>

      {/* K */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <TabelaHomogeneizacaoK calc={calc} ehLocacao={ehLocacao} />
      </LaudoPagina>

      {/* L e M */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>L. CÁLCULO DO {vars.valorTipo.toUpperCase()}</Secao>
        <QuadroDados titulo={`FORMAÇÃO DO ${vars.valorTipo.toUpperCase()}`} linhas={[
          ["ÁREA (m²)", fmt2(calc.areaImovel)],
          [`VALOR UNITÁRIO FINAL (R$/m²${sufixoUnid})`, fmt2(calc.unitarioFinal)],
          ["APROVEITAMENTO", "1,00"],
          [`${vars.valorTipo.toUpperCase()} (R$${ehLocacao ? "/MÊS" : ""})`, fmt2(calc.valorCalculado)],
        ]} />
        <div className="border border-black mt-4 mb-2">
          <div className="flex">
            <div className="bg-black text-white font-bold px-4 py-2 text-sm flex-1">{ehLocacao ? "VALOR DE LOCAÇÃO:" : "VALOR DE MERCADO:"}</div>
            <div className="font-bold px-4 py-2 text-sm flex-1">{brl2(valorFinal)}{ehLocacao ? " / MÊS" : ""}</div>
          </div>
          <div className="border-t border-black px-4 py-2 text-center text-xs">{extenso}</div>
        </div>
        <Secao>M. GRÁFICOS</Secao>
        <p className="text-[12px] font-semibold text-slate-700 mb-1">Unitário homogeneizado por elemento × média saneada e limites</p>
        <GraficoUnitarios linhas={calc.linhas} media={san.mediaSaneada} minimo={san.minimo} maximo={san.maximo} corDestaque={corLaudoEfetiva(branding)} />
        <p className="print:hidden text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mt-3">
          Os gráficos de resíduos relativos e de unitários observados × estimados do laudo de referência serão configurados junto com a avaliadora.
        </p>
      </LaudoPagina>

      {/* N */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>N. ESPECIFICAÇÃO DA AVALIAÇÃO</Secao>
        {bloco("especificacao", "Especificação da avaliação", 8)}

        <div className="border border-gray-400 text-[11px] mb-4 break-inside-avoid">
          <div className="bg-black text-white font-bold px-2 py-1.5 text-center">Tabela 3 - Graus de fundamentação no caso de utilização do tratamento por fatores (ABNT NBR 14653-2:2011)</div>
          <div className="grid grid-cols-[32px_1fr_1.2fr_72px] font-bold border-b border-gray-300 bg-slate-50 text-center">
            <div className="py-1">Item</div><div className="py-1">Descrição</div><div className="py-1">Resultado</div><div className="py-1">Pontos</div>
          </div>
          {itensFund.map(([item, desc, res]) => (
            <div key={item} className="grid grid-cols-[32px_1fr_1.2fr_72px] border-b border-slate-200 items-center">
              <div className="py-2 text-center font-semibold">{item}</div>
              <div className="py-2 px-2">{desc}</div>
              <div className="py-2 px-2">{res}</div>
              <div className="py-2 px-1 text-center">
                <input
                  type="text"
                  inputMode="decimal"
                  value={pontoEditando === item ? pontoTexto : formatPontoFundamentacao(pontos[item])}
                  onFocus={() => iniciarEdicaoPonto(item, pontos[item])}
                  onChange={(e) => setPontoTexto(e.target.value)}
                  onBlur={() => finalizarEdicaoPonto(item)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                  placeholder="0"
                  title="Informe os pontos manualmente (ex.: 2, 0,7 ou 4,5)"
                  className="print:hidden w-full border border-gray-300 rounded px-1 py-0.5 bg-white text-center text-[11px] focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                />
                <span className="hidden print:inline">{formatPontoFundamentacao(pontos[item])}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-end px-3 py-1.5 font-bold">Total: <span className="w-14 text-center">{formatPontoFundamentacao(fund.total)}</span></div>
        </div>

        <div className="border border-gray-400 text-[11px] mb-4 break-inside-avoid">
          <div className="bg-black text-white font-bold px-2 py-1.5 text-center">Tabela 4 - Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização de tratamento por fatores</div>
          <div className="grid grid-cols-4 text-center border-b border-slate-200"><div className="py-1">Graus</div><div className="py-1">III</div><div className="py-1">II</div><div className="py-1">I</div></div>
          <div className="grid grid-cols-4 text-center border-b border-slate-200 italic"><div className="py-1">Pontos mínimos</div><div className="py-1">10</div><div className="py-1">6</div><div className="py-1">4</div></div>
          <div className="grid grid-cols-4 text-center border-b border-slate-200 italic"><div className="py-1">Itens obrigatórios</div><div className="py-1">2 e 4, com os demais no mínimo no grau II</div><div className="py-1">2 e 4, com os demais no mínimo no grau I</div><div className="py-1">todos, no mínimo no grau I</div></div>
          <div className="flex justify-between px-3 py-1.5 font-bold"><span>GRAU DE FUNDAMENTAÇÃO:</span><span>{fund.grau}</span></div>
        </div>

        <div className="border border-gray-400 text-[11px] break-inside-avoid">
          <div className="bg-black text-white font-bold px-2 py-1.5 text-center">Tabela 5 - Graus de precisão da estimativa de valor no caso de utilização de tratamento por fatores</div>
          <div className="grid grid-cols-4 text-center border-b border-slate-200"><div className="py-1">Graus</div><div className="py-1">III</div><div className="py-1">II</div><div className="py-1">I</div></div>
          <div className="grid grid-cols-4 text-center border-b border-slate-200 italic"><div className="py-1">Amplitude do intervalo de confiança de 80% em torno do valor central da estimativa</div><div className="py-1">{"<=30%"}</div><div className="py-1">{"<=40%"}</div><div className="py-1">{"<=50%"}</div></div>
          <div className="flex justify-between px-3 py-1.5 font-bold border-b border-slate-200"><span>Intervalo de confiança:</span><span>{fmt2(san.intervalo)}%</span></div>
          <div className="flex justify-between px-3 py-1.5 font-bold"><span>GRAU DE PRECISÃO:</span><span>{grauPrec}</span></div>
        </div>
      </LaudoPagina>

      {/* O */}
      <LaudoPagina laudo={laudo} branding={branding}>
        <Secao>O. ENCERRAMENTO</Secao>
        {bloco("encerramento", "Encerramento — informe o número de páginas e a data nos campos acima", 4, { restauravel: true })}
        <p className="text-[13px] text-slate-700 text-right mt-8">{laudo.local || "[local]"}, {dataLonga}.</p>
        <div className="text-center mt-14">
          <p className="text-[13px] font-bold italic text-slate-900">{laudo.nomeProfissional}</p>
          {laudo.tituloProfissional && <p className="text-[12px] text-slate-700 uppercase">{laudo.tituloProfissional}</p>}
          {laudo.creci && <p className="text-[12px] text-slate-700">{laudo.creci}</p>}
          {laudo.cnai && <p className="text-[12px] text-slate-700 mt-1">{laudo.cnai}</p>}
        </div>
      </LaudoPagina>

      {documentos.length > 0 && (
        <>
          <LaudoPagina laudo={laudo} branding={branding}>
            <div className="flex min-h-[520px] items-center justify-center">
              <p className="text-center text-lg font-bold uppercase text-slate-900 tracking-wide">Anexo I: Documentação do imóvel.</p>
            </div>
          </LaudoPagina>
          {documentos.map((doc) => (
            <LaudoPagina key={doc.id} laudo={laudo} branding={branding}>
              {doc.ehPdf ? (
                <PdfPreview url={doc.url} title={doc.nome} />
              ) : doc.ehImagem ? (
                <img src={doc.url} alt={doc.nome} className="mx-auto max-w-full max-h-[720px] object-contain border border-slate-200 rounded" />
              ) : (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900">
                  <p className="font-medium">{doc.nome}</p>
                  <p className="mt-2 text-xs">Este formato não aparece na prévia. Baixe e inclua no Word final.</p>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-brand-600 hover:text-brand-700 text-xs font-medium">Baixar arquivo</a>
                </div>
              )}
              <p className="mt-2 text-[11px] text-slate-500 text-center">{doc.nome}</p>
            </LaudoPagina>
          ))}
        </>
      )}

      {laudo.incluirAnexoCurriculo !== false && curriculoTemConteudo(curriculo) && (
        <>
          <LaudoPagina laudo={laudo} branding={branding}>
            <div className="flex min-h-[520px] items-center justify-center">
              <p className="text-center text-lg font-bold uppercase text-slate-900 tracking-wide">Anexo II: Dados do profissional nomeado.</p>
            </div>
          </LaudoPagina>
          {curriculo.arquivoUrl ? (
            <LaudoPagina laudo={laudo} branding={branding}>
              <PdfPreview url={curriculo.arquivoUrl} title={curriculo.arquivoNome || "Currículo"} />
              <p className="mt-2 text-[11px] text-slate-500 text-center">{curriculo.arquivoNome}</p>
            </LaudoPagina>
          ) : (
            <LaudoPagina laudo={laudo} branding={branding}>
              <PaginaCurriculoTexto curriculo={curriculo} />
            </LaudoPagina>
          )}
        </>
      )}

      {quesitos?.incluir && quesitosTemConteudo(quesitos) && (
        <>
          <LaudoPagina laudo={laudo} branding={branding}>
            <div className="flex min-h-[520px] items-center justify-center">
              <p className="text-center text-lg font-bold uppercase text-slate-900 tracking-wide">Anexo III: Respostas aos quesitos.</p>
            </div>
          </LaudoPagina>
          {quesitos.arquivoUrl ? (
            <LaudoPagina laudo={laudo} branding={branding}>
              <PdfPreview url={quesitos.arquivoUrl} title={quesitos.arquivoNome || "Respostas aos quesitos"} />
              <p className="mt-2 text-[11px] text-slate-500 text-center">{quesitos.arquivoNome}</p>
            </LaudoPagina>
          ) : (
            <LaudoPagina laudo={laudo} branding={branding}>
              <div className="text-[12px] text-slate-800 leading-relaxed whitespace-pre-wrap">{quesitos.texto.trim()}</div>
            </LaudoPagina>
          )}
        </>
      )}

      <div className="flex justify-start print:hidden">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
      </div>
    </div>
  );
}

function AvaliacaoModuleScreen({ token, user, onIrAssinatura }) {
  const { plano, recarregar: recarregarPlano } = usePlano(token);
  const [view, setView] = useState("lista");
  const [etapa, setEtapa] = useState(1);
  const [avaliacaoId, setAvaliacaoId] = useState(null);
  const [usageLimits, setUsageLimits] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [imovel, setImovel] = useState(IMOVEL_VAZIO);
  const [comparaveis, setComparaveis] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [quesitos, setQuesitos] = useState({ incluir: false, texto: "", arquivoUrl: null, arquivoNome: "", ehPdf: false });
  const [enviandoQuesitosPdf, setEnviandoQuesitosPdf] = useState(false);
  const [laudo, setLaudo] = useState(() => laudoInicialFromPerfil(user));
  const [resultado, setResultado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState(null);
  const [calculandoFatores, setCalculandoFatores] = useState(false);
  const [fatoresCalculados, setFatoresCalculados] = useState(false);
  const [erroFatores, setErroFatores] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoDocumento, setEnviandoDocumento] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [erroGeral, setErroGeral] = useState(null);
  const [branding, setBranding] = useState(null);
  const [gerandoLaudoWord, setGerandoLaudoWord] = useState(false);
  const [gerandoLaudoPdf, setGerandoLaudoPdf] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);
  const calculandoFatoresRef = useRef(false);
  const tentouCalcularFatoresRef = useRef(false);

  async function carregarBranding() {
    try {
      const b = await apiAvaliacoes(token, "/branding");
      setBranding(brandingFromApi(b));
    } catch { /* branding opcional */ }
  }

  async function carregarLista() {
    setCarregandoLista(true);
    setErroLista(null);
    try {
      const dados = await apiAvaliacoes(token, "/");
      setAvaliacoes(dados);
    } catch (err) {
      setErroLista(err instanceof TypeError ? `Não consegui falar com o backend (${API_BASE}).` : err.message);
    } finally {
      setCarregandoLista(false);
    }
  }

  useEffect(() => { if (view === "lista") carregarLista(); }, [view, token]);
  useEffect(() => {
    if (view !== "wizard") return;
    carregarBranding();
  }, [view, token, etapa]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((perfil) => {
        if (!perfil) return;
        setLaudo((l) => ({
          ...l,
          nomeProfissional: l.nomeProfissional || perfil.nome || "",
          tituloProfissional: l.tituloProfissional || perfil.titulo_profissional || "",
          qualificacaoLaudo: l.qualificacaoLaudo || qualificacaoLaudoDefault(perfil.creci, perfil.cnai, perfil.qualificacao_laudo),
          creci: l.creci || perfil.creci || "",
          cnai: l.cnai || perfil.cnai || "",
          local: l.local || perfil.local_laudo || "Belo Horizonte",
        }));
      })
      .catch(() => {});
  }, [token]);
  useEffect(() => { setErroGeral(null); }, [etapa]);

  useEffect(() => {
    if (etapa !== 2 || !avaliacaoId || !token) return;
    apiAvaliacoes(token, `/${avaliacaoId}`)
      .then((d) => setUsageLimits(d.usage || null))
      .catch(() => {});
  }, [etapa, avaliacaoId, token]);

  function carregarDetalhe(dados) {
    const imovelApi = imovelFromApi(dados);
    setImovel(imovelApi);
    setComparaveis(dados.comparaveis.map(comparavelFromApi));
    setFotos(dados.fotos.map(fotoFromApi));
    setDocumentos((dados.documentos || []).map(documentoFromApi));
    setQuesitos(quesitosFromApi(dados));
    setLaudo((l) => ({
      ...l,
      local: dados.cidade || l.local,
    }));
    setFatoresCalculados(dados.comparaveis.some((c) => c.fatores_calculados_por_ia || c.fatores_editados_manualmente));
    setUsageLimits(dados.usage || null);
  }

  async function iniciarNova() {
    setErroGeral(null);
    setSalvando(true);
    try {
      const dados = await apiAvaliacoes(token, "/", { method: "POST", body: JSON.stringify(imovelToApi(IMOVEL_VAZIO)) });
      setAvaliacaoId(dados.id);
      carregarDetalhe(dados);
      setLaudo(laudoInicialFromPerfil(user));
      setResultado(null);
      setEtapa(1);
      setView("wizard");
      recarregarPlano();
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function continuarExistente(id) {
    setErroGeral(null);
    setSalvando(true);
    try {
      const dados = await apiAvaliacoes(token, `/${id}`);
      setAvaliacaoId(dados.id);
      carregarDetalhe(dados);
      setResultado(null);
      setEtapa(1);
      setView("wizard");
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function consultarCep(cep) {
    setBuscandoCep(true);
    setErroCep(null);
    try {
      const dados = await apiAvaliacoes(token, `/cep/${cep.replace(/\D/g, "")}`);
      setImovel((i) => ({
        ...i,
        cep: dados.cep,
        endereco: dados.endereco || i.endereco,
        bairro: dados.bairro || i.bairro,
        cidade: dados.cidade || i.cidade,
        estado: dados.estado || i.estado,
        complemento: dados.complemento || i.complemento,
        latitude: dados.latitude,
        longitude: dados.longitude,
        mapaSateliteUrl: dados.mapa_satelite_url,
      }));
    } catch (err) {
      setErroCep(err.message);
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvarImovel() {
    setSalvando(true);
    setErroGeral(null);
    try {
      let imovelAtual = { ...imovel };
      if (!imovelAtual.latitude && imovelAtual.endereco) {
        const geo = await apiAvaliacoes(token, `/geocodificar?${new URLSearchParams({
          endereco: imovelAtual.endereco, numero: imovelAtual.numero || "",
          bairro: imovelAtual.bairro || "", cidade: imovelAtual.cidade || "",
          estado: imovelAtual.estado || "", cep: imovelAtual.cep || "",
        })}`);
        if (geo.latitude) {
          imovelAtual = { ...imovelAtual, latitude: geo.latitude, longitude: geo.longitude, mapaSateliteUrl: geo.mapa_satelite_url };
          setImovel(imovelAtual);
        }
      }
      const dados = await apiAvaliacoes(token, `/${avaliacaoId}`, { method: "PATCH", body: JSON.stringify(imovelToApi(imovelAtual)) });
      carregarDetalhe(dados);
      setEtapa(2);
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarComparavel(dados) {
    const resp = await apiAvaliacoes(token, `/${avaliacaoId}/comparaveis`, { method: "POST", body: JSON.stringify(comparavelToApi(dados)) });
    setComparaveis((c) => [...c, comparavelFromApi(resp)]);
    setFatoresCalculados(false);
    tentouCalcularFatoresRef.current = false;
  }

  async function editarComparavel(compId, dados) {
    const resp = await apiAvaliacoes(token, `/${avaliacaoId}/comparaveis/${compId}`, {
      method: "PATCH",
      body: JSON.stringify(comparavelToApi(dados)),
    });
    setComparaveis((cs) => cs.map((c) => (c.id === compId ? comparavelFromApi(resp) : c)));
    setFatoresCalculados(false);
    setResultado(null);
    tentouCalcularFatoresRef.current = false;
  }

  async function removerComparavel(compId) {
    await apiAvaliacoes(token, `/${avaliacaoId}/comparaveis/${compId}`, { method: "DELETE" });
    setComparaveis((c) => c.filter((x) => x.id !== compId));
    setFatoresCalculados(false);
    tentouCalcularFatoresRef.current = false;
  }

  async function geocodificarComparaveis() {
    const lista = await apiAvaliacoes(token, `/${avaliacaoId}/comparaveis/geocodificar`, { method: "POST" });
    setComparaveis(lista.map(comparavelFromApi));
  }

  async function moverCoordsComparavel(compId, lat, lng) {
    try {
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/comparaveis/${compId}/coordenadas`, {
        method: "PATCH",
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      setComparaveis((cs) => cs.map((c) => (c.id === compId ? comparavelFromApi(resp) : c)));
    } catch (err) {
      setErroGeral(err.message);
    }
  }

  async function editarFatores(compId, fatores) {
    try {
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/comparaveis/${compId}/fatores`, {
        method: "PATCH",
        body: JSON.stringify({
          fator_local: fatores.fatorLocal,
          fator_area: fatores.fatorArea,
          fator_depreciacao: fatores.fatorDepreciacao,
          fator_padrao: fatores.fatorPadrao,
          fator_testada: fatores.fatorTestada,
        }),
      });
      setComparaveis((cs) => cs.map((c) => (c.id === compId ? comparavelFromApi(resp) : c)));
      setFatoresCalculados(true);
      const res = await apiAvaliacoes(token, `/${avaliacaoId}/resultado`);
      setResultado(res);
      setErroFatores(null);
    } catch (err) {
      setErroFatores(err.message);
      throw err;
    }
  }

  async function recalcularFatores() {
    setErroFatores(null);
    setResultado(null);
    setFatoresCalculados(false);
    tentouCalcularFatoresRef.current = false;
    await calcularFatores(true);
  }

  function aplicarFatoresLocaisFallback() {
    setComparaveis((cs) => cs.map((c) => {
      const ajustes = calcularAjustes({ ...c, fatorLocal: c.fatorLocal ?? 1, fatorDepreciacao: c.fatorDepreciacao ?? 1, fatorPadrao: c.fatorPadrao ?? 1, fatorTestada: c.fatorTestada ?? 1 }, imovel, cs);
      return {
        ...c,
        fatorLocal: c.fatorLocal ?? 1,
        fatorArea: c.fatorArea ?? ajustes.fatorArea,
        fatorDepreciacao: c.fatorDepreciacao ?? 1,
        fatorPadrao: c.fatorPadrao ?? 1,
        fatorTestada: c.fatorTestada ?? 1,
        fatoresProcessados: true,
        fatoresEditadosManualmente: false,
      };
    }));
    setResultado(resultadoLocal());
    setFatoresCalculados(true);
    setErroFatores(null);
  }

  async function calcularFatores(forcar = false) {
    if (calculandoFatoresRef.current) return;
    if (!forcar && fatoresCalculados) return;
    calculandoFatoresRef.current = true;
    setCalculandoFatores(true);
    setErroFatores(null);
    try {
      await apiAvaliacoes(token, `/${avaliacaoId}/calcular-fatores-ia`, { method: "POST" });
      const dados = await apiAvaliacoes(token, `/${avaliacaoId}`);
      carregarDetalhe(dados);
      setFatoresCalculados(true);
      const res = await apiAvaliacoes(token, `/${avaliacaoId}/resultado`);
      setResultado(res);
    } catch (err) {
      setErroFatores(err.message);
    } finally {
      calculandoFatoresRef.current = false;
      setCalculandoFatores(false);
    }
  }

  function resultadoLocal() {
    const calc = calcularLaudo(imovel, comparaveis);
    const faixa = faixaValorLaudo(calc);
    return {
      valor_estimado: calc.valorCalculado,
      valor_minimo: faixa.minimo,
      valor_maximo: faixa.maximo,
      valor_medio_m2: calc.unitarioFinal,
    };
  }

  function comparaveisJaCalculados(cs) {
    return cs.length > 0 && cs.every((c) => c.fatoresProcessados || c.fatorLocal != null);
  }

  useEffect(() => {
    if (etapa !== 3 || !avaliacaoId || comparaveis.length === 0) return;

    if (comparaveisJaCalculados(comparaveis)) {
      if (!fatoresCalculados) setFatoresCalculados(true);
      setErroFatores(null);
      if (!resultado) {
        apiAvaliacoes(token, `/${avaliacaoId}/resultado`)
          .then(setResultado)
          .catch(() => setResultado(resultadoLocal()));
      }
      return;
    }

    if (!fatoresCalculados && !calculandoFatoresRef.current && !tentouCalcularFatoresRef.current) {
      tentouCalcularFatoresRef.current = true;
      calcularFatores();
    } else if (fatoresCalculados && !resultado) {
      apiAvaliacoes(token, `/${avaliacaoId}/resultado`)
        .then(setResultado)
        .catch(() => setResultado(resultadoLocal()));
    }
  }, [etapa, avaliacaoId, comparaveis.length, fatoresCalculados]);

  async function enviarFoto(file) {
    setEnviandoFoto(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/fotos`, { method: "POST", body: fd });
      setFotos((f) => [...f, fotoFromApi(resp)]);
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFoto(fotoId) {
    await apiAvaliacoes(token, `/${avaliacaoId}/fotos/${fotoId}`, { method: "DELETE" });
    setFotos((f) => f.filter((x) => x.id !== fotoId));
  }

  async function enviarDocumento(file) {
    setEnviandoDocumento(true);
    setErroGeral(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/documentos`, { method: "POST", body: fd });
      setDocumentos((d) => [...d, documentoFromApi(resp)]);
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setEnviandoDocumento(false);
    }
  }

  async function removerDocumento(docId) {
    setErroGeral(null);
    try {
      await apiAvaliacoes(token, `/${avaliacaoId}/documentos/${docId}`, { method: "DELETE" });
      setDocumentos((d) => d.filter((x) => x.id !== docId));
    } catch (err) {
      setErroGeral(err.message);
    }
  }

  async function toggleIncluirQuesitos(incluir) {
    setErroGeral(null);
    try {
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/quesitos`, {
        method: "PATCH",
        body: JSON.stringify({ incluir_anexo_quesitos: incluir }),
      });
      setQuesitos(quesitosFromApi(resp));
    } catch (err) {
      setErroGeral(err.message);
    }
  }

  async function salvarTextoQuesitos(texto) {
    setErroGeral(null);
    try {
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/quesitos`, {
        method: "PATCH",
        body: JSON.stringify({ respostas_quesitos: texto }),
      });
      setQuesitos(quesitosFromApi(resp));
    } catch (err) {
      setErroGeral(err.message);
    }
  }

  async function enviarQuesitosPdf(file) {
    setEnviandoQuesitosPdf(true);
    setErroGeral(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/quesitos/arquivo`, { method: "POST", body: fd });
      setQuesitos(quesitosFromApi(resp));
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setEnviandoQuesitosPdf(false);
    }
  }

  async function removerQuesitosPdf() {
    setEnviandoQuesitosPdf(true);
    setErroGeral(null);
    try {
      const resp = await apiAvaliacoes(token, `/${avaliacaoId}/quesitos/arquivo`, { method: "DELETE" });
      setQuesitos(quesitosFromApi(resp));
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setEnviandoQuesitosPdf(false);
    }
  }

  async function atualizarFoto(fotoId, patch) {
    const resp = await apiAvaliacoes(token, `/${avaliacaoId}/fotos/${fotoId}`, { method: "PATCH", body: JSON.stringify(patch) });
    setFotos((f) => f.map((x) => (x.id === fotoId ? fotoFromApi(resp) : x)));
  }

  function payloadLaudoExport() {
    const calc = calcularLaudo(imovel, comparaveis);
    const valorArredondado = Math.round(calc.valorCalculado / 10) * 10;
    const valorFinal = valorMoedaBR(laudo.valorAdotado, valorArredondado);
    const ehLocacao = laudo.finalidade === "locacao";
    const j = laudo.judicial || JUDICIAL_INICIAL;
    return {
      documento_judicial: !!laudo.documentoJudicial,
      judicial: laudo.documentoJudicial ? {
        destinatario: j.destinatario || "",
        autor: j.autor || "",
        reu: j.reu || "",
        assunto: j.assunto || "",
        rg: j.rg || "",
        cpf: j.cpf || "",
        creci_inscricao_data: j.creciInscricaoData || "",
        creci_regiao: j.creciRegiao || "4.ª Região / MG",
      } : null,
      solicitante: laudo.solicitante,
      processo: laudo.processo || null,
      matricula: imovel.matricula || null,
      natureza_imovel: laudo.naturezaImovel || "urbano",
      finalidade: laudo.finalidade,
      local: laudo.local,
      data: laudo.data,
      num_paginas: laudo.numPaginas ? Number(String(laudo.numPaginas).replace(/\D/g, "")) || null : null,
      perita: laudo.nomeProfissional,
      nome_profissional: laudo.nomeProfissional,
      titulo_profissional: laudo.tituloProfissional || "",
      qualificacao_laudo: laudo.qualificacaoLaudo || qualificacaoLaudoDefault(laudo.creci, laudo.cnai),
      creci: laudo.creci,
      cnai: laudo.cnai,
      valor_adotado: valorFinal,
      valor_extenso: valorPorExtenso(valorFinal).toUpperCase() + (ehLocacao ? " POR MÊS" : ""),
      metodo_avaliacao: metodoAvaliacaoAtual(laudo),
      incluir_anexo_quesitos: !!quesitos?.incluir,
      respostas_quesitos: quesitos?.texto?.trim() || null,
      textos: textosLaudoEfetivos(laudo),
      pontos: Object.fromEntries(
        Object.entries(laudo.pontos || {}).map(([k, v]) => {
          const n = typeof v === "number" ? v : parseNumeroBR(v);
          return [String(k), Number.isFinite(n) ? n : 0];
        }),
      ),
    };
  }

  async function baixarLaudo(endpoint, setGerando, extFallback) {
    setGerando(true);
    setErroGeral(null);
    try {
      const resp = await fetch(`${API_BASE}/avaliacoes/${avaliacaoId}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payloadLaudoExport()),
      });
      if (!resp.ok) {
        let msg = `Erro ${resp.status}`;
        try { const d = await resp.json(); msg = d.detail || msg; } catch { /* ignore */ }
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      const blob = await resp.blob();
      const disp = resp.headers.get("Content-Disposition") || "";
      const match = disp.match(/filename="([^"]+)"/);
      const nome = match?.[1] || `laudo_${avaliacaoId}.${extFallback}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErroGeral(err instanceof TypeError
        ? `Não consegui conectar ao backend (${API_BASE}). Verifique se o servidor está rodando.`
        : err.message);
    } finally {
      setGerando(false);
    }
  }

  async function exportarLaudoWord() {
    await baixarLaudo("exportar-laudo-docx", setGerandoLaudoWord, "docx");
  }

  async function exportarLaudoPdf() {
    await baixarLaudo("exportar-laudo-pdf", setGerandoLaudoPdf, "pdf");
  }

  async function excluirAvaliacao(id) {
    setExcluindoId(id);
    setErroLista(null);
    try {
      await apiAvaliacoes(token, `/${id}`, { method: "DELETE" });
      setAvaliacoes((lista) => lista.filter((a) => a.id !== id));
      if (avaliacaoId === id) {
        setView("lista");
        setAvaliacaoId(null);
      }
    } catch (err) {
      setErroLista(err.message);
    } finally {
      setExcluindoId(null);
    }
  }

  async function irParaRelatorio() {
    setConcluindo(true);
    try {
      const calc = calcularLaudo(imovel, comparaveis);
      const valorArredondado = Math.round(calc.valorCalculado / 10) * 10;
      await apiAvaliacoes(token, `/${avaliacaoId}/concluir`, { method: "POST", body: JSON.stringify({ valor_final: valorArredondado }) });
      setLaudo((l) => ({
        ...l,
        valorAdotado: formatNumeroBR(valorArredondado),
        local: imovel.cidade || l.local,
      }));
      setEtapa(6);
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setConcluindo(false);
    }
  }

  if (view === "lista") {
    return (
      <>
        {erroGeral && <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erroGeral}</div>}
        <AvaliacoesScreen avaliacoes={avaliacoes} carregando={carregandoLista || salvando} erro={erroLista}
          onNovaAvaliacao={iniciarNova} onContinuar={continuarExistente} onExcluir={excluirAvaliacao} excluindoId={excluindoId}
          plano={plano} onIrAssinatura={onIrAssinatura} />
      </>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <button onClick={() => { setView("lista"); carregarLista(); }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar para avaliações</button>
        <AvaliacaoStepper etapaAtual={etapa} onIrPara={setEtapa} />
      </div>

      {erroGeral && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erroGeral}</div>}

      {etapa === 1 && (
        <EtapaImovel imovel={imovel} setImovel={setImovel} onProximo={salvarImovel} token={token}
          buscandoCep={buscandoCep} erroCep={erroCep} onConsultarCep={consultarCep} salvando={salvando} />
      )}
      {etapa === 2 && (
        <EtapaComparaveis imovel={imovel} comparaveis={comparaveis} setComparaveis={setComparaveis}
          onVoltar={() => setEtapa(1)} onProximo={() => setEtapa(3)} token={token} avaliacaoId={avaliacaoId}
          onAdicionarComparavel={adicionarComparavel} onEditarComparavel={editarComparavel} onRemoverComparavel={removerComparavel}
          onGeocodificarComparaveis={geocodificarComparaveis} onMoverComparavel={moverCoordsComparavel}
          erroBusca={erroGeral} usageLimits={usageLimits} onUsageUpdate={setUsageLimits}
          corDestaqueLaudo={corLaudoEfetiva(branding)} />
      )}
      {etapa === 3 && (
        <EtapaCalculos imovel={imovel} comparaveis={comparaveis} onVoltar={() => setEtapa(2)}
          onProximo={() => setEtapa(4)} calculandoFatores={calculandoFatores} erroFatores={erroFatores}
          fatoresCalculados={fatoresCalculados} onEditarFatores={editarFatores} onRecalcularFatores={recalcularFatores}
          onContinuarComFatoresLocais={aplicarFatoresLocaisFallback} />
      )}
      {etapa === 4 && (
        <EtapaFotos fotos={fotos} setFotos={setFotos} onVoltar={() => setEtapa(3)} onProximo={() => setEtapa(5)}
          onEnviarFoto={enviarFoto} onRemoverFoto={removerFoto} onAtualizarFoto={atualizarFoto} enviando={enviandoFoto} />
      )}
      {etapa === 5 && (
        <EtapaResultado imovel={imovel} comparaveis={comparaveis} resultado={resultado}
          onVoltar={() => setEtapa(4)} onProximo={irParaRelatorio} concluindo={concluindo} />
      )}
      {etapa === 6 && (
        <EtapaRelatorio imovel={imovel} comparaveis={comparaveis} fotos={fotos} documentos={documentos}
          onEnviarDocumento={enviarDocumento} onRemoverDocumento={removerDocumento} enviandoDocumento={enviandoDocumento}
          quesitos={quesitos} onToggleIncluirQuesitos={toggleIncluirQuesitos} onSalvarTextoQuesitos={salvarTextoQuesitos}
          onEnviarQuesitosPdf={enviarQuesitosPdf} onRemoverQuesitosPdf={removerQuesitosPdf} enviandoQuesitosPdf={enviandoQuesitosPdf}
          laudo={laudo} setLaudo={setLaudo} setImovel={setImovel}
          token={token} avaliacaoId={avaliacaoId} onVoltar={() => setEtapa(5)} branding={branding}
          onGerarWord={exportarLaudoWord} onGerarPdf={exportarLaudoPdf} gerandoWord={gerandoLaudoWord} gerandoPdf={gerandoLaudoPdf} />
      )}
    </div>
  );
}

/* ============================================================================
   CONFIGURAÇÕES
============================================================================ */

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className={`${ui.toggle} ${checked ? ui.toggleOn : ui.toggleOff}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function ConfiguracoesScreen({ token, user, onPerfilAtualizado }) {
  const [numero, setNumero] = useState("(31) 99887-6655");
  const [distribuicao, setDistribuicao] = useState("Round robin");
  const [ativos, setAtivos] = useState({ Diego: true, Marina: true, Rafael: false });
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState(null);
  const [branding, setBranding] = useState(null);
  const [enviandoBranding, setEnviandoBranding] = useState(false);
  const [nome, setNome] = useState(user?.nome || "");
  const [tituloProfissional, setTituloProfissional] = useState("");
  const [creci, setCreci] = useState("");
  const [cnai, setCnai] = useState("");
  const [localLaudo, setLocalLaudo] = useState("Belo Horizonte");
  const [qualificacaoLaudo, setQualificacaoLaudo] = useState("");
  const [curriculoFormacao, setCurriculoFormacao] = useState("");
  const [curriculoExperiencia, setCurriculoExperiencia] = useState("");
  const [curriculoArquivoUrl, setCurriculoArquivoUrl] = useState(null);
  const [curriculoArquivoNome, setCurriculoArquivoNome] = useState("");
  const [enviandoCurriculo, setEnviandoCurriculo] = useState(false);
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        setNome(p.nome || user?.nome || "");
        setTituloProfissional(p.titulo_profissional || "");
        setCreci(p.creci || "");
        setCnai(p.cnai || "");
        setLocalLaudo(p.local_laudo || "Belo Horizonte");
        setQualificacaoLaudo(p.qualificacao_laudo || "");
        setCurriculoFormacao(p.curriculo_formacao || "");
        setCurriculoExperiencia(p.curriculo_experiencia || "");
        setCurriculoArquivoUrl(p.curriculo_arquivo_url ? `${API_BASE}${p.curriculo_arquivo_url}` : null);
        setCurriculoArquivoNome(p.curriculo_arquivo_nome || "");
      })
      .catch(() => {});
  }, [token, user?.nome]);

  useEffect(() => {
    if (!token) return;
    apiAvaliacoes(token, "/branding")
      .then((b) => setBranding(brandingFromApi(b)))
      .catch(() => {});
  }, [token]);

  async function enviarLogoLaudo(file) {
    setEnviandoBranding(true);
    setErroPerfil(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const b = await apiAvaliacoes(token, "/branding/logo-laudo", { method: "POST", body: fd });
      const next = brandingFromApi(b);
      setBranding(next);
      if (!next.exibirLogoLaudo) {
        const ativado = await apiAvaliacoes(token, "/branding", { method: "PATCH", body: JSON.stringify({ exibir_logo_laudo: true }) });
        setBranding(brandingFromApi(ativado));
      }
    } catch (err) {
      setErroPerfil(err.message);
    } finally {
      setEnviandoBranding(false);
    }
  }

  async function enviarTemplateLaudo(file) {
    setEnviandoBranding(true);
    setErroPerfil(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const b = await apiAvaliacoes(token, "/branding/template-laudo", { method: "POST", body: fd });
      setBranding(brandingFromApi(b));
    } catch (err) {
      setErroPerfil(err.message);
    } finally {
      setEnviandoBranding(false);
    }
  }

  async function toggleLogoLaudo(ativo) {
    setErroPerfil(null);
    try {
      const b = await apiAvaliacoes(token, "/branding", { method: "PATCH", body: JSON.stringify({ exibir_logo_laudo: ativo }) });
      setBranding(brandingFromApi(b));
    } catch (err) {
      setErroPerfil(err.message);
    }
  }

  async function toggleOcultarCabecalhoLaudo(ativo) {
    setErroPerfil(null);
    try {
      const b = await apiAvaliacoes(token, "/branding", { method: "PATCH", body: JSON.stringify({ ocultar_cabecalho_laudo: ativo }) });
      setBranding(brandingFromApi(b));
    } catch (err) {
      setErroPerfil(err.message);
    }
  }

  async function alterarCorDestaqueLaudo(cor) {
    const normalizada = normalizarCorLaudo(cor);
    setBranding((b) => ({ ...(b || brandingFromApi(null)), corDestaqueLaudo: normalizada }));
    setErroPerfil(null);
    try {
      const b = await apiAvaliacoes(token, "/branding", { method: "PATCH", body: JSON.stringify({ cor_destaque_laudo: normalizada }) });
      setBranding(brandingFromApi(b));
    } catch (err) {
      setErroPerfil(err.message);
    }
  }

  async function salvarPerfil() {
    setSalvandoPerfil(true);
    setErroPerfil(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/perfil`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          titulo_profissional: tituloProfissional,
          creci,
          cnai,
          local_laudo: localLaudo,
          qualificacao_laudo: qualificacaoLaudo,
          curriculo_formacao: curriculoFormacao,
          curriculo_experiencia: curriculoExperiencia,
        }),
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Erro ao salvar perfil");
      const perfil = await resp.json();
      onPerfilAtualizado?.(perfil);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch (err) {
      setErroPerfil(err.message);
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function enviarCurriculoPdf(file) {
    setEnviandoCurriculo(true);
    setErroPerfil(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const resp = await fetch(`${API_BASE}/auth/curriculo/arquivo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Erro ao enviar currículo");
      const perfil = await resp.json();
      setCurriculoArquivoUrl(perfil.curriculo_arquivo_url ? `${API_BASE}${perfil.curriculo_arquivo_url}` : null);
      setCurriculoArquivoNome(perfil.curriculo_arquivo_nome || "");
      onPerfilAtualizado?.(perfil);
    } catch (err) {
      setErroPerfil(err.message);
    } finally {
      setEnviandoCurriculo(false);
    }
  }

  async function removerCurriculoPdf() {
    setEnviandoCurriculo(true);
    setErroPerfil(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/curriculo/arquivo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Erro ao remover currículo");
      setCurriculoArquivoUrl(null);
      setCurriculoArquivoNome("");
    } catch (err) {
      setErroPerfil(err.message);
    } finally {
      setEnviandoCurriculo(false);
    }
  }

  function salvar() { salvarPerfil(); }

  return (
    <div className={`${ui.contentWrap} max-w-3xl space-y-5`}>
      <div className={`${ui.card} ${ui.cardPad}`}>
        <p className={`${ui.sectionTitle} mb-1`}>Seu perfil (laudos e avaliações)</p>
        <p className={`${ui.sectionDesc} mb-4`}>Dados usados como padrão nos laudos gerados (nome, credenciais e titulação).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Campo label="Nome completo"><input value={nome} onChange={(e) => setNome(e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Título profissional"><input value={tituloProfissional} onChange={(e) => setTituloProfissional(e.target.value)} placeholder="Ex: Corretor de imóveis, Engenheiro Civil" className={campoInputClass} /></Campo>
          <Campo label="Local padrão do laudo"><input value={localLaudo} onChange={(e) => setLocalLaudo(e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="CRECI"><input value={creci} onChange={(e) => setCreci(e.target.value)} placeholder="Ex: CRECI/MG 33.245" className={campoInputClass} /></Campo>
          <Campo label="CNAI"><input value={cnai} onChange={(e) => setCnai(e.target.value)} placeholder="Ex: CNAI 35.468" className={campoInputClass} /></Campo>
          <div className="md:col-span-2">
            <Campo label="Qualificação no laudo (introdução)">
              <textarea value={qualificacaoLaudo} onChange={(e) => setQualificacaoLaudo(e.target.value)} rows={3}
                placeholder="Ex: CRECI/MG 33.245, CNAI 35.468, conforme Resolução COFECI n.º 1066/2007..."
                className={campoInputClass + " resize-y min-h-[72px]"} />
            </Campo>
            <p className="text-[10px] text-slate-400 mt-1">Aparece na introdução do laudo. Se vazio, montamos automaticamente a partir do CRECI e CNAI.</p>
          </div>
        </div>
        {erroPerfil && <p className="text-xs text-red-600 mt-2">{erroPerfil}</p>}
      </div>

      <PainelIdentidadeLaudo branding={branding} onEnviarLogo={enviarLogoLaudo} onEnviarTemplate={enviarTemplateLaudo}
        onToggleLogo={toggleLogoLaudo} onToggleOcultarCabecalho={toggleOcultarCabecalhoLaudo}
        onAlterarCorDestaque={alterarCorDestaqueLaudo} enviandoBranding={enviandoBranding} />

      <div className={`${ui.card} ${ui.cardPad}`}>
        <p className={`${ui.sectionTitle} mb-1`}>Anexo II — Currículo do profissional</p>
        <p className={`${ui.sectionDesc} mb-4`}>
          Preencha uma vez e reutilize em todos os laudos. Aparece após o Anexo I com a capa «Dados do profissional nomeado».
          Se enviar PDF, ele substitui o texto na prévia.
        </p>
        <div className="space-y-3">
          <Campo label="Formação profissional (uma linha por item)">
            <textarea value={curriculoFormacao} onChange={(e) => setCurriculoFormacao(e.target.value)} rows={6}
              placeholder={"Técnico em Transações Imobiliárias;\nGraduação em Negócios Imobiliários;\nPós-Graduação em Engenharia de Avaliação e Perícia;"}
              className={campoInputClass + " resize-y min-h-[120px] font-mono text-xs"} />
          </Campo>
          <Campo label="Experiência profissional (uma linha por item)">
            <textarea value={curriculoExperiencia} onChange={(e) => setCurriculoExperiencia(e.target.value)} rows={6}
              placeholder={"Corretor(a) de Imóveis — compra, venda e locação;\nAvaliador(a) de Imóveis — credenciado(a) em instituições financeiras;\nPerito(a) Judicial — TJMG, TJSP, TJGO e TJRS;"}
              className={campoInputClass + " resize-y min-h-[120px] font-mono text-xs"} />
          </Campo>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Ou envie o currículo em PDF</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex items-center gap-2 ${ui.btnSecondary} text-xs px-3 py-2 cursor-pointer ${enviandoCurriculo ? "opacity-50 pointer-events-none" : ""}`}>
                {enviandoCurriculo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {enviandoCurriculo ? "Enviando..." : "Enviar PDF do currículo"}
                <input type="file" accept=".pdf,application/pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarCurriculoPdf(f); e.target.value = ""; }} />
              </label>
              {curriculoArquivoUrl && (
                <>
                  <a href={curriculoArquivoUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:text-brand-700">{curriculoArquivoNome || "Ver PDF"}</a>
                  <button type="button" onClick={removerCurriculoPdf} disabled={enviandoCurriculo}
                    className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer">Remover PDF</button>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Salve o perfil após editar os textos. O PDF é salvo ao enviar.</p>
          </div>
        </div>
      </div>

      <div className={`${ui.card} ${ui.cardPad}`}>
        <p className={`${ui.sectionTitle} mb-1`}>Número do WhatsApp da imobiliária</p>
        <p className={`${ui.sectionDesc} mb-4`}>Número usado pela IA para atender os leads automaticamente.</p>
        <div className="flex gap-3">
          <input value={numero} onChange={(e) => setNumero(e.target.value)} className={`flex-1 ${ui.input}`} />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 rounded-lg"><Check className="h-3.5 w-3.5" /> Conectado</span>
        </div>
      </div>

      <div className="ui-card p-5">
        <p className="text-sm font-semibold text-slate-900 mb-1">Distribuição automática de leads</p>
        <p className="text-xs text-slate-400 mb-4">Defina como os leads qualificados são repassados entre corretores.</p>
        <select value={distribuicao} onChange={(e) => setDistribuicao(e.target.value)} className={`${ui.input} mb-5 cursor-pointer`}>
          <option>Round robin (revezamento entre corretores)</option>
          <option>Por região do imóvel</option>
          <option>Por disponibilidade em tempo real</option>
          <option>Manual (corretor escolhe na fila)</option>
        </select>

        <p className="text-xs font-medium text-slate-600 mb-2.5">Corretores ativos na distribuição</p>
        <div className="space-y-2">
          {Object.keys(ativos).map((nome) => (
            <div key={nome} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 ${ui.avatar}`}>{nome[0]}</div>
                <p className="text-sm text-slate-700">{nome} {nome === "Diego" && "Souza"}{nome === "Marina" && "Silva"}{nome === "Rafael" && "Prado"}</p>
              </div>
              <Toggle checked={ativos[nome]} onChange={(v) => setAtivos((a) => ({ ...a, [nome]: v }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="ui-card p-5">
        <p className="text-sm font-semibold text-slate-900 mb-4">Notificações</p>
        <div className="flex items-center justify-between py-2">
          <div><p className="text-sm text-slate-700">Avisar corretor no WhatsApp</p><p className="text-xs text-slate-400">Quando um lead é encaminhado para a fila</p></div>
          <Toggle checked={notifWhatsapp} onChange={setNotifWhatsapp} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div><p className="text-sm text-slate-700">Resumo diário por e-mail</p><p className="text-xs text-slate-400">Relatório de leads e conversões do dia</p></div>
          <Toggle checked={notifEmail} onChange={setNotifEmail} />
        </div>
      </div>

      <button onClick={salvar} disabled={salvandoPerfil} className={`flex items-center gap-2 px-5 ${salvo ? "rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium py-2.5" : ui.btnPrimary} disabled:opacity-50`}>
        {salvandoPerfil ? "Salvando..." : salvo ? <><Check className="h-4 w-4" /> Alterações salvas</> : "Salvar alterações"}
      </button>
    </div>
  );
}

/* ============================================================================
   APP ROOT
============================================================================ */

const SESSAO_KEY = "receivly_sessao";

export default function ReceivlyApp() {
  const [booting, setBooting] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [selectedLead, setSelectedLead] = useState(null);
  const [resumoPainel, setResumoPainel] = useState(null);

  // ---- Loading/transição entre telas ----
  const [screenLoading, setScreenLoading] = useState(false);
  const [visibleScreen, setVisibleScreen] = useState("dashboard");
  const transitionTimer = useRef(null);

  function navegarPara(novaTela) {
    if (novaTela === screen) return;
    setScreen(novaTela);
    setScreenLoading(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    // Pequeno atraso proposital: dá tempo do skeleton aparecer e evita a tela "piscar".
    transitionTimer.current = setTimeout(() => {
      setVisibleScreen(novaTela);
      setScreenLoading(false);
    }, 420);
  }

  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); }, []);

  useEffect(() => {
    const raw = localStorage.getItem(SESSAO_KEY);
    if (!raw) {
      setBooting(false);
      return;
    }
    try {
      const { token: t } = JSON.parse(raw);
      fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((u) => {
          setToken(t);
          setUser({ nome: u.nome, email: u.email, perfil: u.perfil, eh_admin: u.eh_admin });
          setIsAuthenticated(true);
        })
        .catch(() => localStorage.removeItem(SESSAO_KEY))
        .finally(() => setBooting(false));
    } catch {
      localStorage.removeItem(SESSAO_KEY);
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/dashboard/resumo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setResumoPainel)
      .catch(() => setResumoPainel(null));
  }, [token, visibleScreen]);

  const unread = resumoPainel?.conversas_aguardando_corretor ?? 0;
  const notificacoes = resumoPainel?.atividade ?? [];
  const { plano, carregando: carregandoPlano, recarregar: recarregarPlano } = usePlano(token);

  function handleNotificacaoClick(a) {
    if (a.tipo === "whatsapp") navegarPara("whatsapp");
    else if (a.tipo === "avaliacao") navegarPara("avaliacoes");
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={(u) => {
          setUser({ nome: u.nome, email: u.email, perfil: u.perfil, eh_admin: u.eh_admin });
          setToken(u.token);
          setIsAuthenticated(true);
          localStorage.setItem(SESSAO_KEY, JSON.stringify({ token: u.token }));
        }}
      />
    );
  }

  function logout() {
    setIsAuthenticated(false);
    setToken(null);
    setUser(null);
    localStorage.removeItem(SESSAO_KEY);
  }

  return (
    <div className={`${ui.page} flex`}>
      <TopProgressBar active={screenLoading} />
      <Sidebar screen={screen} onNavigate={navegarPara} unread={unread} user={user} onLogout={logout} plano={plano} carregandoPlano={carregandoPlano} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          screen={screen}
          user={user}
          onLogout={logout}
          notificacoes={notificacoes}
          naoLidas={unread}
          onNotificacaoClick={handleNotificacaoClick}
        />

        <main className="flex-1 min-w-0">
          {screenLoading ? (
            <ScreenSkeleton />
          ) : (
            <div key={visibleScreen} className="animate-in fade-in duration-200">
          {visibleScreen === "dashboard" && (
            <DashboardScreen token={token} user={user} onSelectLead={(l) => setSelectedLead(l)} onNavigate={navegarPara} plano={plano} onAssinar={() => navegarPara("assinatura")} />
          )}
          {visibleScreen === "whatsapp" && <WhatsAppScreen token={token} />}
          {visibleScreen === "anuncios" && <AnunciosScreen token={token} />}
          {visibleScreen === "avaliacoes" && <AvaliacaoModuleScreen token={token} user={user} onIrAssinatura={() => navegarPara("assinatura")} />}
          {visibleScreen === "fotos" && <FotoToursScreen token={token} plano={plano} onIrAssinatura={() => navegarPara("assinatura")} onPlanoAtualizado={recarregarPlano} />}
          {visibleScreen === "assinatura" && <AssinaturaScreen token={token} />}
          {visibleScreen === "configuracoes" && (
            <ConfiguracoesScreen token={token} user={user} onPerfilAtualizado={(p) => setUser((u) => ({ ...u, nome: p.nome, titulo_profissional: p.titulo_profissional }))} />
          )}
            </div>
          )}
        </main>
      </div>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}