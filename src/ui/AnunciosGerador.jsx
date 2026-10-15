import React, { useState, useEffect, useRef } from "react";
import { ui } from "./theme.js";
import {
  Sparkles, Loader2, Copy, Check, ChevronRight, ChevronLeft, Search,
  Building2, Globe, Camera, MessageSquare, Megaphone, Share2,
  Download, RefreshCw, AlertTriangle, History, PenLine, Upload, Plus, ImageIcon, Hash,
  BarChart3, CheckCircle2,
} from "lucide-react";

const ABORDAGENS = [
  { id: "A", label: "Direta", desc: "Objetiva — specs, preço e CTA" },
  { id: "B", label: "Benefícios", desc: "Foco no estilo de vida e vantagens" },
  { id: "C", label: "Gancho criativo", desc: "Abertura criativa ou pergunta" },
];

const API_BASE = "http://localhost:8000";

const CANAIS = [
  { id: "portal", label: "Portal imobiliário", icon: Globe },
  { id: "instagram", label: "Instagram", icon: Camera },
  { id: "facebook", label: "Facebook", icon: Share2 },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "patrocinado", label: "Anúncio patrocinado", icon: Megaphone },
];

const TONS = [
  { id: "profissional_persuasivo", label: "Profissional e persuasivo" },
  { id: "sofisticado", label: "Sofisticado" },
  { id: "emocional_acolhedor", label: "Emocional e acolhedor" },
  { id: "moderno_descontraido", label: "Moderno e descontraído" },
  { id: "curto_direto", label: "Curto e direto" },
];

const FORM_VAZIO = {
  titulo: "", tipo: "Apartamento", finalidade: "venda", preco: "",
  bairro: "", cidade: "", estado: "", endereco: "",
  area_imovel: "", quartos: "", suites: "", banheiros: "", vagas: "",
  caracteristicas: "", descricao: "", titulo_anuncio: "",
};

function mensagemErroApi(err) {
  if (err instanceof TypeError) {
    return `Não consegui conectar ao backend (${API_BASE}). Verifique se o servidor está rodando.`;
  }
  return err.message || "Erro inesperado.";
}

