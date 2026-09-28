import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutGrid, MessageCircle, Video, Settings, Search, Bell, ChevronDown,
  Eye, EyeOff, LogOut, X, ArrowRight, Check, Copy, Upload, Image as ImageIcon,
  Play, Pause, Download, Share2, Sparkles, TrendingUp, Clock, Phone, MapPin,
  Home as HomeIcon, FileText, ShieldCheck, User, Users, Send, Bot, ArrowLeft,
  Trash2, ChevronRight, Star, Building2, AlertTriangle, Loader2, BadgeCheck,
  SlidersHorizontal, Camera, Globe, MessageSquare, Volume2, LayoutList,
  DollarSign, BedDouble, Car, PenLine, Calculator, ImagePlus, Plus,
  ChevronUp, Printer, MapPinned, FolderSearch, Layers
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
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-blue-900/30">R</div>
      <div className="leading-tight">
        <p className="text-white text-sm font-semibold">Receivly</p>
        <p className="text-[10px] text-gray-500 tracking-wide">PAINEL IMOBILIÁRIA</p>
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
      <div className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600" style={{ width: "40%", animation: "receivly-loadingbar 0.6s ease-in-out infinite" }} />
      <style>{`
        @keyframes receivly-loadingbar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

function ScreenSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 h-24">
            <div className="h-2.5 w-20 rounded bg-gray-100 mb-4" />
            <div className="h-5 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="h-3 w-40 rounded bg-gray-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-50" />
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
                      className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors" />
                    <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">Seu nome</label>
                  </div>
                  <div className="relative">
                    <input value={imobiliaria} onChange={(e) => setImobiliaria(e.target.value)} required placeholder=" "
                      className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors" />
                    <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">Nome da imobiliária</label>
                  </div>
                </>
              )}

              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder=" "
                  className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors" />
                <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">E-mail</label>
                {/(.+)@(.+)\.(.+)/.test(email) && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>

              {mode !== "recuperar" && (
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder=" "
                    className="peer w-full rounded-lg border border-gray-300 px-3.5 pt-5 pb-2 pr-10 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors" />
                  <label className="absolute left-3.5 top-2 text-[11px] text-gray-500">Senha</label>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {mode === "login" && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("recuperar")} className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-medium py-2.5 transition-all duration-150 shadow-sm shadow-blue-900/10 hover:shadow-md active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed">
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
                <button onClick={() => setMode("cadastro")} className="text-blue-600 font-medium hover:text-blue-700 cursor-pointer">Criar conta da imobiliária</button>
              </>
            )}
            {mode === "cadastro" && (
              <>Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-blue-600 font-medium hover:text-blue-700 cursor-pointer">Entrar</button>
              </>
            )}
            {mode === "recuperar" && (
              <button onClick={() => { setMode("login"); setRecuperado(false); }} className="text-blue-600 font-medium hover:text-blue-700 cursor-pointer">Voltar para o login</button>
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
  { id: "avaliacoes", label: "Avaliações Imobiliárias", icon: Calculator, tag: "beta" },
  { id: "videos", label: "Video Tours", icon: Video },
];
const NAV_CONTA = [{ id: "configuracoes", label: "Configurações", icon: Settings }];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button onClick={() => onClick(item.id)}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-white/[0.06] text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
      } cursor-pointer`}>
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
    <aside className="hidden md:flex md:w-60 shrink-0 bg-[#0B0D14] flex-col border-r border-white/5 h-screen sticky top-0 print:hidden">
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
        <button onClick={onLogout} className="w-full mt-3 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-white/[0.03] transition-colors cursor-pointer">
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
  avaliacoes: ["PAINEL", "PRODUTOS", "Avaliações Imobiliárias"],
  videos: ["PAINEL", "PRODUTOS", "Video Tours"],
  configuracoes: ["PAINEL", "CONTA", "Configurações"],
};

