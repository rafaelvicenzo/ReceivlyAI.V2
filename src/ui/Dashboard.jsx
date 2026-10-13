import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  PenLine,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { ui } from "./theme.js";
import { BannerAssinatura } from "./PlanoAssinatura.jsx";

const API_BASE = "http://localhost:8000";

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

function leadFromApi(l) {
  return {
    ...l,
    avatar: (l.nome || "?").split(" ").map((n) => n[0]).slice(0, 2).join(""),
    imovel: l.imovel_interesse || "—",
    score: l.score_ia ?? 0,
    timestamp: l.criado_em ? new Date(l.criado_em).toLocaleString("pt-BR") : "—",
  };
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function dataHojeFmt() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function Paginacao({ pagina, totalPaginas, onChange }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
      <span>Página {pagina} de {totalPaginas}</span>
      <div className="flex gap-1">
        <button type="button" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}
          className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer hover:bg-slate-50">Anterior</button>
        <button type="button" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}
          className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer hover:bg-slate-50">Próxima</button>
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, subColor, icon: Icon, iconBg, iconColor, onClick, children }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`${ui.cardInteractive} ${ui.cardPad} text-left group ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`${ui.sectionDesc} font-medium`}>{title}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mt-2">{value}</p>
          {sub && <p className={`text-xs mt-1.5 ${subColor || "text-emerald-600"}`}>{sub}</p>}
          {children}
        </div>
        {Icon && (
          <div className={`h-10 w-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {onClick && (
        <p className="text-[10px] text-brand-600 font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Ver detalhes <ArrowRight className="h-3 w-3" />
        </p>
      )}
    </Tag>
  );
}