async function apiAnuncios(token, path, options = {}) {
  let resp;
  try {
    resp = await fetch(`${API_BASE}/anuncios${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    throw new Error(mensagemErroApi(err));
  }
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`;
    try {
      const d = await resp.json();
      msg = d.detail?.mensagem || d.detail || msg;
      if (typeof msg === "object") msg = JSON.stringify(msg);
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

function formatBRL(v) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function AnunciosGerador({ token }) {
  const [passo, setPasso] = useState(0);
  const [imoveis, setImoveis] = useState([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);
  const [imovelId, setImovelId] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(null);
  const fileRef = useRef(null);

  const [canais, setCanais] = useState(CANAIS.map((c) => c.id));
  const [tom, setTom] = useState("profissional_persuasivo");
  const [comprimento, setComprimento] = useState("auto");
  const [gerarArtes, setGerarArtes] = useState(true);
  const [gerarArtesIa, setGerarArtesIa] = useState(true);
  const [exibirLogoArte, setExibirLogoArte] = useState(false);
  const [mensagemArte, setMensagemArte] = useState("");
  const [varianteAtiva, setVarianteAtiva] = useState("A");
  const [desempenho, setDesempenho] = useState(null);
  const [versaoEscolhida, setVersaoEscolhida] = useState(null);
  const [cta, setCta] = useState("Agende sua visita");
  const [contato, setContato] = useState("");
  const [hashtagsSugestoes, setHashtagsSugestoes] = useState(null);
  const [hashtagsSelecionadas, setHashtagsSelecionadas] = useState([]);
  const [carregandoHashtags, setCarregandoHashtags] = useState(false);
  const [canalHashtags, setCanalHashtags] = useState("instagram");

  const [validacao, setValidacao] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [aba, setAba] = useState("portal");
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdit, setTextoEdit] = useState("");

  function setF(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  async function carregarImoveis() {
    const [lista, hist] = await Promise.all([
      apiAnuncios(token, "/imoveis"),
      apiAnuncios(token, "/geracoes").catch(() => []),
    ]);
    setImoveis(lista);
    setHistorico(hist);
  }

  useEffect(() => {
    if (!token) return;
    carregarImoveis().catch((e) => setErro(mensagemErroApi(e)));
    apiAnuncios(token, "/desempenho").then(setDesempenho).catch(() => {});
  }, [token]);

  function selecionarImovel(i) {
    setImovelId(i.id);
    setForm({
      titulo: i.titulo || "",
      tipo: i.tipo || "Apartamento",
      finalidade: i.finalidade || "venda",
      preco: i.preco || (i.preco_numero ? formatBRL(i.preco_numero) : ""),
      bairro: i.bairro || "",
      cidade: i.cidade || "",
      estado: i.estado || "",
      endereco: i.endereco || "",
      area_imovel: i.area_imovel ? String(i.area_imovel) : "",
      quartos: i.quartos != null ? String(i.quartos) : "",
      suites: i.suites != null ? String(i.suites) : "",
      banheiros: i.banheiros != null ? String(i.banheiros) : "",
      vagas: i.vagas != null ? String(i.vagas) : "",
      caracteristicas: i.caracteristicas || "",
      descricao: i.descricao || "",
      titulo_anuncio: i.titulo_anuncio || "",
    });
    setFotoUrl(i.foto_fachada_url ? `${API_BASE}${i.foto_fachada_url}` : null);
    setFotoPreview(null);
  }

  function novoImovel() {
    setImovelId(null);
    setForm(FORM_VAZIO);
    setFotoUrl(null);
    setFotoPreview(null);
  }

  async function salvarImovel() {
    setSalvando(true);
    setErro("");
    try {
      const payload = {
        ...form,
        area_imovel: form.area_imovel ? Number(form.area_imovel) : null,
        quartos: form.quartos ? Number(form.quartos) : null,
        suites: form.suites ? Number(form.suites) : null,
        banheiros: form.banheiros ? Number(form.banheiros) : null,
        vagas: form.vagas ? Number(form.vagas) : null,
      };
      let saved;
      if (imovelId) {
        saved = await apiAnuncios(token, `/imoveis/${imovelId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        saved = await apiAnuncios(token, "/imoveis", { method: "POST", body: JSON.stringify(payload) });
        setImovelId(saved.id);
      }
      if (fotoPreview && fileRef.current?.files?.[0]) {
        const fd = new FormData();
        fd.append("arquivo", fileRef.current.files[0]);
        saved = await apiAnuncios(token, `/imoveis/${saved.id}/fachada`, { method: "POST", body: fd });
        setFotoUrl(saved.foto_fachada_url ? `${API_BASE}${saved.foto_fachada_url}` : null);
        setFotoPreview(null);
      }
      await carregarImoveis();
      return saved.id;
    } catch (e) {
      setErro(e.message);
      return null;
    } finally {
      setSalvando(false);
    }
  }

  async function analisarFachada() {
    setAnalisando(true);
    setErro("");
    try {
      const id = imovelId || await salvarImovel();
      if (!id) return;
      const r = await apiAnuncios(token, `/imoveis/${id}/analisar-fachada`, { method: "POST" });
      if (r.tipo_sugerido) setF("tipo", r.tipo_sugerido);
      if (r.titulo_sugerido) setF("titulo_anuncio", r.titulo_sugerido);
      if (r.caracteristicas_sugeridas) setF("caracteristicas", r.caracteristicas_sugeridas);
      if (r.descricao_visual) setF("descricao", r.descricao_visual);
      if (r.alertas?.length) setErro(r.alertas.join(" "));
      await carregarImoveis();
    } catch (e) {
      setErro(e.message);
    } finally {
      setAnalisando(false);
    }
  }

  function configPayload() {
    return {
      canais, tom, finalidade: form.finalidade, comprimento, gerar_artes: gerarArtes,
      formatos_arte: ["feed", "stories"], gerar_variantes: true, gerar_artes_ia: gerarArtesIa,
      canais_abordagens: ["portal", "instagram", "whatsapp"],
      cta, contato: contato || null,
      exibir_logo_arte: exibirLogoArte,
      mensagem_arte: mensagemArte.trim() || null,
      hashtags_selecionadas: hashtagsSelecionadas,
    };
  }

  const canaisSociais = canais.some((c) => c === "instagram" || c === "facebook");

  function textoMaterial(m) {
    if (!m) return "";
    if (m.canal === "portal" || m.canal === "patrocinado") {
      return m.titulo ? `${m.titulo}\n\n${m.corpo}` : m.corpo;
    }
    if ((m.canal === "instagram" || m.canal === "facebook") && m.hashtags && !m.corpo.includes(m.hashtags)) {
      return `${m.corpo}\n\n${m.hashtags}`;
    }
    return m.corpo;
  }

  function toggleHashtag(tag) {
    setHashtagsSelecionadas((prev) => (
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    ));
  }

  function selecionarHashtagsAlta() {
    if (!hashtagsSugestoes) return;
    const altas = hashtagsSugestoes.categorias.flatMap((c) => c.tags.filter((t) => t.relevancia === "alta").map((t) => t.tag));
    setHashtagsSelecionadas((prev) => [...new Set([...prev, ...altas])]);
  }

  async function gerarIdeiasHashtags(canal = canalHashtags) {
    if (!imovelId) {
      setErro("Salve o imóvel antes de gerar hashtags.");
      return;
    }
    setCarregandoHashtags(true);
    setErro("");
    try {
      const r = await apiAnuncios(token, "/hashtags/sugerir", {
        method: "POST",
        body: JSON.stringify({ imovel_anuncio_id: imovelId, canal }),
      });
      setHashtagsSugestoes(r);
      setCanalHashtags(canal);
      const altas = r.categorias.flatMap((c) => c.tags.filter((t) => t.relevancia === "alta").map((t) => t.tag));
      if (hashtagsSelecionadas.length === 0 && altas.length) {
        setHashtagsSelecionadas(altas.slice(0, 12));
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregandoHashtags(false);
    }
  }

  async function aplicarHashtagsNoMaterial() {
    if (!materialAtivo || hashtagsSelecionadas.length === 0) return;
    const txt = hashtagsSelecionadas.join(" ");
    let corpo = materialAtivo.corpo || "";
    if (materialAtivo.hashtags && corpo.includes(materialAtivo.hashtags)) {
      corpo = corpo.replace(materialAtivo.hashtags, "").trim();
    }
    if (!corpo.includes(txt)) {
      corpo = `${corpo.trim()}\n\n${txt}`.trim();
    }
    const u = await apiAnuncios(token, `/materiais/${materialAtivo.id}`, {
      method: "PATCH",
      body: JSON.stringify({ corpo, hashtags: txt }),
    });
    setResultado((r) => ({ ...r, materiais: r.materiais.map((m) => (m.id === u.id ? u : m)) }));
  }

  async function continuarParaConfig() {
    const id = imovelId || await salvarImovel();
    if (!id) return;
    setImovelId(id);
    setPasso(1);
  }

  async function validarAntes() {
    setGerando(true);
    setErro("");
    try {
      const v = await apiAnuncios(token, "/validar", {
        method: "POST",
        body: JSON.stringify({ imovel_anuncio_id: imovelId, config: configPayload() }),
      });
      setValidacao(v);
      setPasso(2);
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
    }
  }

  async function gerar() {
    setGerando(true);
    setErro("");
    try {
      const r = await apiAnuncios(token, "/geracoes", {
        method: "POST",
        body: JSON.stringify({ imovel_anuncio_id: imovelId, config: configPayload() }),
      });
      setResultado(r);
      setAba(r.materiais[0]?.canal || "portal");
      setVarianteAtiva("A");
      setVersaoEscolhida(null);
      setPasso(3);
      await carregarImoveis();
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
    }
  }

  async function copiar(texto, material = null) {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    if (material?.id) {
      apiAnuncios(token, "/eventos", {
        method: "POST",
        body: JSON.stringify({ tipo: "copia_copiada", material_id: material.id, geracao_id: resultado?.id }),
      }).catch(() => {});
    }
  }

  async function escolherVersao(material) {
    if (!material?.id) return;
    await apiAnuncios(token, `/materiais/${material.id}/escolher`, { method: "POST" });
    setVersaoEscolhida(material.id);
    apiAnuncios(token, "/desempenho").then(setDesempenho).catch(() => {});
  }

  const canalTemAbordagens = (cid) => ["portal", "instagram", "whatsapp"].includes(cid);
  const variantesDoCanal = resultado?.materiais?.filter((m) => m.canal === aba && m.variante !== "principal") || [];
  const usaAbordagens = canalTemAbordagens(aba) && variantesDoCanal.length > 0;

  const imoveisFiltrados = imoveis.filter((i) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return [i.titulo, i.tipo, i.bairro, i.cidade].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const materialAtivo = usaAbordagens
    ? resultado?.materiais?.find((m) => m.canal === aba && m.variante === varianteAtiva)
    : resultado?.materiais?.find((m) => m.canal === aba && m.variante === "principal")
      || resultado?.materiais?.find((m) => m.canal === aba);

  const passos = ["Cadastrar imóvel", "Configuração", "Validação", "Resultados"];
  const previewFachada = fotoPreview || fotoUrl;

  return (
    <div className={`${ui.contentWrap} space-y-5`}>
      <div className="flex flex-wrap items-center gap-2">
        {passos.map((p, i) => (
          <div key={p} className={`flex items-center gap-2 text-xs font-medium ${i <= passo ? "text-brand-600" : "text-slate-400"}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center ${i <= passo ? "bg-brand-600 text-white" : "bg-slate-100"}`}>{i + 1}</span>
            {p}
            {i < passos.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          </div>
        ))}
      </div>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {passo === 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 ${ui.card} ${ui.cardPad} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={ui.sectionTitle}>Cadastro do imóvel</p>
                <p className={`${ui.sectionDesc} mt-1`}>Cadastre livremente — sem vínculo com avaliações. Use a foto de fachada para gerar descrição e arte promocional.</p>
              </div>
              <button type="button" onClick={novoImovel} className={`${ui.btnSecondary} text-xs flex items-center gap-1`}>
                <Plus className="h-3.5 w-3.5" /> Novo
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nome / referência interna</label>
                <input value={form.titulo} onChange={(e) => setF("titulo", e.target.value)} className={ui.input} placeholder="Ex: Apt Savassi 302" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Título do anúncio (capa da arte)</label>
                <input value={form.titulo_anuncio} onChange={(e) => setF("titulo_anuncio", e.target.value)} className={ui.input} placeholder="Ex: Morar com conforto e praticidade" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                <select value={form.tipo} onChange={(e) => setF("tipo", e.target.value)} className={`${ui.input} cursor-pointer`}>
                  {["Apartamento", "Casa", "Cobertura", "Sala comercial", "Terreno", "Galpão"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Finalidade</label>
                <select value={form.finalidade} onChange={(e) => setF("finalidade", e.target.value)} className={`${ui.input} cursor-pointer`}>
                  <option value="venda">Venda</option>
                  <option value="aluguel">Aluguel</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Preço *</label>
                <input value={form.preco} onChange={(e) => setF("preco", e.target.value)} className={ui.input} placeholder="R$ 780.000" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Bairro *</label><input value={form.bairro} onChange={(e) => setF("bairro", e.target.value)} className={ui.input} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Cidade</label><input value={form.cidade} onChange={(e) => setF("cidade", e.target.value)} className={ui.input} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">UF</label><input value={form.estado} onChange={(e) => setF("estado", e.target.value)} maxLength={2} className={ui.input} /></div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Área (m²)</label><input value={form.area_imovel} onChange={(e) => setF("area_imovel", e.target.value)} className={ui.input} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Quartos</label><input value={form.quartos} onChange={(e) => setF("quartos", e.target.value)} className={ui.input} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Suítes</label><input value={form.suites} onChange={(e) => setF("suites", e.target.value)} className={ui.input} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Vagas</label><input value={form.vagas} onChange={(e) => setF("vagas", e.target.value)} className={ui.input} /></div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Diferenciais</label>
              <textarea value={form.caracteristicas} onChange={(e) => setF("caracteristicas", e.target.value)} rows={2} className={`${ui.input} resize-none`} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição para os textos do anúncio</label>
              <textarea value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} rows={3} className={`${ui.input} resize-none`} placeholder="Preencha manualmente ou use a análise da fachada abaixo." />
            </div>

            <div className="border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Foto de fachada</p>
              <p className="text-[11px] text-slate-500">Usada na arte promocional (fachada + painel lateral com preço, título e CTA) e na análise por IA.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFotoPreview(URL.createObjectURL(f)); setFotoUrl(null); }
              }} />
              <div className="flex flex-wrap gap-3 items-start">
                {previewFachada ? (
                  <img src={previewFachada} alt="Fachada" className="h-40 w-32 object-cover rounded-lg border border-slate-200" />
                ) : (
                  <div className="h-40 w-32 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon className="h-8 w-8" /></div>
                )}
                <div className="space-y-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className={`${ui.btnSecondary} text-xs flex items-center gap-1`}>
                    <Upload className="h-3.5 w-3.5" /> Enviar fachada
                  </button>
                  <button type="button" disabled={analisando || (!previewFachada && !fotoUrl)} onClick={analisarFachada}
                    className={`${ui.btnPrimary} text-xs flex items-center gap-1 disabled:opacity-50`}>
                    {analisando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Analisar fachada com IA
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" disabled={salvando} onClick={salvarImovel} className={`${ui.btnSecondary} disabled:opacity-50`}>
                {salvando ? "Salvando..." : "Salvar imóvel"}
              </button>
              <button type="button" onClick={continuarParaConfig} className={`${ui.btnPrimary} flex items-center gap-1`}>
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={`${ui.card} ${ui.cardPad} space-y-3`}>
            <p className={ui.sectionTitle}>Meus imóveis</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className={`${ui.input} pl-9`} />
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {imoveisFiltrados.map((i) => (
                <button key={i.id} type="button" onClick={() => selecionarImovel(i)}
                  className={`w-full text-left rounded-xl border p-3 flex gap-3 cursor-pointer ${imovelId === i.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}>
                  {i.foto_fachada_url ? (
                    <img src={`${API_BASE}${i.foto_fachada_url}`} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Building2 className="h-5 w-5 text-slate-400" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{i.titulo || i.tipo}{i.bairro ? ` — ${i.bairro}` : ""}</p>
                    <p className="text-[11px] text-slate-400">{i.preco || (i.preco_numero ? formatBRL(i.preco_numero) : "Sem preço")}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {passo === 1 && (
        <div className={`${ui.card} ${ui.cardPad} space-y-5 max-w-3xl`}>
          <p className={ui.sectionTitle}>Configurar geração</p>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Canais</label>
            <div className="flex flex-wrap gap-2">
              {CANAIS.map((c) => (
                <button key={c.id} type="button" onClick={() => setCanais((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])}
                  className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer flex items-center gap-1 ${canais.includes(c.id) ? "bg-brand-50 border-brand-300 text-brand-700" : "border-slate-200 text-slate-500"}`}>
                  <c.icon className="h-3 w-3" /> {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tom</label>
              <select value={tom} onChange={(e) => setTom(e.target.value)} className={`${ui.input} cursor-pointer`}>
                {TONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Comprimento</label>
              <select value={comprimento} onChange={(e) => setComprimento(e.target.value)} className={`${ui.input} cursor-pointer`}>
                <option value="auto">Automático por canal</option>
                <option value="curto">Curto</option>
                <option value="medio">Médio</option>
                <option value="detalhado">Detalhado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-slate-600 mb-1 block">CTA</label><input value={cta} onChange={(e) => setCta(e.target.value)} className={ui.input} /></div>
            <div><label className="text-xs font-medium text-slate-600 mb-1 block">Contato</label><input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="WhatsApp" className={ui.input} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={gerarArtes} onChange={(e) => setGerarArtes(e.target.checked)} className="rounded" />
            Gerar artes promocionais (feed + stories)
          </label>
          {gerarArtes && (
            <label className="flex items-center gap-2 text-sm cursor-pointer ml-6">
              <input type="checkbox" checked={gerarArtesIa} onChange={(e) => setGerarArtesIa(e.target.checked)} className="rounded" />
              Criar artes com IA (Gemini) — layout profissional sobre a foto
            </label>
          )}
          {gerarArtes && (
            <div className="space-y-3 pl-1 border-l-2 border-brand-200 ml-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={exibirLogoArte} onChange={(e) => setExibirLogoArte(e.target.checked)} className="rounded" />
                Exibir logo da imobiliária na arte
              </label>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem na arte (opcional)</label>
                <input
                  value={mensagemArte}
                  onChange={(e) => setMensagemArte(e.target.value)}
                  placeholder="Ex.: 70 m² · 2 quartos · 2 vagas · à venda"
                  className={ui.input}
                />
                <p className="text-[11px] text-slate-400 mt-1">Deixe em branco para usar os dados do imóvel automaticamente.</p>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-brand-800">3 abordagens automáticas</p>
            <p>Portal, Instagram e WhatsApp recebem <strong>3 versões</strong> (direta, benefícios e gancho criativo) para você escolher a melhor.</p>
            <p className="text-slate-500">Artes: feed quadrado + stories vertical — composições distintas, não só redimensionamento.</p>
          </div>
          {canaisSociais && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-brand-600" /> Ideias de hashtags
                </p>
                <div className="flex flex-wrap gap-2">
                  <select value={canalHashtags} onChange={(e) => setCanalHashtags(e.target.value)} className={`${ui.input} text-xs py-1.5 max-w-[140px] cursor-pointer`}>
                    {canais.includes("instagram") && <option value="instagram">Instagram</option>}
                    {canais.includes("facebook") && <option value="facebook">Facebook</option>}
                  </select>
                  <button type="button" disabled={carregandoHashtags || !imovelId} onClick={() => gerarIdeiasHashtags()}
                    className={`${ui.btnSecondary} text-xs py-1.5 flex items-center gap-1 disabled:opacity-50`}>
                    {carregandoHashtags ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Gerar ideias
                  </button>
                </div>
              </div>
              {!imovelId && <p className="text-[11px] text-amber-700">Salve o imóvel no passo anterior para gerar sugestões personalizadas.</p>}
              {hashtagsSugestoes && (
                <>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {hashtagsSugestoes.gerado_por_ia ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Sugestões com IA</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Modo local</span>
                    )}
                    <button type="button" onClick={selecionarHashtagsAlta} className="text-brand-600 hover:underline cursor-pointer">
                      Selecionar as mais relevantes
                    </button>
                    <button type="button" onClick={() => setHashtagsSelecionadas([])} className="text-slate-500 hover:underline cursor-pointer">
                      Limpar seleção
                    </button>
                  </div>
                  {hashtagsSugestoes.categorias.map((cat) => (
                    <div key={cat.id}>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{cat.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.tags.map((t) => {
                          const sel = hashtagsSelecionadas.includes(t.tag);
                          const relCor = t.relevancia === "alta" ? "border-brand-300" : t.relevancia === "media" ? "border-slate-300" : "border-slate-200";
                          return (
                            <button key={t.tag} type="button" title={t.motivo || t.tag} onClick={() => toggleHashtag(t.tag)}
                              className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${sel ? "bg-brand-600 text-white border-brand-600" : `bg-white text-slate-700 ${relCor} hover:border-brand-400`}`}>
                              {t.tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {hashtagsSelecionadas.length > 0 && (
                <div className="rounded-lg border border-brand-200 bg-white p-3">
                  <p className="text-[11px] font-medium text-slate-600 mb-1">
                    {hashtagsSelecionadas.length} selecionada(s) — ideal: 8 a 15 para Instagram
                  </p>
                  <p className="text-xs text-slate-700 break-words">{hashtagsSelecionadas.join(" ")}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setPasso(0)} className={ui.btnSecondary}><ChevronLeft className="h-4 w-4 inline" /> Voltar</button>
            <button type="button" disabled={gerando} onClick={validarAntes} className={`${ui.btnPrimary} disabled:opacity-50`}>Validar e continuar</button>
          </div>
        </div>
      )}

      {passo === 2 && validacao && (
        <div className={`${ui.card} ${ui.cardPad} space-y-4 max-w-2xl`}>
          <p className={ui.sectionTitle}>Validação</p>
          {validacao.campos.map((c, i) => (
            <div key={i} className={`text-xs rounded-lg px-3 py-2 border ${c.nivel === "obrigatorio" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              {c.mensagem}
            </div>
          ))}
          {validacao.alertas.map((a, i) => <div key={i} className="text-xs rounded-lg px-3 py-2 border border-blue-200 bg-blue-50 text-blue-800">{a}</div>)}
          <div className="flex gap-3">
            <button type="button" onClick={() => setPasso(1)} className={ui.btnSecondary}>Voltar</button>
            <button type="button" disabled={!validacao.pode_gerar_textos || gerando} onClick={gerar} className={`${ui.btnPrimary} flex items-center gap-2 disabled:opacity-50`}>
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar anúncios
            </button>
          </div>
        </div>
      )}

      {passo === 3 && resultado && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 ${ui.card} ${ui.cardPad}`}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className={ui.sectionTitle}>Textos gerados</p>
              {resultado.gerado_por_ia ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">IA · {resultado.modelo_ia || "gemini/groq"}</span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Modo local — configure IA no .env</span>
              )}
            </div>
            {resultado.alertas?.length > 0 && (
              <div className="space-y-1 mb-4">
                {resultado.alertas.map((a, i) => (
                  <div key={i} className="text-xs rounded-lg px-3 py-2 border border-amber-200 bg-amber-50 text-amber-900">{a}</div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1 bg-slate-50 rounded-lg p-1 my-4">
              {[...new Set(resultado.materiais.map((m) => m.canal))].map((cid) => {
                const c = CANAIS.find((x) => x.id === cid);
                const Icon = c?.icon || Globe;
                return (
                  <button key={cid} type="button" onClick={() => setAba(cid)}
                    className={`flex items-center gap-1 text-xs font-medium py-2 px-3 rounded-md cursor-pointer ${aba === cid ? "bg-white shadow-sm text-brand-600" : "text-slate-500"}`}>
                    <Icon className="h-3.5 w-3.5" /> {c?.label || cid}
                  </button>
                );
              })}
            </div>
            {usaAbordagens && (
              <div className="flex flex-wrap gap-2 mb-4">
                {ABORDAGENS.map((v) => {
                  const exists = resultado.materiais.some((m) => m.canal === aba && m.variante === v.id);
                  if (!exists) return null;
                  return (
                    <button key={v.id} type="button" onClick={() => setVarianteAtiva(v.id)}
                      className={`text-left rounded-xl border px-3 py-2 cursor-pointer min-w-[140px] ${varianteAtiva === v.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <p className="text-xs font-bold text-slate-800">{v.id} · {v.label}</p>
                      <p className="text-[10px] text-slate-500">{v.desc}</p>
                    </button>
                  );
                })}
              </div>
            )}
            {materialAtivo && (
              <>
                <div className="rounded-lg border bg-slate-50 p-4 min-h-[200px]">
                  {materialAtivo.titulo && (materialAtivo.canal === "portal" || materialAtivo.canal === "patrocinado") && (
                    <p className="font-semibold mb-2">{materialAtivo.titulo}</p>
                  )}
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{editandoId === materialAtivo.id ? textoEdit : materialAtivo.corpo}</pre>
                  {materialAtivo.hashtags && !(editandoId === materialAtivo.id) && !materialAtivo.corpo.includes(materialAtivo.hashtags) && (
                    <p className="mt-3 pt-3 border-t text-sm text-brand-700 font-medium break-words">{materialAtivo.hashtags}</p>
                  )}
                </div>
                {(aba === "instagram" || aba === "facebook") && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> Hashtags</p>
                      <button type="button" disabled={carregandoHashtags} onClick={() => gerarIdeiasHashtags(aba)}
                        className={`${ui.btnSecondary} text-xs py-1.5 flex items-center gap-1 disabled:opacity-50`}>
                        {carregandoHashtags ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Novas ideias
                      </button>
                    </div>
                    {hashtagsSugestoes && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {hashtagsSugestoes.categorias.map((cat) => (
                          <div key={cat.id}>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase">{cat.label}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cat.tags.map((t) => (
                                <button key={t.tag} type="button" title={t.motivo} onClick={() => toggleHashtag(t.tag)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full border cursor-pointer ${hashtagsSelecionadas.includes(t.tag) ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-200 text-slate-600"}`}>
                                  {t.tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {hashtagsSelecionadas.length > 0 && (
                      <>
                        <p className="text-[11px] text-slate-500 break-words">{hashtagsSelecionadas.join(" ")}</p>
                        <button type="button" onClick={aplicarHashtagsNoMaterial} className={`${ui.btnPrimary} text-xs py-2 w-full`}>
                          Aplicar hashtags na legenda
                        </button>
                      </>
                    )}
                    {!hashtagsSugestoes && (
                      <p className="text-[11px] text-slate-400">Clique em &quot;Novas ideias&quot; para ver sugestões e escolher as que fazem sentido.</p>
                    )}
                  </div>
                )}
                {editandoId === materialAtivo.id ? (
                  <textarea value={textoEdit} onChange={(e) => setTextoEdit(e.target.value)} rows={8} className={`${ui.input} mt-3 resize-none`} />
                ) : null}
                <div className="flex flex-wrap gap-2 mt-4">
                  <button type="button" onClick={() => copiar(textoMaterial(materialAtivo), materialAtivo)} className={`${ui.btnPrimary} flex items-center gap-1`}>
                    {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar
                  </button>
                  <button type="button" onClick={() => escolherVersao(materialAtivo)}
                    className={`${versaoEscolhida === materialAtivo.id ? "bg-emerald-600 text-white" : ui.btnSecondary} flex items-center gap-1 text-sm px-3 py-2 rounded-lg cursor-pointer`}>
                    {versaoEscolhida === materialAtivo.id ? <CheckCircle2 className="h-4 w-4" /> : null}
                    Usar esta versão
                  </button>
                  <button type="button" onClick={() => { setEditandoId(materialAtivo.id); setTextoEdit(materialAtivo.corpo); }} className={ui.btnSecondary}><PenLine className="h-4 w-4 inline" /> Editar</button>
                  {editandoId === materialAtivo.id && (
                    <button type="button" onClick={async () => {
                      const u = await apiAnuncios(token, `/materiais/${materialAtivo.id}`, { method: "PATCH", body: JSON.stringify({ corpo: textoEdit }) });
                      setResultado((r) => ({ ...r, materiais: r.materiais.map((m) => m.id === u.id ? u : m) }));
                      setEditandoId(null);
                    }} className={ui.btnPrimary}>Salvar</button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="space-y-4">
            {resultado.artes?.length > 0 && (
              <div className={`${ui.card} ${ui.cardPad} space-y-3`}>
                <p className={ui.sectionTitle}>Artes promocionais</p>
                {resultado.artes.map((a) => (
                  <div key={a.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-slate-500 uppercase">{a.formato}</p>
                      {a.gerado_por_ia ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">IA</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Fallback local</span>
                      )}
                    </div>
                    {a.url && <img src={`${API_BASE}${a.url}`} alt="" className="w-full rounded-lg border" />}
                    {a.url && <a href={`${API_BASE}${a.url}`} download className={`mt-2 block text-center ${ui.btnSecondary} text-xs py-2`}><Download className="h-3.5 w-3.5 inline" /> Baixar</a>}
                  </div>
                ))}
              </div>
            )}
            {desempenho && desempenho.total_eventos > 0 && (
              <div className={`${ui.card} ${ui.cardPad} space-y-2`}>
                <p className={`${ui.sectionTitle} flex items-center gap-1`}><BarChart3 className="h-4 w-4" /> Desempenho</p>
                <p className="text-[11px] text-slate-500">{desempenho.total_geracoes} gerações · {desempenho.total_eventos} interações rastreadas</p>
                {desempenho.canais.map((c) => (
                  <div key={c.canal} className="text-xs border rounded-lg p-2 space-y-1">
                    <p className="font-semibold uppercase text-slate-500">{c.canal}</p>
                    {c.variantes.map((v) => (
                      <div key={v.variante} className="flex justify-between text-slate-600">
                        <span>{v.variante} · {v.estrategia}</span>
                        <span>{v.escolhas} escolhas · {v.copias} cópias · {v.conversas} conv. · {v.visitas} visitas</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className={`${ui.card} ${ui.cardPad}`}>
              <p className={`${ui.sectionTitle} flex items-center gap-1`}><History className="h-4 w-4" /> Histórico</p>
              {historico.map((h) => (
                <button key={h.id} type="button" onClick={async () => { setResultado(await apiAnuncios(token, `/geracoes/${h.id}`)); setPasso(3); }}
                  className="w-full text-left text-xs border rounded-lg p-2 mt-2 hover:bg-slate-50 cursor-pointer">
                  {h.titulo || h.tipo_imovel} — {h.bairro} · {new Date(h.criado_em).toLocaleString("pt-BR")}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setPasso(0); setResultado(null); novoImovel(); }} className={`w-full ${ui.btnSecondary}`}>Nova geração</button>
          </div>
        </div>
      )}
    </div>
  );
}