function Header({ screen, user, onLogout, search, setSearch }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [bc0, bc1, title] = BREADCRUMBS[screen] || ["PAINEL", "", ""];

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 print:hidden">
      <div>
        <p className="text-[11px] font-medium text-gray-400 tracking-wide">{bc0} · {bc1}</p>
        <h1 className="text-xl font-semibold text-gray-900 mt-0.5">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 w-56 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar leads..."
            className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full" />
        </div>

        <div className="relative">
          <button onClick={() => { setShowNotif((v) => !v); setShowUser(false); }}
            className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer">
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
          <button onClick={() => { setShowUser((v) => !v); setShowNotif(false); }} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
              {user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user.nome}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {showUser && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5">
              <p className="px-2.5 py-2 text-xs text-gray-400 truncate">{user.email}</p>
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all duration-200">
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
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">Ver todos <ChevronRight className="h-3.5 w-3.5" /></button>
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
              <tr key={lead.id} onClick={() => onSelect(lead)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
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
      <div className="absolute inset-0 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-blue-50 text-blue-700 font-semibold flex items-center justify-center">{lead.avatar}</div>
            <div>
              <p className="font-semibold text-gray-900">{lead.nome}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.telefone}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
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
          <button className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 transition-colors cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]">Assumir conversa</button>
          <button className="rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 transition-colors cursor-pointer">Encaminhar</button>
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
          <button className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer">Ver todos</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, cor: "text-red-600", bg: "bg-red-50", nome: "Analisador Jurídico", desc: "Analisa a matrícula e os documentos dos vendedores e aponta dívidas, processos e outros riscos do imóvel.", stat: "1 risco alto", statCor: "text-red-500", rodape: "Análises ilimitadas" },
            { icon: MessageCircle, cor: "text-blue-600", bg: "bg-blue-50", nome: "IA para WhatsApp", desc: "Conversa, extrai os dados do lead automaticamente e chama o corretor certo na hora certa.", stat: "3 na fila", statCor: "text-amber-500", rodape: "3 números conectados" },
            { icon: PenLine, cor: "text-amber-600", bg: "bg-amber-50", nome: "IA para Anúncios", desc: "Gera textos prontos para portal imobiliário, Instagram e WhatsApp a partir das características do imóvel.", stat: "novo", statCor: "text-amber-500", rodape: "4 tons de voz disponíveis" },
            { icon: Video, cor: "text-violet-600", bg: "bg-violet-50", nome: "Video Tours", desc: "Transforme fotos do imóvel em vídeos verticais prontos para anúncios e redes sociais.", stat: "2 processando", statCor: "text-blue-500", rodape: "9 vídeos este mês" },
          ].map((p, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200">
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 hover:shadow-sm transition-shadow" style={{ borderLeftColor: lead.score_ia < 50 ? "#ef4444" : lead.score_ia < 80 ? "#f59e0b" : "#10b981" }}>
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
        <button onClick={() => onAssumir(conversa.id)} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 mt-1 transition-colors cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]">Abrir conversa →</button>
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
            <button onClick={onVoltar} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4" /></button>
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
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 transition-all" />
          <button onClick={enviarComoCorretorAsync} disabled={conversa.ia_ativa || enviando} className="h-10 w-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]">
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
          className={`w-full rounded-lg text-sm font-medium py-2.5 transition-colors ${conversa.ia_ativa ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"} cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]`}>
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
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">Simular novo lead</p>
          <button onClick={onClose} disabled={enviando} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Sem número de WhatsApp real conectado ainda — isso simula a primeira mensagem de um cliente novo, pra testar o fluxo completo.</p>

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nome do lead</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Luiza Faria"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors mb-3 transition-colors" />

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Telefone (só pra identificar a conversa)</label>
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex: 31999990000"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors mb-3 transition-colors" />

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Primeira mensagem</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors resize-none mb-4 transition-colors" />

        <button onClick={() => onEnviar({ nome, telefone, texto })} disabled={!nome || !telefone || !texto || enviando}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]">
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
            <button onClick={() => setModalAberto(true)} className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3.5 py-2.5 transition-colors cursor-pointer">
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
                  <div key={c.id} onClick={() => setChatAbertoId(c.id)} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
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
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors resize-none transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Tipo de imóvel</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors bg-white cursor-pointer">
              {["Apartamento", "Casa", "Cobertura", "Studio", "Terreno"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Bairro</label>
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Preço</label>
            <input value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors transition-colors" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1"><BedDouble className="h-3 w-3" /> Suítes</label>
            <input type="number" min={0} value={suites} onChange={(e) => setSuites(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors transition-colors" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1"><Car className="h-3 w-3" /> Vagas</label>
            <input type="number" min={0} value={vagas} onChange={(e) => setVagas(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-2.5 flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Tom de voz da IA</label>
          <input type="range" min={0} max={3} step={1} value={tomIdx} onChange={(e) => setTomIdx(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            {TONS_VOZ.map((t, i) => <span key={t} className={i === tomIdx ? "text-blue-600 font-semibold" : ""}>{t}</span>)}
          </div>
        </div>

        <button onClick={gerar} disabled={gerando}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-medium py-2.5 transition-all shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed">
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
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-colors ${aba === a.id ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"} cursor-pointer`}>
                  <a.icon className="h-3.5 w-3.5" /> {a.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{resultado[aba]}</pre>
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
            className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors py-8 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 cursor-pointer">
            <Upload className="h-6 w-6" />
            <p className="text-sm font-medium">Arraste as fotos aqui</p>
            <p className="text-xs">ou clique para simular o upload</p>
          </button>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
            {fotos.map((f) => (
              <div key={f.id} className="relative group aspect-square rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                <ImageIcon className="h-6 w-6 text-gray-300" />
                <button onClick={() => removerFoto(f.id)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
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
            <button onClick={() => setFormato("9:16")} className={`rounded-lg border p-3 text-left transition-colors ${formato === "9:16" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"} cursor-pointer`}>
              <div className="h-10 w-6 rounded bg-gray-300 mb-2" />
              <p className="text-xs font-medium text-gray-800">9:16 Vertical</p>
              <p className="text-[10px] text-gray-400">Reels / TikTok</p>
            </button>
            <button onClick={() => setFormato("16:9")} className={`rounded-lg border p-3 text-left transition-colors ${formato === "16:9" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"} cursor-pointer`}>
              <div className="h-6 w-10 rounded bg-gray-300 mb-2" />
              <p className="text-xs font-medium text-gray-800">16:9 Horizontal</p>
              <p className="text-[10px] text-gray-400">Portais / YouTube</p>
            </button>
          </div>

          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Trilha sonora</p>
          <select value={trilha} onChange={(e) => setTrilha(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors bg-white mb-4 cursor-pointer">
            {TRILHAS.map((t) => <option key={t}>{t}</option>)}
          </select>

          <button onClick={gerarVideo} disabled={gerando || fotos.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 transition-all shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed">
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
              <button onClick={() => setTocando((v) => !v)} className="relative z-10 h-12 w-12 rounded-full bg-white/90 flex items-center justify-center text-gray-900 hover:bg-white transition-colors cursor-pointer">
                {tocando ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <div className="absolute bottom-3 inset-x-3 h-1 rounded-full bg-white/20">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: tocando ? "45%" : "0%" }} />
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">Cobertura Savassi · {formato} · {trilha}</p>
            <div className="flex gap-3 mt-5">
              <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5 transition-colors cursor-pointer">
                <Download className="h-4 w-4" /> Baixar MP4
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 transition-colors cursor-pointer">
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
      <div className="absolute inset-0 bg-black/30 cursor-pointer" onClick={enviando ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-900">Nova análise jurídica</p>
          <button onClick={onClose} disabled={enviando} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nome ou referência do imóvel</label>
        <input value={nomeImovel} onChange={(e) => setNomeImovel(e.target.value)} placeholder="Ex: Cobertura Savassi"
          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors mb-4 transition-colors" />

        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Documento (PDF)</label>
        <label className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors py-6 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-blue-500">
          <Upload className="h-5 w-5" />
          <p className="text-xs font-medium">{arquivo ? arquivo.name : "Clique para escolher o PDF"}</p>
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
        </label>

        <button
          onClick={() => onEnviar({ nomeImovel, arquivo })}
          disabled={!arquivo || enviando}
          className="w-full mt-5 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]">
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
        <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 shrink-0 transition-colors cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]">
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
   AVALIAÇÕES IMOBILIÁRIAS (protótipo de validação — dados demonstrativos)
============================================================================ */

const AVALIACOES_MOCK = [
  { id: 1, tipo: "Apartamento", bairro: "Pampulha", endereco: "Rua dos Lírios, 240", cidade: "Belo Horizonte", data: "18/09/2026", status: "Em andamento", valor: null },
  { id: 2, tipo: "Casa", bairro: "Buritis", endereco: "Rua Tomé de Souza, 88", cidade: "Belo Horizonte", data: "12/09/2026", status: "Concluída", valor: "R$ 890.000" },
  { id: 3, tipo: "Apartamento", bairro: "Savassi", endereco: "Rua Pernambuco, 1120", cidade: "Belo Horizonte", data: "05/09/2026", status: "Concluída", valor: "R$ 1.150.000" },
  { id: 4, tipo: "Sala comercial", bairro: "Centro", endereco: "Av. Afonso Pena, 3400", cidade: "Belo Horizonte", data: "28/08/2026", status: "Concluída", valor: "R$ 420.000" },
];

const IMOVEL_INICIAL = {
  endereco: "Rua dos Lírios", numero: "240", complemento: "Apto 302", bairro: "Pampulha",
  cidade: "Belo Horizonte", estado: "MG", cep: "31270-000", tipo: "Apartamento",
  areaImovel: "120", areaTerreno: "", quartos: "3", banheiros: "2", vagas: "2",
  caracteristicas: "Sacada gourmet, armários planejados", observacoes: "",
};

const COMPARAVEIS_INICIAIS = [
  { id: 1, endereco: "Rua Tupinambás, 500", bairro: "Pampulha", cidade: "Belo Horizonte", area: 115, quartos: 3, banheiros: 2, vagas: 2, valor: 690000, fonte: "OLX", distancia: "0,4", observacoes: "Reformado recentemente" },
  { id: 2, endereco: "Av. Otacílio Negrão de Lima, 1200", bairro: "Pampulha", cidade: "Belo Horizonte", area: 120, quartos: 3, banheiros: 2, vagas: 2, valor: 720000, fonte: "Zap Imóveis", distancia: "0,7", observacoes: "Vista para a lagoa" },
  { id: 3, endereco: "Rua Eng. Amaro Lanari, 88", bairro: "Pampulha", cidade: "Belo Horizonte", area: 130, quartos: 3, banheiros: 2, vagas: 2, valor: 780000, fonte: "VivaReal", distancia: "1,1", observacoes: "" },
];

const PESQUISA_MOCK_RESULTADOS = [
  { id: 101, endereco: "Rua Almirante Tamandaré, 210", bairro: "Pampulha", area: 118, quartos: 3, vagas: 2, valor: 705000, fonte: "Zap Imóveis" },
  { id: 102, endereco: "Rua Conselheiro Lafaiete, 44", bairro: "Pampulha", area: 122, quartos: 3, vagas: 2, valor: 735000, fonte: "OLX" },
  { id: 103, endereco: "Av. Portugal, 900", bairro: "Pampulha", area: 128, quartos: 3, vagas: 2, valor: 765000, fonte: "VivaReal" },
];

const CATEGORIAS_FOTO = ["Fachada", "Sala", "Cozinha", "Quartos", "Banheiros", "Área externa", "Outros"];

function formatBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const campoInputClass = "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors transition-colors";

function Campo({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function calcularAjustes(comparavel, imovel) {
  // Método Comparativo Direto / Tratamento por Fatores (NBR 14.653). O Fator Área usa a
  // fórmula informada pela avaliadora (Abunahman). Local, Depreciação, Padrão e Testada
  // dependem do critério dela: seguem neutros (1,00) até serem configurados. Como na tabela
  // do laudo de referência, cada ajuste é calculado sobre o unitário base e somado a ele.
  const areaImovel = Number(imovel.areaImovel) || comparavel.area || 1;
  const areaComparavel = comparavel.area || areaImovel;
  const diffPercentual = Math.abs((areaComparavel - areaImovel) / areaImovel) * 100;
  const expoente = diffPercentual < 30 ? 1 / 4 : 1 / 8;
  const fatorArea = Math.pow(areaComparavel / areaImovel, expoente);

  const fatorLocal = 1;
  const fatorDepreciacao = 1;
  const fatorPadrao = 1;
  const fatorTestada = 1;

  const valorUnitarioBase = comparavel.valor / areaComparavel;
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

  return { fatorArea, fatorLocal, fatorDepreciacao, fatorPadrao, fatorTestada, ajustes, fatorTotal, valorUnitarioBase, valorUnitarioHomogeneizado, resultadoAjustado };
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
  return { bg: "bg-gray-100", text: "text-gray-500" };
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
              e.n === etapaAtual ? "bg-blue-600 text-white" : e.n < etapaAtual ? "text-blue-600 hover:bg-blue-50" : "text-gray-300 cursor-not-allowed"
            } cursor-pointer`}>
            <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] shrink-0 ${e.n === etapaAtual ? "bg-white/20" : e.n < etapaAtual ? "bg-blue-100" : "bg-gray-100"}`}>
              {e.n < etapaAtual ? <Check className="h-2.5 w-2.5" /> : e.n}
            </span>
            {e.label}
          </button>
          {i < etapas.length - 1 && <div className={`h-px w-3 shrink-0 ${e.n < etapaAtual ? "bg-blue-200" : "bg-gray-200"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function AvaliacoesScreen({ onNovaAvaliacao, onContinuar }) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Avaliações imobiliárias</p>
          <p className="text-xs text-gray-500 mt-1">Cadastre o imóvel, adicione comparáveis e deixe o Receivly ajudar nos cálculos e no relatório.</p>
        </div>
        <button onClick={onNovaAvaliacao} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 transition-colors cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]">
          <Calculator className="h-4 w-4" /> Nova avaliação
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="divide-y divide-gray-50">
          {AVALIACOES_MOCK.map((a) => {
            const s = statusAvaliacaoStyle(a.status);
            return (
              <div key={a.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0"><Building2 className="h-4.5 w-4.5" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{a.tipo} — {a.bairro}</p>
                    <p className="text-xs text-gray-400 truncate">{a.endereco}, {a.cidade} · {a.data}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>{a.status}</span>
                  <p className="text-sm font-medium text-gray-800 w-28 text-right">{a.valor || "—"}</p>
                  <button onClick={() => onContinuar(a)} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">Continuar <ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EtapaImovel({ imovel, setImovel, onProximo }) {
  function set(campo, valor) { setImovel((i) => ({ ...i, [campo]: valor })); }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Dados do imóvel</p>
          <p className="text-xs text-gray-500 mt-1">A localização é o ponto de partida da avaliação.</p>
        </div>
        <Campo label="Endereço (localização do imóvel)"><input value={imovel.endereco} onChange={(e) => set("endereco", e.target.value)} className={campoInputClass} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Número"><input value={imovel.numero} onChange={(e) => set("numero", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Complemento"><input value={imovel.complemento} onChange={(e) => set("complemento", e.target.value)} className={campoInputClass} /></Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Bairro"><input value={imovel.bairro} onChange={(e) => set("bairro", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Cidade"><input value={imovel.cidade} onChange={(e) => set("cidade", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Estado"><input value={imovel.estado} onChange={(e) => set("estado", e.target.value)} className={campoInputClass} /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="CEP"><input value={imovel.cep} onChange={(e) => set("cep", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Tipo do imóvel">
            <select value={imovel.tipo} onChange={(e) => set("tipo", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              {["Apartamento", "Casa", "Sala comercial", "Terreno", "Galpão"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Área do imóvel (m²)"><input value={imovel.areaImovel} onChange={(e) => set("areaImovel", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Área do terreno (m²) — quando aplicável"><input value={imovel.areaTerreno} onChange={(e) => set("areaTerreno", e.target.value)} className={campoInputClass} /></Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Quartos"><input value={imovel.quartos} onChange={(e) => set("quartos", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Banheiros"><input value={imovel.banheiros} onChange={(e) => set("banheiros", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Vagas de garagem"><input value={imovel.vagas} onChange={(e) => set("vagas", e.target.value)} className={campoInputClass} /></Campo>
        </div>
        <Campo label="Características adicionais"><input value={imovel.caracteristicas} onChange={(e) => set("caracteristicas", e.target.value)} className={campoInputClass} /></Campo>
        <Campo label="Observações"><textarea rows={3} value={imovel.observacoes} onChange={(e) => set("observacoes", e.target.value)} className={campoInputClass + " resize-none"} /></Campo>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">LOCALIZAÇÃO</p>
          <div className="relative h-48 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50 border border-gray-100">
            <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 200 150">
              {Array.from({ length: 8 }).map((_, i) => (<line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} stroke="#94a3b8" strokeWidth="0.5" />))}
              {Array.from({ length: 10 }).map((_, i) => (<line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="150" stroke="#94a3b8" strokeWidth="0.5" />))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <MapPinned className="h-8 w-8 text-blue-600 drop-shadow" />
                <span className="mt-1 text-[10px] font-medium text-gray-600 bg-white/80 rounded px-1.5 py-0.5">{imovel.bairro || "Bairro"}</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Representação visual — integração com mapas reais fica para uma próxima versão.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-400 mb-2">RESUMO</p>
          <p className="text-sm font-medium text-gray-800">{imovel.tipo} — {imovel.bairro}</p>
          <p className="text-xs text-gray-500 mt-1">{imovel.areaImovel} m² · {imovel.quartos} quartos · {imovel.vagas} vagas</p>
        </div>
      </div>

      <div className="xl:col-span-3 flex justify-end">
        <button onClick={onProximo} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 transition-colors cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]">
          Continuar para comparáveis <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ModalComparavel({ onClose, onSalvar }) {
  const [dados, setDados] = useState({ endereco: "", bairro: "", cidade: "", area: "", quartos: "", banheiros: "", vagas: "", valor: "", fonte: "", distancia: "", observacoes: "" });
  function set(c, v) { setDados((d) => ({ ...d, [c]: v })); }
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-900">Adicionar imóvel comparável</p>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
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
            <Campo label="Valor anunciado (R$)"><input value={dados.valor} onChange={(e) => set("valor", e.target.value)} className={campoInputClass} /></Campo>
            <Campo label="Fonte"><input value={dados.fonte} onChange={(e) => set("fonte", e.target.value)} placeholder="Ex: OLX, Zap..." className={campoInputClass} /></Campo>
          </div>
          <Campo label="Distância do imóvel avaliado (km)"><input value={dados.distancia} onChange={(e) => set("distancia", e.target.value)} placeholder="Ex: 0,5" className={campoInputClass} /></Campo>
          <Campo label="Observações"><textarea rows={2} value={dados.observacoes} onChange={(e) => set("observacoes", e.target.value)} className={campoInputClass + " resize-none"} /></Campo>
        </div>
        <button
          onClick={() => { onSalvar({ id: Date.now(), ...dados, area: Number(dados.area) || 0, valor: Number(dados.valor) || 0 }); onClose(); }}
          disabled={!dados.endereco || !dados.valor}
          className="w-full mt-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]">
          Adicionar comparável
        </button>
      </div>
    </div>
  );
}

function EtapaComparaveis({ imovel, comparaveis, setComparaveis, onVoltar, onProximo }) {
  const [modalAberto, setModalAberto] = useState(false);
  const areaBase = Number(imovel.areaImovel) || 0;
  const [criterios, setCriterios] = useState({
    tipo: imovel.tipo,
    areaMin: areaBase ? Math.round(areaBase * 0.8) : "",
    areaMax: areaBase ? Math.round(areaBase * 1.2) : "",
    raio: "2",
  });
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const stats = estatisticasComparaveis(comparaveis);

  function setCriterio(campo, valor) { setCriterios((c) => ({ ...c, [campo]: valor })); }

  function buscar() {
    setBuscando(true);
    setResultados(null);
    // Demonstração: na versão real, esta chamada consulta portais imobiliários automaticamente.
    setTimeout(() => {
      setResultados(PESQUISA_MOCK_RESULTADOS.map((r) => ({ ...r, bairro: imovel.bairro || r.bairro, cidade: imovel.cidade })));
      setBuscando(false);
    }, 1800);
  }

  function jaAdicionado(r) { return comparaveis.some((c) => c.origemId === r.id); }

  function adicionar(r) {
    if (jaAdicionado(r)) return;
    setComparaveis((c) => [...c, { id: Date.now() + r.id, origemId: r.id, endereco: r.endereco, bairro: r.bairro, cidade: r.cidade, area: r.area, quartos: r.quartos, banheiros: 2, vagas: r.vagas, valor: r.valor, fonte: r.fonte, distancia: "—", observacoes: "" }]);
  }

  function adicionarTodos() { (resultados || []).forEach(adicionar); }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0"><FolderSearch className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Buscar imóveis comparáveis</p>
            <p className="text-xs text-gray-500 mt-0.5">A busca parte da localização do imóvel avaliado. Ajuste os filtros se precisar.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white border border-gray-100 px-3.5 py-2.5 mb-4">
          <MapPinned className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-sm text-gray-700 truncate">{imovel.endereco}, {imovel.numero} — {imovel.bairro}, {imovel.cidade}/{imovel.estado}</p>
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

        <button onClick={buscar} disabled={buscando}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-80 text-white text-sm font-medium py-3 cursor-pointer disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md active:scale-[0.99]">
          {buscando ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando imóveis em portais imobiliários...</> : <><Search className="h-4 w-4" /> Buscar imóveis comparáveis</>}
        </button>

        {buscando && (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (<div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />))}
          </div>
        )}

        {resultados && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">{resultados.length} imóveis encontrados</p>
              <button onClick={adicionarTodos} className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer">+ Adicionar todos à avaliação</button>
            </div>
            <div className="space-y-2">
              {resultados.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.endereco}</p>
                    <p className="text-xs text-gray-400">{r.bairro} · {r.area} m² · {r.quartos} quartos · {r.vagas} vagas · {r.fonte}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-gray-800">{formatBRL(r.valor)}</p>
                    {jaAdicionado(r) ? (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 whitespace-nowrap"><Check className="h-3.5 w-3.5" /> Adicionado</span>
                    ) : (
                      <button onClick={() => adicionar(r)} className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap cursor-pointer">+ Adicionar à avaliação</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
              Resultados de exemplo (demonstração). Na versão real, esta busca consulta portais imobiliários automaticamente a partir da localização.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Comparáveis desta avaliação</p>
            <p className="text-xs text-gray-500 mt-1">Imóveis selecionados como referência. Você também pode adicionar um manualmente.</p>
          </div>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3.5 py-2.5 cursor-pointer transition-colors">
            <Plus className="h-3.5 w-3.5" /> Adicionar manualmente
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-[11px] text-gray-400">Comparáveis encontrados</p><p className="text-lg font-semibold text-gray-900">{stats.quantidade}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-[11px] text-gray-400">Faixa de valores</p><p className="text-sm font-semibold text-gray-900">{formatBRL(stats.min)} — {formatBRL(stats.max)}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-[11px] text-gray-400">Valor médio/m²</p><p className="text-sm font-semibold text-gray-900">{formatBRL(stats.mediaM2)}</p></div>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2">Valores demonstrativos — não representam uma metodologia de avaliação validada.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
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
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3"><p className="font-medium text-gray-800">{c.endereco}</p><p className="text-[11px] text-gray-400">{c.bairro}, {c.cidade}</p></td>
                  <td className="px-5 py-3 text-gray-600">{c.area} m²</td>
                  <td className="px-5 py-3 text-gray-600">{c.quartos}q · {c.vagas}v</td>
                  <td className="px-5 py-3 text-gray-800 font-medium">{formatBRL(c.valor)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatBRL(c.valor / c.area)}</td>
                  <td className="px-5 py-3 text-gray-500">{c.fonte}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => setComparaveis((cs) => cs.filter((x) => x.id !== c.id))} className="text-gray-300 hover:text-red-500 cursor-pointer"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {comparaveis.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Nenhum comparável adicionado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} disabled={comparaveis.length === 0} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 cursor-pointer disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md active:scale-[0.99]">
          Continuar para cálculos <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {modalAberto && <ModalComparavel onClose={() => setModalAberto(false)} onSalvar={(novo) => setComparaveis((c) => [...c, novo])} />}
    </div>
  );
}

function FatorLinha({ nome, valor, definido }) {
  return (
    <div className="flex justify-between items-center">
      <span>{nome}</span>
      <span className={definido ? "text-gray-700 font-medium" : "text-gray-400 italic"}>
        {valor.toFixed(3)}{!definido && " · a definir"}
      </span>
    </div>
  );
}

function EtapaCalculos({ imovel, comparaveis, onVoltar, onProximo }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800">Método Comparativo Direto de Dados — Tratamento por Fatores (NBR 14.653)</p>
          <p className="text-xs text-amber-700 mt-1">
            O <strong>Fator Área</strong> já usa a fórmula real informada pela avaliadora. Os fatores <strong>Local, Depreciação, Padrão</strong> e <strong>Testada</strong> dependem do critério técnico dela — por enquanto ficam neutros (1,000) até serem validados e configurados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {comparaveis.map((c, i) => {
          const r = calcularAjustes(c, imovel);
          return (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-400 mb-1">COMPARÁVEL {String(i + 1).padStart(2, "0")}</p>
              <p className="text-sm font-medium text-gray-800 truncate">{c.endereco}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><p className="text-gray-400">Valor</p><p className="font-medium text-gray-800">{formatBRL(c.valor)}</p></div>
                <div><p className="text-gray-400">Área</p><p className="font-medium text-gray-800">{c.area} m²</p></div>
                <div><p className="text-gray-400">Unitário base</p><p className="font-medium text-gray-800">{formatBRL(r.valorUnitarioBase)}/m²</p></div>
                <div><p className="text-gray-400">Fator total</p><p className="font-medium text-gray-800">{r.fatorTotal.toFixed(3)}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                <FatorLinha nome="Fator Local" valor={r.fatorLocal} definido={false} />
                <FatorLinha nome="Fator Área" valor={r.fatorArea} definido={true} />
                <FatorLinha nome="Fator Depreciação" valor={r.fatorDepreciacao} definido={false} />
                <FatorLinha nome="Fator Padrão" valor={r.fatorPadrao} definido={false} />
                <FatorLinha nome="Fator Testada" valor={r.fatorTestada} definido={false} />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-baseline">
                <span className="text-xs text-gray-400">Unitário homogeneizado</span>
                <span className="text-xs font-medium text-gray-700">{formatBRL(r.valorUnitarioHomogeneizado)}/m²</span>
              </div>
              <div className="mt-1.5 flex justify-between items-baseline">
                <span className="text-xs text-gray-400">Resultado ajustado</span>
                <span className="text-sm font-semibold text-gray-900">{formatBRL(r.resultadoAjustado)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 cursor-pointer transition-colors shadow-sm hover:shadow-md active:scale-[0.99]">Continuar para fotos <ArrowRight className="h-4 w-4" /></button>
      </div>
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

function EtapaFotos({ fotos, setFotos, onVoltar, onProximo }) {
  const [processando, setProcessando] = useState(false);
  const inputRef = useRef(null);

  function adicionarArquivos(fileList) {
    const arquivos = Array.from(fileList);
    const novasFotos = arquivos.map((file, i) => ({
      id: Date.now() + i, nome: file.name, tamanhoOriginal: file.size, tamanhoOtimizado: null,
      categoria: "Outros", urlOriginal: URL.createObjectURL(file), urlOtimizada: null, file,
    }));
    setFotos((f) => [...f, ...novasFotos]);
  }

  async function otimizarTodas() {
    setProcessando(true);
    const pendentes = fotos.filter((f) => !f.tamanhoOtimizado);
    for (const foto of pendentes) {
      const { url, tamanhoOtimizado } = await comprimirImagem(foto.file);
      setFotos((fs) => fs.map((f) => (f.id === foto.id ? { ...f, urlOtimizada: url, tamanhoOtimizado } : f)));
    }
    setProcessando(false);
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
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Fotografias</p>
        <p className="text-xs text-gray-500 mb-4">Arraste, organize e otimize as fotos do imóvel avaliado.</p>

        <div onDrop={(e) => { e.preventDefault(); adicionarArquivos(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors py-10 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 cursor-pointer">
          <ImagePlus className="h-7 w-7" />
          <p className="text-sm font-medium">Arraste suas fotografias aqui</p>
          <p className="text-xs">ou clique para selecionar</p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => adicionarArquivos(e.target.files)} />
        </div>

        {fotos.length > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <p className="text-xs text-gray-400">{fotos.length} foto(s) · {fotos.filter((f) => f.tamanhoOtimizado).length} otimizada(s)</p>
            <div className="flex gap-2">
              <button onClick={organizarAutomaticamente} className="flex items-center gap-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-2 transition-colors cursor-pointer"><Layers className="h-3.5 w-3.5" /> Organizar automaticamente</button>
              <button onClick={otimizarTodas} disabled={processando} className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-2 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]">
                {processando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Otimizando...</> : <>Otimizar fotografias</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {fotos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {fotos.map((foto, i) => (
            <div key={foto.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-sm transition-shadow">
              <div className="relative aspect-video bg-gray-100">
                <img src={foto.urlOtimizada || foto.urlOriginal} alt={foto.nome} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => mover(foto.id, -1)} className="h-6 w-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => mover(foto.id, 1)} className="h-6 w-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setFotos((fs) => fs.filter((f) => f.id !== foto.id))} className="h-6 w-6 rounded bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/50 text-white rounded px-1.5 py-0.5">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-800 truncate">{foto.nome}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <select value={foto.categoria} onChange={(e) => setFotos((fs) => fs.map((f) => (f.id === foto.id ? { ...f, categoria: e.target.value } : f)))} className="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white cursor-pointer">
                    {CATEGORIAS_FOTO.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-400">{formatKB(foto.tamanhoOriginal)}{foto.tamanhoOtimizado && <> → <span className="text-emerald-600 font-medium">{formatKB(foto.tamanhoOtimizado)}</span></>}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 transition-colors cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 transition-colors cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]">Continuar para resultado <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function EtapaResultado({ imovel, comparaveis, onVoltar, onProximo }) {
  const resultados = comparaveis.map((c) => calcularAjustes(c, imovel).resultadoAjustado);
  const valorEstimado = calcularLaudo(imovel, comparaveis).valorCalculado;
  const min = resultados.length ? Math.min(...resultados) : 0;
  const max = resultados.length ? Math.max(...resultados) : 0;
  const areaImovel = Number(imovel.areaImovel) || 1;
  const valorM2 = valorEstimado / areaImovel;
  const posicaoFaixa = max > min ? ((valorEstimado - min) / (max - min)) * 100 : 50;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-xs font-semibold text-gray-400 mb-1">IMÓVEL AVALIADO</p>
        <p className="text-lg font-semibold text-gray-900 mb-6">{imovel.tipo} — {imovel.bairro}</p>

        <div className="text-center py-6 border-y border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Valor estimado</p>
          <p className="text-4xl font-semibold text-gray-900">{formatBRL(valorEstimado)}</p>
          <p className="text-xs text-gray-400 mt-2">Faixa estimada: {formatBRL(min)} — {formatBRL(max)}</p>
        </div>

        <div className="mt-6">
          <div className="relative h-2 rounded-full bg-gradient-to-r from-gray-200 via-blue-200 to-gray-200">
            <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow" style={{ left: `calc(${posicaoFaixa}% - 8px)` }} />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1.5"><span>{formatBRL(min)}</span><span>{formatBRL(max)}</span></div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="rounded-lg bg-gray-50 p-3 text-center"><p className="text-[11px] text-gray-400">Comparáveis</p><p className="text-lg font-semibold text-gray-900">{comparaveis.length}</p></div>
          <div className="rounded-lg bg-gray-50 p-3 text-center"><p className="text-[11px] text-gray-400">Área</p><p className="text-lg font-semibold text-gray-900">{imovel.areaImovel} m²</p></div>
          <div className="rounded-lg bg-gray-50 p-3 text-center"><p className="text-[11px] text-gray-400">Valor médio/m²</p><p className="text-lg font-semibold text-gray-900">{formatBRL(valorM2)}</p></div>
        </div>

        <p className="text-[11px] text-gray-400 mt-4 text-center">Valores demonstrativos, calculados apenas para fins deste protótipo — não representam um laudo técnico validado.</p>
      </div>

      <div className="flex justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <button onClick={onProximo} className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 cursor-pointer transition-colors shadow-sm hover:shadow-md active:scale-[0.99]">Ver relatório <ArrowRight className="h-4 w-4" /></button>
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
  const areaImovel = Number(imovel.areaImovel) || 0;
  const linhas = comparaveis.map((c, i) => {
    const r = calcularAjustes(c, imovel);
    return {
      n: i + 1,
      c,
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
  linhas.forEach((l) => { l.saneado = l.homogeneizado >= limiteInf && l.homogeneizado <= limiteSup; });

  const saneados = linhas.filter((l) => l.saneado).map((l) => l.homogeneizado);
  const n = saneados.length;
  const mediaSaneada = mediaSimples(saneados);
  const desvio = desvioPadraoAmostral(saneados);
  const coefVariacao = mediaSaneada ? desvio / mediaSaneada : 0;
  const t = Number(tStudent80(n - 1).toFixed(2));
  const meiaLargura = n > 1 ? (t * desvio) / Math.sqrt(n - 1) : 0;
  const maximo = mediaSaneada + meiaLargura;
  const minimo = mediaSaneada - meiaLargura;
  const intervalo = mediaSaneada ? ((maximo - minimo) / mediaSaneada) * 100 : 0;

  return {
    linhas,
    areaImovel,
    mediaSeca,
    mediaHomog,
    limiteSup,
    limiteInf,
    saneamento: { n, mediaSaneada, desvio, coefVariacao, t, maximo, minimo, intervalo },
    unitarioFinal: mediaSaneada,
    valorCalculado: mediaSaneada * areaImovel * 1.0,
  };
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

function aplicarVariaveis(texto, vars) {
  return (texto || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
}

function grauFundamentacao(p) {
  const total = p[1] + p[2] + p[3] + p[4];
  if (total >= 10 && p[2] >= 3 && p[4] >= 3 && p[1] >= 2 && p[3] >= 2) return { total, grau: "III" };
  if (total >= 6 && p[2] >= 2 && p[4] >= 2 && p[1] >= 1 && p[3] >= 1) return { total, grau: "II" };
  if (total >= 4 && p[1] >= 1 && p[2] >= 1 && p[3] >= 1 && p[4] >= 1) return { total, grau: "I" };
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
// <<PURE-END>>

const DEFAULT_TEXTOS = {
  introducao: `O presente Laudo Técnico de Avaliação Mercadológica de Imóvel Urbano tem por finalidade atender à solicitação de {{solicitante}}, com o objetivo de {{objetivo}} do {{imovel}}.

O laudo é assinado por {{perita}}, {{creci}}, {{cnai}}, habilitada conforme a Resolução COFECI n.º 1066/2007 e o Ato Normativo COFECI n.º 001/2011 para emitir Parecer Técnico de Avaliação Mercadológica.

Entende-se por “PTAM - Parecer Técnico de Avaliação Mercadológica” o documento no qual é apresentada, com base em critérios técnicos, uma análise de mercado com vistas à determinação do valor de comercialização de um imóvel, judicial ou extrajudicialmente, observando-se o disposto na Resolução COFECI n.º 1.066/07, que está em consonância com a NBR 14.653 e recomendações de associações de classe como o IBAPE - Instituto Brasileiro de Avaliações e Perícias de Engenharia.`,

  premissas: `As análises, opiniões e conclusões expressas no presente trabalho são baseadas em dados, diligências, vistorias e levantamentos realizados pela perita avaliadora em todos os locais, região e cidade em que se situa o imóvel avaliando.

Considerou-se que a certidão da matrícula do imóvel, títulos, documentos, informações, pesquisas e consultas são verdadeiras, estão corretas, não tendo sido efetuadas investigações em relação a defeitos ou irregularidades nos mesmos, não assumindo o perito responsabilidades sobre a matéria legal que não sejam as implícitas ao exercício de suas funções, estabelecidas em códigos, leis e regulamentos.

A determinação do {{valorTipo}} do imóvel não tem vinculação, relação, limitação e expectativas em relação aos honorários arbitrados pela perita para elaboração deste laudo.

Finalmente, declaro peremptoriamente que não tenho no presente, nem contemplo para o futuro, interesse algum no bem avaliado, e não há qualquer outra circunstância relevante que caracterize conflito de interesses.

Determino também que os resultados, em especial o {{valorTipo}} e comentários, são considerados sigilosos, sendo que as informações ou cópias somente serão fornecidas com expressa autorização do solicitante.`,

  resultados: `Esta análise visa condensar de forma objetiva o trabalho executado enfocando o imóvel avaliando, na realidade do mercado imobiliário macrorregional em que o mesmo se encontra.

O {{valorTipo}} de um bem pressupõe uma situação em que as partes interessadas, conhecedoras das possibilidades de seu uso, encontrem-se na situação em que tanto o {{parteA}} quanto o {{parteB}} estejam interessados, porém não compelidos a concretizar {{negocio}}.`,

  documentacao: "",
  vistoria: "",
  adequacao: "",
  localizacao: "",
  mercadoAtual: "",
  perspectivas: "",

  valoresResultantes: `Os valores resultantes encontram-se dentro da média pesquisada, quando considerados todos os fatores que influenciam na sua formação.`,

  metodologia: `Para determinação do {{valorTipo}}, utilizou-se o Método Comparativo Direto de Dados. Tal método estabelece de forma direta um sistema de comparação com imóveis similares, através da coleta de dados em pesquisa junto a imobiliárias, profissionais especializados, proprietários, anúncios classificados, órgãos públicos e outros veículos que possam fornecer informações básicas e concretas dos imóveis ofertados ou vendidos recentemente.

A similaridade dos imóveis pesquisados é de fundamental importância para que tenhamos elementos que possam ser comparados de forma direta.

O processo comparativo, muito embora a pesquisa abranja imóveis similares em tamanho, padrão e local, requer uma melhoria no seu grau de precisão, obtida por outro processo auxiliar, denominado Homogeneização de Valores. Tal processo, recomendado por normas técnicas, visa corrigir as discrepâncias dos elementos comparativos, através de fatores cuja aplicação de um ou outro depende de cada caso. Assim, os fatores fundamentais, como: localização, atualização, fonte, padrão construtivo, idade e conservação, etc., são levados em conta para que os elementos sejam mais comparáveis, não obstante a similaridade já pré-selecionada na pesquisa.

Para melhorar ainda mais a precisão, após o processo de homogeneização, a média obtida passa por processo de saneamento de valores que eventualmente situam-se muito distantes do seu valor médio, distorcendo o valor unitário. Em geral, utiliza-se um intervalo de confiança, eliminando-se os valores fora deste intervalo e recalculando-se a nova média (média saneada). Assim, o valor unitário obtido pode ser considerado como o real {{valorTipo}}.

Justificativa da metodologia: dentro da região de influência na qual se insere o imóvel foi possível identificar uma amostragem em tamanho suficiente para se obter um valor médio confiável. Tal fato nos levou à aplicação do método comparativo, com maior precisão para o caso em questão.`,

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

  encerramento: `O presente laudo técnico de avaliação é assinado pela perita que subscreve esta última.`,
};

const LAUDO_INICIAL = {
  solicitante: "Proprietário do imóvel",
  processo: "",
  finalidade: "venda",
  local: "Belo Horizonte",
  data: new Date().toISOString().slice(0, 10),
  perita: "Neli Aparecida Gabriel",
  creci: "CRECI/MG 33.245",
  cnai: "CNAI 35.468",
  valorAdotado: "",
  pontos: {},
  textos: DEFAULT_TEXTOS,
};

function Paragrafos({ texto, vars }) {
  const blocos = aplicarVariaveis(texto, vars).split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <>
      {blocos.map((p, i) => {
        const m = p.match(/^(Fator [^:]{1,30}):\s*([\s\S]*)$/);
        return (
          <p key={i} className="text-[13px] leading-relaxed text-gray-700 text-justify mb-3">
            {m ? <><strong className="text-gray-900">{m[1]}:</strong> {m[2]}</> : p}
          </p>
        );
      })}
    </>
  );
}

function LaudoPagina({ laudo, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-3xl mx-auto px-10 py-8 print:border-0 print:shadow-none print:rounded-none print:break-after-page">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200">
        <div>
          <p className="text-sm font-bold tracking-wide text-gray-900 uppercase">{laudo.perita}</p>
          <p className="text-[10px] tracking-widest text-gray-400">AVALIAÇÃO IMOBILIÁRIA</p>
        </div>
        <div className="h-1.5 w-24 bg-amber-400 rounded" />
      </div>
      {children}
      <div className="mt-8 pt-3 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between">
        <span>{laudo.creci} · {laudo.cnai}</span>
        <span>Gerado com Receivly</span>
      </div>
    </div>
  );
}

function Secao({ children }) {
  return <h3 className="text-sm font-bold text-gray-900 mt-6 mb-3 first:mt-0">{children}</h3>;
}
function SubSecao({ children }) {
  return <h4 className="text-[13px] font-bold text-gray-900 mt-4 mb-2">{children}</h4>;
}

function QuadroDados({ titulo, linhas }) {
  return (
    <div className="border border-gray-400 text-[11px] break-inside-avoid">
      <div className="bg-gray-200 text-center font-bold py-1 border-b border-gray-400">{titulo}</div>
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex border-b border-gray-200 last:border-0">
          <div className="w-1/2 text-right px-2 py-1 border-r border-gray-300">{rotulo}</div>
          <div className="w-1/2 text-center px-2 py-1">{valor}</div>
        </div>
      ))}
    </div>
  );
}

function FichaLinha({ rotulo, valor }) {
  return (
    <div className="flex border-b border-gray-200 last:border-0">
      <div className="w-40 shrink-0 px-2 py-1 text-gray-500 border-r border-gray-200">{rotulo}</div>
      <div className="px-2 py-1 text-gray-800">{valor}</div>
    </div>
  );
}

function CroquiAmostras({ n }) {
  const cx = 280;
  const cy = 130;
  const pontos = Array.from({ length: n }).map((_, i) => {
    const ang = (i / Math.max(n, 1)) * Math.PI * 2 + 0.6;
    const raio = 55 + (i % 3) * 25;
    return { x: cx + Math.cos(ang) * raio * 1.6, y: cy + Math.sin(ang) * raio, n: i + 1 };
  });
  return (
    <div className="border-2 border-black rounded overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50">
      <svg viewBox="0 0 560 260" className="w-full">
        {Array.from({ length: 14 }).map((_, i) => (<line key={"h" + i} x1="0" y1={i * 20} x2="560" y2={i * 20} stroke="#94a3b8" strokeWidth="0.4" opacity="0.5" />))}
        {Array.from({ length: 29 }).map((_, i) => (<line key={"v" + i} x1={i * 20} y1="0" x2={i * 20} y2="260" stroke="#94a3b8" strokeWidth="0.4" opacity="0.5" />))}
        <circle cx={cx} cy={cy} r="11" fill="#2563eb" />
        <text x={cx + 16} y={cy + 4} fontSize="11" fill="#1e3a8a" fontWeight="bold">Avaliando</text>
        {pontos.map((p) => (
          <g key={p.n}>
            <circle cx={p.x} cy={p.y} r="9" fill="#f59e0b" />
            <text x={p.x} y={p.y + 3.5} fontSize="10" textAnchor="middle" fill="#ffffff" fontWeight="bold">{p.n}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function GraficoUnitarios({ linhas, media, minimo, maximo }) {
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
          <rect x={pad.l + i * bw + bw * 0.2} y={y(l.homogeneizado)} width={bw * 0.6} height={H - pad.b - y(l.homogeneizado)} fill={l.saneado ? "#f59e0b" : "#d1d5db"} />
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

function EtapaRelatorio({ imovel, comparaveis, fotos, laudo, setLaudo, onVoltar }) {
  const [editando, setEditando] = useState(false);
  const ehLocacao = laudo.finalidade === "locacao";
  const calc = useMemo(() => calcularLaudo(imovel, comparaveis), [imovel, comparaveis]);
  const san = calc.saneamento;

  const valorArredondado = Math.round(calc.valorCalculado / 10) * 10;
  const valorFinal = laudo.valorAdotado ? Number(String(laudo.valorAdotado).replace(/\D/g, "")) : valorArredondado;
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
  const vars = {
    solicitante: laudo.solicitante || "[solicitante]",
    objetivo: ehLocacao ? "determinar o valor de locação mensal" : "determinar o valor de mercado",
    valorTipo: ehLocacao ? "valor de locação mensal" : "valor de mercado",
    parteA: ehLocacao ? "locatário" : "comprador",
    parteB: ehLocacao ? "locador" : "vendedor",
    negocio: ehLocacao ? "a locação" : "a venda",
    imovel: `imóvel (${(imovel.tipo || "").toLowerCase()}) situado em ${imovel.endereco}, nº ${imovel.numero}${complemento}, ${imovel.bairro}, ${imovel.cidade}/${imovel.estado}`,
    perita: laudo.perita,
    creci: laudo.creci,
    cnai: laudo.cnai,
  };

  const dataLonga = new Date(laudo.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const mesAno = new Date(laudo.data + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const fotoCapa = fotos.find((f) => f.categoria === "Fachada") || fotos[0];

  const setCampo = (campo, valor) => setLaudo((l) => ({ ...l, [campo]: valor }));
  const setTexto = (chave, valor) => setLaudo((l) => ({ ...l, textos: { ...l.textos, [chave]: valor } }));
  const setPonto = (item, valor) => setLaudo((l) => ({ ...l, pontos: { ...l.pontos, [item]: Number(valor) } }));

  // Função (e não componente) para não perder o foco do textarea a cada tecla.
  const bloco = (chave, placeholder, rows) => {
    const texto = laudo.textos[chave] || "";
    if (editando) {
      return (
        <textarea key={chave} value={texto} rows={rows || 6} onChange={(e) => setTexto(chave, e.target.value)}
          placeholder={placeholder || "Escreva aqui."}
          className="w-full rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors mb-3" />
      );
    }
    if (!texto.trim()) {
      return (
        <button key={chave} onClick={() => setEditando(true)}
          className="print:hidden w-full text-left text-xs italic text-amber-700 bg-amber-50 border border-dashed border-amber-200 rounded px-3 py-2 mb-3 cursor-pointer">
          {placeholder || "A preencher pela avaliadora."} (clique para escrever)
        </button>
      );
    }
    return <Paragrafos key={chave} texto={texto} vars={vars} />;
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
      <div className="rounded-xl border border-gray-200 bg-white p-5 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Laudo de avaliação</p>
            <p className="text-xs text-gray-500 mt-1">Prévia do laudo completo (seções A a O). Os textos-padrão são editáveis; tabelas, fatores e valores saem dos dados da avaliação.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditando((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg text-xs font-medium px-3.5 py-2.5 ${editando ? "bg-blue-600 text-white" : "border border-gray-200 hover:bg-gray-50 text-gray-700"} cursor-pointer transition-colors`}>
              <PenLine className="h-3.5 w-3.5" /> {editando ? "Concluir edição" : "Editar textos"}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium px-3.5 py-2.5 cursor-pointer transition-colors">
              <Printer className="h-3.5 w-3.5" /> Gerar PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Campo label="Solicitante"><input value={laudo.solicitante} onChange={(e) => setCampo("solicitante", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Processo (opcional)"><input value={laudo.processo} onChange={(e) => setCampo("processo", e.target.value)} placeholder="Ex: 5080104-13.2022.8.13.0024" className={campoInputClass} /></Campo>
          <Campo label="Finalidade do laudo">
            <select value={laudo.finalidade} onChange={(e) => setCampo("finalidade", e.target.value)} className={(campoInputClass + " bg-white") + " cursor-pointer"}>
              <option value="venda">Valor de mercado (venda)</option>
              <option value="locacao">Valor de locação mensal</option>
            </select>
          </Campo>
          <Campo label="Avaliadora"><input value={laudo.perita} onChange={(e) => setCampo("perita", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="CRECI"><input value={laudo.creci} onChange={(e) => setCampo("creci", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="CNAI"><input value={laudo.cnai} onChange={(e) => setCampo("cnai", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Local do laudo"><input value={laudo.local} onChange={(e) => setCampo("local", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label="Data"><input type="date" value={laudo.data} onChange={(e) => setCampo("data", e.target.value)} className={campoInputClass} /></Campo>
          <Campo label={`Valor adotado (calculado e arredondado: ${brl2(valorArredondado)})`}>
            <input value={laudo.valorAdotado} onChange={(e) => setCampo("valorAdotado", e.target.value)} placeholder="Deixe em branco para usar o calculado" className={campoInputClass} />
          </Campo>
        </div>

        {editando && (
          <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3">
            Modo edição: clique em qualquer texto para alterar. Marcadores como {"{{solicitante}}"}, {"{{imovel}}"} e {"{{valorTipo}}"} são preenchidos automaticamente com os dados da avaliação.
          </p>
        )}
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          Protótipo: os fatores Local, Depreciação, Padrão e Testada ainda estão neutros (1,000) e os pontos do grau de fundamentação são sugeridos, com ajuste manual. As contas de saneamento seguem as do laudo de referência.
        </p>
      </div>

      {/* Capa */}
      <LaudoPagina laudo={laudo}>
        <div className="text-center py-4">
          <h2 className="text-2xl font-light text-gray-900 leading-snug">LAUDO TÉCNICO DE AVALIAÇÃO<br />MERCADOLÓGICA DE IMÓVEL URBANO</h2>
          {fotoCapa && <img src={fotoCapa.urlOtimizada || fotoCapa.urlOriginal} alt="Imóvel avaliado" className="mx-auto mt-6 rounded border-4 border-black max-h-64 object-cover" />}
        </div>
        <div className="space-y-1.5 text-[13px] text-gray-800 mt-4">
          <p><strong>Solicitante:</strong> {laudo.solicitante}</p>
          {laudo.processo && <p><strong>Processo:</strong> n.º {laudo.processo}</p>}
          <p><strong>Imóvel:</strong> {imovel.tipo}</p>
          <p><strong>Endereço:</strong> {imovel.endereco}, n.º {imovel.numero}</p>
          {imovel.complemento && <p>Complemento: {imovel.complemento}</p>}
          <p>Bairro: {imovel.bairro} - Cidade: {imovel.cidade} - UF: {imovel.estado} - CEP: {imovel.cep}</p>
          <p className="pt-2"><strong>Finalidade do Laudo:</strong> {ehLocacao ? "Determinação do Valor de Locação Mensal" : "Determinação do Valor de Mercado"}</p>
        </div>
      </LaudoPagina>

      {/* Sumário */}
      <LaudoPagina laudo={laudo}>
        <h3 className="text-sm font-bold text-amber-500 mb-3">SUMÁRIO</h3>
        <div className="space-y-1">
          {sumario.map(([titulo, sub]) => (
            <p key={titulo} className={`text-[13px] ${sub ? "pl-5 italic text-gray-600" : "font-bold text-gray-900 uppercase"} border-b border-dotted border-gray-200 pb-0.5`}>{titulo}</p>
          ))}
        </div>
      </LaudoPagina>

      {/* A e B */}
      <LaudoPagina laudo={laudo}>
        <Secao>A. INTRODUÇÃO</Secao>
        {bloco("introducao", "Introdução", 10)}
        <Secao>B. PREMISSAS E RESSALVAS</Secao>
        {bloco("premissas", "Premissas e ressalvas", 12)}
      </LaudoPagina>

      {/* C e D */}
      <LaudoPagina laudo={laudo}>
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
        <SubSecao>D.2. VISTORIA</SubSecao>
        {bloco("vistoria", "Data da vistoria, presentes e principais características observadas", 5)}
        <SubSecao>D.3. ADEQUAÇÃO</SubSecao>
        {bloco("adequacao", "Adequação entre a documentação e a situação física constatada", 4)}
      </LaudoPagina>

      {/* E e F */}
      <LaudoPagina laudo={laudo}>
        <Secao>E. LOCALIZAÇÃO</Secao>
        {bloco("localizacao", `Descreva a localização (${imovel.bairro}, ${imovel.cidade}) e o entorno`, 5)}
        <Secao>F. COMENTÁRIOS MERCADOLÓGICOS</Secao>
        <SubSecao>F.1. MERCADO ATUAL</SubSecao>
        {bloco("mercadoAtual", "Comentários sobre o mercado atual", 5)}
        <SubSecao>F.2. PERSPECTIVAS FUTURAS</SubSecao>
        {bloco("perspectivas", "Perspectivas futuras do mercado", 5)}
        <SubSecao>F.3. VALORES RESULTANTES</SubSecao>
        {bloco("valoresResultantes", "Valores resultantes", 3)}
      </LaudoPagina>

      {/* G */}
      <LaudoPagina laudo={laudo}>
        <Secao>G. RELATÓRIO FOTOGRÁFICO</Secao>
        {fotos.length === 0 ? (
          <p className="text-xs italic text-gray-400 border border-dashed border-gray-200 rounded px-3 py-6 text-center">Nenhuma fotografia adicionada (etapa 4).</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {fotos.map((f, i) => (
              <figure key={f.id} className="break-inside-avoid">
                <img src={f.urlOtimizada || f.urlOriginal} alt={f.nome} className="w-full aspect-[4/3] object-cover border-2 border-black rounded" />
                <figcaption className="text-[11px] text-center text-gray-600 mt-1">Foto {String(i + 1).padStart(2, "0")} — {f.categoria}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </LaudoPagina>

      {/* H */}
      <LaudoPagina laudo={laudo}>
        <Secao>H. METODOLOGIA</Secao>
        <SubSecao>H.1. METODOLOGIA UTILIZADA</SubSecao>
        <p className="text-[13px] font-bold underline text-gray-900 mb-2">Método Comparativo Direto de Dados</p>
        {bloco("metodologia", "Metodologia utilizada", 16)}
        <SubSecao>H.2. HOMOGENEIZAÇÃO DE VALORES</SubSecao>
        {bloco("homogeneizacao", "Homogeneização de valores", 12)}
      </LaudoPagina>

      {/* I */}
      <LaudoPagina laudo={laudo}>
        <Secao>I. TRATAMENTO POR FATORES</Secao>
        {bloco("tratamento", "Tratamento por fatores", 22)}
      </LaudoPagina>

      {/* J */}
      <LaudoPagina laudo={laudo}>
        <Secao>J. LEVANTAMENTO DE PESQUISA</Secao>
        <SubSecao>J.1. CROQUI DAS AMOSTRAS</SubSecao>
        <CroquiAmostras n={calc.linhas.length} />
        <p className="text-[11px] text-center text-gray-500 mt-1 mb-4">Croqui de localização do avaliando e das amostras (representação ilustrativa)</p>
        <SubSecao>J.2. FICHAS DE PESQUISA</SubSecao>
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3">
          {calc.linhas.map((l) => (
            <div key={l.n} className="border border-gray-400 text-[11px] break-inside-avoid">
              <div className="flex justify-between border-b border-gray-300 px-2 py-1 bg-gray-50">
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
              <FichaLinha rotulo="Unitário" valor={`${brl2(l.base)} / m²${sufixoUnid}`} />
            </div>
          ))}
        </div>
        <p className="print:hidden text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mt-3">
          Campos usados nas fichas da avaliadora, como padrão construtivo, estado de conservação, idade aparente e testada, ainda não são coletados nesta versão.
        </p>
      </LaudoPagina>

      {/* K */}
      <LaudoPagina laudo={laudo}>
        <Secao>K. HOMOGENEIZAÇÃO</Secao>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border border-gray-300">
            <thead className="bg-gray-100">
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
                {["Local", "Área", "Depreciação", "Padrão", "Testada"].map((t) => (<th key={t} className="border border-gray-300 px-1 py-1">{t}</th>))}
              </tr>
            </thead>
            <tbody>
              {calc.linhas.map((l) => (
                <React.Fragment key={l.n}>
                  <tr className="italic text-gray-400">
                    <td className="border border-gray-200 px-1 py-0.5" colSpan={4}></td>
                    {["local", "area", "depreciacao", "padrao", "testada"].map((k) => (<td key={k} className="border border-gray-200 px-1 py-0.5 text-right">{fmt3(l.fatores[k])}</td>))}
                    <td className="border border-gray-200 px-1 py-0.5" colSpan={2}></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-1 py-1 text-center">{l.n}</td>
                    <td className="border border-gray-200 px-1 py-1 text-right">{fmt2(l.base)}</td>
                    <td className="border border-gray-200 px-1 py-1 text-right">1,00</td>
                    <td className="border border-gray-200 px-1 py-1 text-right">{fmt2(l.base)}</td>
                    {["local", "area", "depreciacao", "padrao", "testada"].map((k) => (<td key={k} className="border border-gray-200 px-1 py-1 text-right">{fmt2(l.ajustes[k])}</td>))}
                    <td className="border border-gray-200 px-1 py-1 text-right font-medium">{fmt2(l.homogeneizado)}</td>
                    <td className="border border-gray-200 px-1 py-1 text-right font-medium">{l.saneado ? fmt2(l.homogeneizado) : "excluído"}</td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="border border-gray-300 px-1 py-1">Média seca</td>
                <td className="border border-gray-300 px-1 py-1 text-right">{fmt2(calc.mediaSeca)}</td>
                <td className="border border-gray-300" colSpan={6}></td>
                <td className="border border-gray-300 px-1 py-1 text-right">Médias</td>
                <td className="border border-gray-300 px-1 py-1 text-right">{fmt2(calc.mediaHomog)}</td>
                <td className="border border-gray-300 px-1 py-1 text-right">{fmt2(san.mediaSaneada)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 mt-5">
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
            ["Coeficiente de variação", san.coefVariacao.toFixed(4).replace(".", ",")],
            ["t de Student", fmt2(san.t)],
            [`Máximo (R$/m²${sufixoUnid})`, fmt2(san.maximo)],
            [`Mínimo (R$/m²${sufixoUnid})`, fmt2(san.minimo)],
            ["Intervalo de confiabilidade", fmt2(san.intervalo) + "%"],
          ]} />
        </div>
      </LaudoPagina>

      {/* L e M */}
      <LaudoPagina laudo={laudo}>
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
        <p className="text-[12px] font-semibold text-gray-700 mb-1">Unitário homogeneizado por elemento × média saneada e limites</p>
        <GraficoUnitarios linhas={calc.linhas} media={san.mediaSaneada} minimo={san.minimo} maximo={san.maximo} />
        <p className="print:hidden text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mt-3">
          Os gráficos de resíduos relativos e de unitários observados × estimados do laudo de referência serão configurados junto com a avaliadora.
        </p>
      </LaudoPagina>

      {/* N */}
      <LaudoPagina laudo={laudo}>
        <Secao>N. ESPECIFICAÇÃO DA AVALIAÇÃO</Secao>
        {bloco("especificacao", "Especificação da avaliação", 8)}

        <div className="border border-gray-400 text-[11px] mb-4 break-inside-avoid">
          <div className="bg-black text-white font-bold px-2 py-1.5 text-center">Tabela 3 - Graus de fundamentação no caso de utilização do tratamento por fatores (ABNT NBR 14653-2:2011)</div>
          <div className="grid grid-cols-[32px_1fr_1.2fr_54px] font-bold border-b border-gray-300 bg-gray-50 text-center">
            <div className="py-1">Item</div><div className="py-1">Descrição</div><div className="py-1">Resultado</div><div className="py-1">Pontos</div>
          </div>
          {itensFund.map(([item, desc, res]) => (
            <div key={item} className="grid grid-cols-[32px_1fr_1.2fr_54px] border-b border-gray-200 items-center">
              <div className="py-2 text-center font-semibold">{item}</div>
              <div className="py-2 px-2">{desc}</div>
              <div className="py-2 px-2">{res}</div>
              <div className="py-2 text-center">
                <select value={pontos[item]} onChange={(e) => setPonto(item, e.target.value)} className="print:hidden border border-gray-300 rounded px-1 py-0.5 bg-white cursor-pointer">
                  {[0, 1, 2, 3].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <span className="hidden print:inline">{pontos[item]}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-end px-3 py-1.5 font-bold">Total: <span className="w-12 text-center">{fund.total}</span></div>
        </div>

        <div className="border border-gray-400 text-[11px] mb-4 break-inside-avoid">
          <div className="bg-black text-white font-bold px-2 py-1.5 text-center">Tabela 4 - Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização de tratamento por fatores</div>
          <div className="grid grid-cols-4 text-center border-b border-gray-200"><div className="py-1">Graus</div><div className="py-1">III</div><div className="py-1">II</div><div className="py-1">I</div></div>
          <div className="grid grid-cols-4 text-center border-b border-gray-200 italic"><div className="py-1">Pontos mínimos</div><div className="py-1">10</div><div className="py-1">6</div><div className="py-1">4</div></div>
          <div className="grid grid-cols-4 text-center border-b border-gray-200 italic"><div className="py-1">Itens obrigatórios</div><div className="py-1">2 e 4, com os demais no mínimo no grau II</div><div className="py-1">2 e 4, com os demais no mínimo no grau I</div><div className="py-1">todos, no mínimo no grau I</div></div>
          <div className="flex justify-between px-3 py-1.5 font-bold"><span>GRAU DE FUNDAMENTAÇÃO:</span><span>{fund.grau}</span></div>
        </div>

        <div className="border border-gray-400 text-[11px] break-inside-avoid">
          <div className="bg-black text-white font-bold px-2 py-1.5 text-center">Tabela 5 - Graus de precisão da estimativa de valor no caso de utilização de tratamento por fatores</div>
          <div className="grid grid-cols-4 text-center border-b border-gray-200"><div className="py-1">Graus</div><div className="py-1">III</div><div className="py-1">II</div><div className="py-1">I</div></div>
          <div className="grid grid-cols-4 text-center border-b border-gray-200 italic"><div className="py-1">Amplitude do intervalo de confiança de 80% em torno do valor central da estimativa</div><div className="py-1">{"<=30%"}</div><div className="py-1">{"<=40%"}</div><div className="py-1">{"<=50%"}</div></div>
          <div className="flex justify-between px-3 py-1.5 font-bold border-b border-gray-200"><span>Intervalo de confiança:</span><span>{fmt2(san.intervalo)}%</span></div>
          <div className="flex justify-between px-3 py-1.5 font-bold"><span>GRAU DE PRECISÃO:</span><span>{grauPrec}</span></div>
        </div>
      </LaudoPagina>

      {/* O */}
      <LaudoPagina laudo={laudo}>
        <Secao>O. ENCERRAMENTO</Secao>
        {bloco("encerramento", "Encerramento", 3)}
        <p className="text-[13px] text-gray-700 text-right mt-8">{laudo.local}, {dataLonga}.</p>
        <div className="text-center mt-14">
          <p className="text-[13px] font-bold italic text-gray-900">{laudo.perita}</p>
          <p className="text-[12px] text-gray-700">CORRETORA DE IMÓVEIS</p>
          <p className="text-[12px] text-gray-700">{laudo.creci}</p>
          <p className="text-[12px] text-gray-700 mt-1">AVALIADORA IMOBILIÁRIA</p>
          <p className="text-[12px] text-gray-700">{laudo.cnai}</p>
        </div>
      </LaudoPagina>

      <div className="flex justify-start print:hidden">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar</button>
      </div>
    </div>
  );
}

function AvaliacaoModuleScreen() {
  const [view, setView] = useState("lista"); // lista | wizard
  const [etapa, setEtapa] = useState(1);
  const [imovel, setImovel] = useState(IMOVEL_INICIAL);
  const [comparaveis, setComparaveis] = useState(COMPARAVEIS_INICIAIS);
  const [fotos, setFotos] = useState([]);
  const [laudo, setLaudo] = useState(LAUDO_INICIAL);

  function iniciarNova() {
    setImovel(IMOVEL_INICIAL); setComparaveis([]); setFotos([]); setLaudo(LAUDO_INICIAL); setEtapa(1); setView("wizard");
  }
  function continuarExistente(avaliacao) {
    // Protótipo de validação: reaproveita os dados de exemplo independente do item clicado.
    setImovel({ ...IMOVEL_INICIAL, bairro: avaliacao.bairro, tipo: avaliacao.tipo, endereco: avaliacao.endereco.split(",")[0] });
    setComparaveis(COMPARAVEIS_INICIAIS);
    setFotos([]);
    setLaudo(LAUDO_INICIAL);
    setEtapa(1);
    setView("wizard");
  }

  if (view === "lista") {
    return <AvaliacoesScreen onNovaAvaliacao={iniciarNova} onContinuar={continuarExistente} />;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <button onClick={() => setView("lista")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"><ArrowLeft className="h-4 w-4" /> Voltar para avaliações</button>
        <AvaliacaoStepper etapaAtual={etapa} onIrPara={setEtapa} />
      </div>

      {etapa === 1 && <EtapaImovel imovel={imovel} setImovel={setImovel} onProximo={() => setEtapa(2)} />}
      {etapa === 2 && <EtapaComparaveis imovel={imovel} comparaveis={comparaveis} setComparaveis={setComparaveis} onVoltar={() => setEtapa(1)} onProximo={() => setEtapa(3)} />}
      {etapa === 3 && <EtapaCalculos imovel={imovel} comparaveis={comparaveis} onVoltar={() => setEtapa(2)} onProximo={() => setEtapa(4)} />}
      {etapa === 4 && <EtapaFotos fotos={fotos} setFotos={setFotos} onVoltar={() => setEtapa(3)} onProximo={() => setEtapa(5)} />}
      {etapa === 5 && <EtapaResultado imovel={imovel} comparaveis={comparaveis} onVoltar={() => setEtapa(4)} onProximo={() => setEtapa(6)} />}
      {etapa === 6 && <EtapaRelatorio imovel={imovel} comparaveis={comparaveis} fotos={fotos} laudo={laudo} setLaudo={setLaudo} onVoltar={() => setEtapa(5)} />}
    </div>
  );
}

/* ============================================================================
   CONFIGURAÇÕES
============================================================================ */

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${checked ? "bg-blue-600" : "bg-gray-200"} cursor-pointer`}>
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
          <input value={numero} onChange={(e) => setNumero(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors transition-colors" />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 rounded-lg"><Check className="h-3.5 w-3.5" /> Conectado</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Distribuição automática de leads</p>
        <p className="text-xs text-gray-400 mb-4">Defina como os leads qualificados são repassados entre corretores.</p>
        <select value={distribuicao} onChange={(e) => setDistribuicao(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors bg-white mb-5 cursor-pointer">
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

      <button onClick={salvar} className={`flex items-center gap-2 rounded-lg text-sm font-medium px-5 py-2.5 transition-colors ${salvo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-600 hover:bg-blue-700 text-white"} cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]`}>
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
      <TopProgressBar active={screenLoading} />
      <Sidebar screen={screen} onNavigate={navegarPara} unread={unread} user={user} onLogout={logout} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header screen={screen} user={user} onLogout={logout} search={search} setSearch={setSearch} />

        <main className="flex-1 min-w-0">
          {screenLoading ? (
            <ScreenSkeleton />
          ) : (
            <div key={visibleScreen} className="animate-in fade-in duration-200">
          {visibleScreen === "dashboard" && <DashboardScreen leads={leadsFiltrados} onSelectLead={setSelectedLead} />}
          {visibleScreen === "whatsapp" && <WhatsAppScreen token={token} />}
          {visibleScreen === "anuncios" && <AnunciosScreen />}
          {visibleScreen === "avaliacoes" && <AvaliacaoModuleScreen />}
          {visibleScreen === "videos" && <VideosScreen />}
          {visibleScreen === "juridico" && <JuridicoScreen token={token} />}
          {visibleScreen === "configuracoes" && <ConfiguracoesScreen />}
            </div>
          )}
        </main>
      </div>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}