function LeadsTable({ leads, onSelect, pagina, onPagina, porPagina = 5 }) {
  const ordenados = [...leads].sort((a, b) => (b.score_ia ?? 0) - (a.score_ia ?? 0));
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const slice = ordenados.slice((pagina - 1) * porPagina, pagina * porPagina);
  return (
    <div className={`${ui.card} overflow-hidden flex flex-col min-h-0 h-full`}>
      <div className={ui.cardHeader}>
        <div>
          <p className={ui.sectionTitle}>Leads qualificados</p>
          <p className={ui.sectionDesc}>Clique em uma linha para ver a ficha completa</p>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10">
            <tr className={ui.tableHead}>
              <th className="font-medium px-4 py-2.5">Lead</th>
              <th className="font-medium px-4 py-2.5">Interesse</th>
              <th className="font-medium px-4 py-2.5">Bairro</th>
              <th className="font-medium px-4 py-2.5">Score</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">Nenhum lead ainda. Simule uma conversa no WhatsApp.</td></tr>
            ) : slice.map((lead) => (
              <tr key={lead.id} onClick={() => onSelect(leadFromApi(lead))} className={`${ui.tableRow} cursor-pointer`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 ${ui.avatar} text-[10px]`}>{leadFromApi(lead).avatar}</div>
                    <div>
                      <p className="font-medium text-slate-800 text-xs">{lead.nome}</p>
                      <p className="text-[10px] text-slate-400">{lead.telefone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-[140px] truncate">{lead.imovel_interesse || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{lead.bairro || "—"}</td>
                <td className="px-4 py-3"><ScoreBadge score={lead.score_ia ?? 0} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{lead.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} onChange={onPagina} />
    </div>
  );
}

function GraficoAvaliacoes({ labels, valores, onVerTodas }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...valores, 1);
  const total = valores.reduce((a, b) => a + b, 0);
  const ultimo = valores[valores.length - 1] ?? 0;
  const penultimo = valores[valores.length - 2] ?? 0;
  const variacao = penultimo > 0 ? Math.round(((ultimo - penultimo) / penultimo) * 100) : ultimo > 0 ? 100 : 0;

  const w = 320;
  const h = 120;
  const pad = 8;
  const step = labels.length > 1 ? (w - pad * 2) / (labels.length - 1) : 0;
  const normY = (v) => h - pad - (v / max) * (h - pad * 2);
  const points = valores.map((v, i) => ({ x: pad + i * step, y: normY(v), v, lbl: labels[i] }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? w} ${h} L ${pad} ${h} Z`;

  return (
    <div className={`${ui.card} ${ui.cardPad} h-full flex flex-col`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className={ui.sectionTitle}>Avaliações por mês</p>
          <p className={ui.sectionDesc}>Últimos 6 meses · passe o mouse nos pontos</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-slate-900">{total}</p>
          <p className={`text-xs font-medium flex items-center justify-end gap-1 ${variacao >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            <TrendingUp className={`h-3.5 w-3.5 ${variacao < 0 ? "rotate-180" : ""}`} />
            {variacao >= 0 ? "+" : ""}{variacao}% vs mês anterior
          </p>
        </div>
      </div>

      <div className="relative flex-1 min-h-[160px]">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b6cf6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b6cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#chartAreaFill)" />
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={labels[i]}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hover === i ? 7 : 5}
                fill={hover === i ? "#1d4ed8" : "#3b6cf6"}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
        </svg>

        {hover != null && points[hover] && (
          <div
            className="absolute pointer-events-none z-10 rounded-xl bg-slate-900 text-white text-xs px-3 py-2 shadow-lg ui-fade-in"
            style={{ left: `${(hover / Math.max(1, labels.length - 1)) * 85}%`, top: "8%" }}
          >
            <p className="font-semibold">{points[hover].lbl}</p>
            <p className="text-slate-300 mt-0.5">{points[hover].v} avaliação{points[hover].v !== 1 ? "ões" : ""}</p>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-1 mt-3 pt-3 border-t border-slate-100">
        {labels.map((lbl, i) => (
          <button
            key={lbl}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex-1 flex flex-col items-center gap-1 min-w-0 rounded-lg py-1 transition-colors cursor-pointer ${hover === i ? "bg-brand-50" : "hover:bg-slate-50"}`}
          >
            <div
              className="w-full max-w-[28px] rounded-t-md bg-brand-500/80 transition-all duration-300"
              style={{ height: `${Math.max(6, (valores[i] / max) * 48)}px`, opacity: hover === i ? 1 : 0.65 }}
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">{lbl}</span>
          </button>
        ))}
      </div>

      {onVerTodas && (
        <button type="button" onClick={onVerTodas} className={`${ui.btnGhost} mt-4 text-xs self-start cursor-pointer`}>
          Ver todas as avaliações →
        </button>
      )}
    </div>
  );
}

function DonutLeads({ leads }) {
  const [hover, setHover] = useState(null);
  const segmentos = useMemo(() => {
    const quentes = leads.filter((l) => (l.score_ia ?? 0) >= 80).length;
    const mornos = leads.filter((l) => (l.score_ia ?? 0) >= 50 && (l.score_ia ?? 0) < 80).length;
    const frios = leads.filter((l) => (l.score_ia ?? 0) < 50).length;
    return [
      { id: "quentes", label: "Quentes (80+)", value: quentes, color: "#10b981" },
      { id: "mornos", label: "Mornos (50–79)", value: mornos, color: "#f59e0b" },
      { id: "frios", label: "Frios (<50)", value: frios, color: "#ef4444" },
    ];
  }, [leads]);

  const total = segmentos.reduce((a, s) => a + s.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={`${ui.card} ${ui.cardPad}`}>
      <p className={ui.sectionTitle}>Score dos leads</p>
      <p className={ui.sectionDesc}>Distribuição por temperatura da IA</p>

      <div className="flex items-center gap-5 mt-4">
        <div className="relative shrink-0">
          <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
            <circle cx="56" cy="56" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
            {segmentos.map((seg) => {
              const pct = seg.value / total;
              const dash = pct * c;
              const el = (
                <circle
                  key={seg.id}
                  cx="56"
                  cy="56"
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hover === seg.id ? 14 : 12}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-200 cursor-pointer"
                  style={{ opacity: hover && hover !== seg.id ? 0.35 : 1 }}
                  onMouseEnter={() => setHover(seg.id)}
                  onMouseLeave={() => setHover(null)}
                />
              );
              offset += dash;
              return el;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xl font-bold text-slate-900">{leads.length}</p>
            <p className="text-[10px] text-slate-400">leads</p>
          </div>
        </div>

        <ul className="flex-1 space-y-2.5 min-w-0">
          {segmentos.map((seg) => (
            <li
              key={seg.id}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors cursor-default ${hover === seg.id ? "bg-slate-50" : ""}`}
              onMouseEnter={() => setHover(seg.id)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="truncate">{seg.label}</span>
              </span>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{seg.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PainelAtividade({ itens, onItemClick }) {
  return (
    <div className={`${ui.card} overflow-hidden flex flex-col min-h-0 h-full`}>
      <div className={ui.cardHeader}>
        <div>
          <p className={ui.sectionTitle}>Atividade recente</p>
          <p className={ui.sectionDesc}>Clique para ir direto ao módulo</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {itens.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-slate-400">Nenhuma atividade registrada ainda.</p>
        ) : itens.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onItemClick?.(a)}
            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer group"
          >
            <span className={`h-9 w-9 rounded-xl shrink-0 flex items-center justify-center ${a.tipo === "avaliacao" ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600"}`}>
              {a.tipo === "avaliacao" ? <Calculator className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800 truncate">{a.texto}</p>
              <p className="text-[11px] text-slate-400 truncate">{a.detalhe} · {a.tempo}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function DashboardScreen({ token, user, onSelectLead, onNavigate, plano, onAssinar }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [paginaLeads, setPaginaLeads] = useState(1);

  useEffect(() => {
    if (!token) return;
    setCarregando(true);
    fetch(`${API_BASE}/dashboard/resumo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erro ao carregar painel"))))
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setCarregando(false));
  }, [token]);

  if (carregando) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando visão geral...
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="px-6 md:px-8 py-10 text-sm text-red-600">
        Não foi possível carregar os dados do painel.
      </div>
    );
  }

  const produtos = [
    { id: "whatsapp", icon: MessageCircle, cor: "text-brand-600", bg: "bg-brand-50", ring: "hover:ring-brand-200", nome: "IA para WhatsApp", stat: `${dados.conversas_aguardando_corretor} na fila`, statCor: "text-amber-600 bg-amber-50", rodape: `${dados.conversas_total} conversas` },
    { id: "anuncios", icon: PenLine, cor: "text-amber-600", bg: "bg-amber-50", ring: "hover:ring-amber-200", nome: "IA para Anúncios", stat: "Ativo", statCor: "text-emerald-600 bg-emerald-50", rodape: "4 tons de voz" },
    { id: "avaliacoes", icon: Calculator, cor: "text-emerald-600", bg: "bg-emerald-50", ring: "hover:ring-emerald-200", nome: "Avaliações Imobiliárias", stat: `${dados.avaliacoes_em_andamento} em andamento`, statCor: "text-brand-600 bg-brand-50", rodape: `${dados.avaliacoes_concluidas} concluídas` },
    { id: "fotos", icon: ImageIcon, cor: "text-violet-600", bg: "bg-violet-50", ring: "hover:ring-violet-200", nome: "Foto Tours", stat: "IA Gemini", statCor: "text-violet-600 bg-violet-50", rodape: "4 estilos de apresentação" },
  ];

  const primeiroNome = (user?.nome || "Corretor").split(" ")[0];

  function handleAtividade(a) {
    if (a.tipo === "whatsapp") onNavigate?.("whatsapp");
    else if (a.tipo === "avaliacao") onNavigate?.("avaliacoes");
  }

  return (
    <div className="min-h-full pb-10">
      <BannerAssinatura plano={plano} onAssinar={onAssinar} />

      <div className="px-6 md:px-8 pt-6 md:pt-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-brand-50/40 to-slate-50 p-6 md:p-8 shadow-sm">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand-500/5 blur-2xl pointer-events-none" />
          <div className="absolute -left-4 bottom-0 h-32 w-32 rounded-full bg-violet-500/5 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className={`${ui.sectionKicker} text-brand-600`}>{dataHojeFmt()}</p>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                {saudacao()}, {primeiroNome}
              </h2>
              <p className="text-sm text-slate-600 mt-2 max-w-xl">
                Resumo da sua imobiliária — leads, avaliações e conversas em um só lugar.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { label: `${dados.leads_ativos} leads ativos`, cor: "bg-white border-slate-200 text-slate-700" },
                  { label: `${dados.avaliacoes_mes} aval. este mês`, cor: "bg-white border-slate-200 text-slate-700" },
                  { label: `${dados.conversas_aguardando_corretor} aguardando você`, cor: dados.conversas_aguardando_corretor > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-white border-slate-200 text-slate-700" },
                ].map((chip) => (
                  <span key={chip.label} className={`text-xs font-medium px-3 py-1.5 rounded-full border ${chip.cor}`}>
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button type="button" onClick={() => onNavigate?.("whatsapp")} className={`${ui.btnPrimary} px-5 py-2.5 text-sm cursor-pointer inline-flex items-center gap-2`}>
                <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
              </button>
              <button type="button" onClick={() => onNavigate?.("avaliacoes")} className={`${ui.btnSecondary} px-5 py-2.5 text-sm cursor-pointer inline-flex items-center gap-2`}>
                <Calculator className="h-4 w-4" /> Nova avaliação
              </button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Leads ativos"
            value={dados.leads_ativos}
            sub={`+${dados.leads_novos_semana} esta semana`}
            icon={Users}
            iconBg="bg-brand-50"
            iconColor="text-brand-600"
            onClick={() => onNavigate?.("whatsapp")}
          />
          <KpiCard
            title="Qualificação (IA)"
            value={`${dados.taxa_qualificacao}%`}
            sub={`${dados.conversas_ia_ativa} conversas com IA`}
            icon={Sparkles}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            onClick={() => onNavigate?.("whatsapp")}
          >
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full ui-progress-fill transition-all duration-500" style={{ width: `${dados.taxa_qualificacao}%` }} />
            </div>
          </KpiCard>
          <KpiCard
            title="Avaliações (mês)"
            value={dados.avaliacoes_mes}
            sub={`${dados.avaliacoes_total} no total`}
            subColor="text-emerald-600"
            icon={Calculator}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            onClick={() => onNavigate?.("avaliacoes")}
          />
          <KpiCard
            title="Aguardando corretor"
            value={dados.conversas_aguardando_corretor}
            sub="Conversas no WhatsApp"
            subColor="text-amber-600"
            icon={MessageCircle}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            onClick={() => onNavigate?.("whatsapp")}
          />
        </section>

        {/* Atalhos produtos */}
        <section>
          <p className={`${ui.sectionKicker} mb-3`}>Produtos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {produtos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onNavigate?.(p.id)}
                className={`${ui.cardInteractive} ${ui.cardPad} text-left cursor-pointer ring-1 ring-transparent ${p.ring} transition-all hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-10 w-10 rounded-xl ${p.bg} ${p.cor} flex items-center justify-center`}>
                    <p.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.statCor}`}>{p.stat}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mt-3">{p.nome}</p>
                <p className="text-xs text-slate-400 mt-1">{p.rodape}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Gráficos */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <GraficoAvaliacoes
              labels={dados.grafico_avaliacoes_meses}
              valores={dados.grafico_avaliacoes_valores}
              onVerTodas={() => onNavigate?.("avaliacoes")}
            />
          </div>
          <DonutLeads leads={dados.leads} />
        </section>

        {/* Tabela + atividade */}
        <section className="grid grid-cols-1 xl:grid-cols-5 gap-4 min-h-[360px]">
          <div className="xl:col-span-3 min-h-[360px] flex flex-col">
            <LeadsTable
              leads={dados.leads}
              onSelect={onSelectLead}
              pagina={paginaLeads}
              onPagina={setPaginaLeads}
              porPagina={6}
            />
          </div>
          <div className="xl:col-span-2 min-h-[360px] flex flex-col">
            <PainelAtividade itens={dados.atividade} onItemClick={handleAtividade} />
          </div>
        </section>
      </div>
    </div>
  );
}
