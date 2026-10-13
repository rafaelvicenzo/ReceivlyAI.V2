import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eraser,
  Heart,
  ImageIcon,
  Layers,
  Loader2,
  PenLine,
  Sparkles,
  Star,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { ui } from "./theme.js";

const API_BASE = "http://localhost:8000";
const PROMPT_MAX = 2000;

const ESTILO_ICONS = {
  Organizado: Layers,
  Limpo: Eraser,
  Charmoso: Heart,
  Luxuoso: Star,
};

async function baixarImagem(url, nomeArquivo, token) {
  const resp = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new Error("Não foi possível baixar a imagem.");
  const blob = await resp.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo || "foto-tour-receivly.jpg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function nomeDownload(item) {
  const base = (item?.nome_original || "foto").replace(/\.[^.]+$/, "");
  const estilo = (item?.estilo || "estilizada").toLowerCase().replace(/\s+/g, "-");
  return `${base}-${estilo}-receivly.jpg`;
}

export function FotoToursScreen({ token, plano, onIrAssinatura, onPlanoAtualizado }) {
  const [estilos, setEstilos] = useState([]);
  const [estilo, setEstilo] = useState("Organizado");
  const [modoPersonalizado, setModoPersonalizado] = useState(false);
  const [promptPersonalizado, setPromptPersonalizado] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [historicoSelecionado, setHistoricoSelecionado] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState("");
  const [abaPreview, setAbaPreview] = useState("comparar");
  const inputRef = useRef(null);

  const fotosUsadas = plano?.foto_tours_usadas_mes ?? 0;
  const fotosLimite = plano?.foto_tours_limite_mes ?? 10;
  const ehAdmin = plano?.eh_admin || plano?.status === "admin";
  const podeGerar = !plano || ehAdmin || plano.pode_usar_foto_tours;
  const limiteAtingido = plano && !ehAdmin && plano.ativo && fotosUsadas >= fotosLimite;
  const pctUso = Math.min(100, (fotosUsadas / Math.max(1, fotosLimite)) * 100);

  const itemAtivo = historicoSelecionado || resultado;
  const urlResultado = itemAtivo ? `${API_BASE}${itemAtivo.url}` : null;

  useEffect(() => {
    fetch(`${API_BASE}/foto-tours/estilos`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEstilos)
      .catch(() => setEstilos([]));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/foto-tours/historico`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistorico)
      .catch(() => setHistorico([]));
  }, [token, resultado]);

  function selecionarArquivo(file) {
    if (!file) return;
    setArquivo(file);
    setPreview(URL.createObjectURL(file));
    setResultado(null);
    setHistoricoSelecionado(null);
    setErro("");
    setAbaPreview("comparar");
  }

  async function gerarFoto() {
    if (!arquivo) return;
    if (modoPersonalizado && !promptPersonalizado.trim()) {
      setErro("Descreva o que você quer na foto personalizada.");
      return;
    }
    setGerando(true);
    setErro("");
    setHistoricoSelecionado(null);
    try {
      const fd = new FormData();
      fd.append("estilo", estilo);
      fd.append("arquivo", arquivo);
      if (modoPersonalizado && promptPersonalizado.trim()) {
        fd.append("prompt_personalizado", promptPersonalizado.trim());
      }
      const resp = await fetch(`${API_BASE}/foto-tours/estilizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.detail || "Erro ao estilizar foto");
      setResultado(data);
      setAbaPreview("resultado");
      onPlanoAtualizado?.();
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  async function handleDownload(item = itemAtivo) {
    if (!item?.url) return;
    setBaixando(true);
    setErro("");
    try {
      await baixarImagem(`${API_BASE}${item.url}`, nomeDownload(item), token);
    } catch (err) {
      setErro(err.message);
    } finally {
      setBaixando(false);
    }
  }

  function selecionarHistorico(item) {
    setHistoricoSelecionado(item);
    setAbaPreview("resultado");
  }

  return (
    <div className={`${ui.contentWrap} max-w-6xl space-y-6`}>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-violet-50/80 via-white to-brand-50/40 p-6 md:p-8">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className={ui.sectionKicker}>Staging virtual</p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Foto Tours com IA
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-xl">
              Transforme fotos de imóveis para anúncios — escolha um estilo pronto ou escreva seu próprio prompt.
            </p>
          </div>
          {urlResultado && (
            <button
              type="button"
              onClick={() => handleDownload()}
              disabled={baixando}
              className={`${ui.btnPrimary} px-5 py-2.5 text-sm shrink-0 cursor-pointer inline-flex items-center gap-2 disabled:opacity-60`}
            >
              {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar resultado
            </button>
          )}
        </div>
      </section>

      {/* Uso mensal */}
      <div className={`${ui.card} ${ui.cardPad} ${
        ehAdmin ? "border-violet-200 bg-violet-50/30" :
        !plano?.ativo ? "border-amber-200 bg-amber-50/40" :
        limiteAtingido ? "border-amber-200 bg-amber-50/40" :
        "border-brand-100 bg-brand-50/20"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-slate-900">Uso mensal</p>
          {ehAdmin ? (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              Admin · ilimitado
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-700">{fotosUsadas} / {fotosLimite}</span>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-white border border-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${ehAdmin ? "bg-violet-500" : limiteAtingido ? "bg-amber-500" : "bg-brand-500"}`}
            style={{ width: ehAdmin ? `${Math.min(100, Math.max(8, pctUso))}%` : `${pctUso}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-2">
          {ehAdmin ? (
            <>Este mês: <strong>{fotosUsadas}</strong> gerada{fotosUsadas !== 1 ? "s" : ""} · clientes Pro: {fotosLimite}/mês</>
          ) : !plano?.ativo ? (
            "Assine o plano Pro para usar o Foto Tours."
          ) : limiteAtingido ? (
            "Limite mensal atingido. Renova no próximo mês."
          ) : (
            <><strong>{fotosLimite - fotosUsadas}</strong> restante{fotosLimite - fotosUsadas !== 1 ? "s" : ""} este mês</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Coluna configuração */}
        <div className="xl:col-span-2 space-y-5">
          {/* Upload */}
          <div className={`${ui.card} ${ui.cardPad}`}>
            <p className={ui.sectionTitle}>1. Sua foto</p>
            <p className={`${ui.sectionDesc} mb-4`}>JPG, PNG ou WebP · máx. 8 MB</p>
            {preview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                <img src={preview} alt="Original" className="w-full aspect-[4/3] object-cover" />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium cursor-pointer"
                >
                  Trocar foto
                </button>
                <button
                  type="button"
                  onClick={() => { setArquivo(null); setPreview(null); setResultado(null); }}
                  className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-white/90 text-slate-600 flex items-center justify-center shadow cursor-pointer hover:bg-white"
                  title="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`${ui.dropzone} py-10 w-full cursor-pointer`}
              >
                <Upload className="h-7 w-7" />
                <p className="text-sm font-medium mt-1">Arraste ou clique para enviar</p>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => selecionarArquivo(e.target.files?.[0])}
            />
          </div>

          {/* Modo */}
          <div className={`${ui.card} ${ui.cardPad}`}>
            <p className={ui.sectionTitle}>2. Como estilizar</p>
            <div className="flex gap-2 mt-3 p-1 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => setModoPersonalizado(false)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${!modoPersonalizado ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Estilos prontos
              </button>
              <button
                type="button"
                onClick={() => setModoPersonalizado(true)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${modoPersonalizado ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Prompt personalizado
              </button>
            </div>

            {!modoPersonalizado ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {(estilos.length ? estilos : [
                  { nome: "Organizado", descricao: "Mobília organizada." },
                  { nome: "Limpo", descricao: "Ambiente vazio." },
                  { nome: "Charmoso", descricao: "Aconchegante." },
                  { nome: "Luxuoso", descricao: "Alto padrão." },
                ]).map((e) => {
                  const Icon = ESTILO_ICONS[e.nome] || Sparkles;
                  const ativo = estilo === e.nome;
                  return (
                    <button
                      key={e.nome}
                      type="button"
                      onClick={() => setEstilo(e.nome)}
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${ativo ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${ativo ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{e.nome}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug pl-10">{e.descricao}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <PenLine className="h-3.5 w-3.5" /> Descreva o resultado desejado
                </label>
                <textarea
                  value={promptPersonalizado}
                  onChange={(e) => setPromptPersonalizado(e.target.value.slice(0, PROMPT_MAX))}
                  rows={5}
                  placeholder="Ex.: Deixe a sala mais clara, adicione um sofá cinza moderno, planta no canto e tapete bege. Mantenha as janelas e o piso originais."
                  className={`${ui.input} text-sm resize-none`}
                />
                <p className="text-[10px] text-slate-400 text-right">{promptPersonalizado.length}/{PROMPT_MAX}</p>
              </div>
            )}
          </div>

          {/* Gerar */}
          <button
            type="button"
            onClick={gerarFoto}
            disabled={!arquivo || gerando || !podeGerar}
            className={`w-full ${ui.btnPrimary} py-3.5 text-sm font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2 shadow-lg shadow-brand-500/15`}
          >
            {gerando ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Processando com IA...</>
            ) : (
              <><Wand2 className="h-5 w-5" /> Gerar foto estilizada</>
            )}
          </button>
          {!podeGerar && !plano?.ativo && onIrAssinatura && (
            <button type="button" onClick={onIrAssinatura} className={`w-full ${ui.btnSecondary} text-sm cursor-pointer`}>
              Ver assinatura
            </button>
          )}
          {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}
        </div>

        {/* Coluna preview */}
        <div className="xl:col-span-3 space-y-5">
          <div className={`${ui.card} ${ui.cardPad} min-h-[420px] flex flex-col`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className={ui.sectionTitle}>3. Resultado</p>
              {(preview || urlResultado) && (
                <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
                  {["comparar", "resultado", "original"].map((aba) => (
                    <button
                      key={aba}
                      type="button"
                      onClick={() => setAbaPreview(aba)}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors cursor-pointer ${abaPreview === aba ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                    >
                      {aba === "comparar" ? "Antes / Depois" : aba}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!preview && !urlResultado && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-slate-600">Envie uma foto para ver o preview</p>
                <p className="text-xs text-slate-400 mt-1">O resultado aparece aqui em alguns segundos</p>
              </div>
            )}

            {gerando && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
                <p className="text-sm font-medium text-slate-700">A IA está estilizando sua foto...</p>
                <p className="text-xs text-slate-400">Pode levar até 30 segundos</p>
              </div>
            )}

            {!gerando && preview && abaPreview === "comparar" && (
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Antes</p>
                  <img src={preview} alt="Antes" className="w-full rounded-xl border border-slate-200 object-cover aspect-[4/3]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Depois</p>
                  {urlResultado ? (
                    <img src={urlResultado} alt="Depois" className="w-full rounded-xl border-2 border-brand-200 object-cover aspect-[4/3]" />
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                      Gere para comparar
                    </div>
                  )}
                </div>
              </div>
            )}

            {!gerando && abaPreview === "original" && preview && (
              <img src={preview} alt="Original" className="w-full rounded-xl border border-slate-200 object-contain max-h-[480px] mx-auto" />
            )}

            {!gerando && abaPreview === "resultado" && urlResultado && (
              <div className="space-y-4 flex-1">
                <img src={urlResultado} alt="Resultado" className="w-full rounded-xl border border-slate-200 object-contain max-h-[440px] mx-auto bg-slate-50" />
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{itemAtivo?.estilo}</p>
                    {itemAtivo?.prompt_usado && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={itemAtivo.prompt_usado}>
                        “{itemAtivo.prompt_usado}”
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(itemAtivo)}
                    disabled={baixando}
                    className={`${ui.btnPrimary} px-5 py-2.5 text-sm shrink-0 cursor-pointer inline-flex items-center gap-2 disabled:opacity-60`}
                  >
                    {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Histórico */}
          {historico.length > 0 && (
            <div className={`${ui.card} ${ui.cardPad}`}>
              <p className={ui.sectionTitle}>Histórico recente</p>
              <p className={`${ui.sectionDesc} mb-4`}>Clique para visualizar · botão para baixar</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {historico.slice(0, 8).map((h) => {
                  const selecionado = historicoSelecionado?.id === h.id || (!historicoSelecionado && resultado?.id === h.id);
                  return (
                    <div
                      key={h.id}
                      className={`group relative rounded-xl overflow-hidden border-2 transition-all ${selecionado ? "border-brand-500 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <button type="button" onClick={() => selecionarHistorico(h)} className="w-full cursor-pointer block">
                        <img src={`${API_BASE}${h.url}`} alt={h.estilo} className="w-full aspect-square object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                          <p className="text-[10px] font-semibold text-white truncate">{h.estilo}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownload(h); }}
                        className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-white/95 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow cursor-pointer hover:bg-white"
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
