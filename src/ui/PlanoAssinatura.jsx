import { useEffect, useState } from "react";
import { Check, Copy, CreditCard, Loader2, Sparkles } from "lucide-react";
import { ui } from "./theme.js";

const API_BASE = "http://localhost:8000";

const BENEFICIOS = [
  "25 avaliações imobiliárias por mês incluídas",
  "10 fotos estilizadas por mês (Foto Tours com IA)",
  "Laudos em Word e PDF com seu branding",
  "IA para WhatsApp, anúncios e comparáveis",
  "Mapa satélite com comparáveis georreferenciados",
  "Suporte por e-mail",
];

export function usePlano(token) {
  const [plano, setPlano] = useState(null);
  const [carregando, setCarregando] = useState(true);

  function recarregar() {
    if (!token) return;
    setCarregando(true);
    fetch(`${API_BASE}/pagamentos/plano`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPlano)
      .catch(() => setPlano(null))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    recarregar();
  }, [token]);

  return { plano, carregando, recarregar };
}

export function diasRestantes(plano) {
  if (!plano?.valido_ate) return null;
  const diff = new Date(plano.valido_ate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function PlanoAssinaturaPanel({ token, plano, carregando, onPlanoAtualizado, compacto = false }) {
  const [checkout, setCheckout] = useState(null);
  const [gerandoPix, setGerandoPix] = useState(false);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function gerarPix(endpoint = "/pagamentos/checkout") {
    setGerandoPix(true);
    setErro(null);
    try {
      const resp = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Erro ao gerar cobrança");
      setCheckout(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerandoPix(false);
    }
  }

  async function copiarPix() {
    if (!checkout?.pix_copia_cola) return;
    await navigator.clipboard.writeText(checkout.pix_copia_cola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando plano...
      </div>
    );
  }

  if (!plano) {
    return <p className="text-sm text-red-600">Não foi possível carregar informações do plano.</p>;
  }

  const dias = diasRestantes(plano);
  const ehAdmin = plano.eh_admin || plano.status === "admin";
  const pagoAtivo = ehAdmin || (plano.status === "ativo" && plano.ativo);
  const valorFmt = plano.valor_mensal?.toFixed(2).replace(".", ",") ?? "—";
  const usadas = plano.avaliacoes_usadas_mes ?? 0;
  const limite = plano.avaliacoes_limite_mes ?? 25;
  const creditos = plano.creditos_avaliacao ?? 0;
  const creditoValorFmt = plano.credito_pacote_valor?.toFixed(2).replace(".", ",") ?? "—";
  const limiteAtingido = pagoAtivo && usadas >= limite && creditos === 0;

  if (compacto) {
    return (
      <div className="space-y-2">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${ehAdmin ? "bg-violet-500/20 text-violet-300" : pagoAtivo ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
          {ehAdmin ? "Admin" : pagoAtivo ? "Pro ativo" : "Inativo"}
        </span>
        {ehAdmin && <p className="text-[11px] text-slate-400 leading-snug">Ambiente de demonstração — tudo liberado.</p>}
        {!ehAdmin && pagoAtivo && (
          <p className="text-[11px] text-slate-400 leading-snug">
            {usadas}/{limite} avaliações · {creditos} crédito(s)
          </p>
        )}
        {!ehAdmin && !pagoAtivo && <p className="text-[11px] text-slate-400 leading-snug">Assine para usar o Receivly.</p>}
      </div>
    );
  }

  if (ehAdmin) {
    return (
      <div className={`${ui.card} ${ui.cardPad} border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 to-white max-w-2xl`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">Perfil administrador</p>
            <p className="text-xs text-slate-500">Ambiente controlado para testes e demos</p>
          </div>
        </div>
        <p className="text-sm text-slate-700">
          Seu acesso não depende de assinatura. Plano sempre ativo, sem limite mensal de avaliações e sem cobrança PIX.
        </p>
        <div className="mt-4 rounded-xl bg-white border border-violet-100 p-4 text-xs text-slate-600 space-y-1">
          <p>Avaliações este mês: <strong>{usadas}</strong> (sem teto para admin)</p>
          <p>Clientes reais continuam sujeitos ao plano Pro e aos limites do fair-use.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Coluna esquerda — plano */}
      <div className="lg:col-span-2 space-y-4">
        <div className={`${ui.card} ${ui.cardPad} border-2 border-brand-200 bg-gradient-to-br from-brand-50/80 to-white`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">Receivly Pro</p>
              <p className="text-xs text-slate-500">Plano mensal</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            R$ {valorFmt}
            <span className="text-sm font-normal text-slate-500">/mês</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Pagamento via PIX · confirmação automática</p>

          <ul className="mt-5 space-y-2.5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className={`${ui.card} ${ui.cardPad}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Seu status</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plano.ativo ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {pagoAtivo ? "Plano ativo" : "Plano inativo"}
            </span>
            {plano.valido_ate && (
              <span className="text-xs text-slate-500">
                {plano.ativo ? "Válido até" : "Expirou em"}{" "}
                {new Date(plano.valido_ate).toLocaleDateString("pt-BR")}
                {dias != null && plano.ativo && ` (${dias} dia${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""})`}
              </span>
            )}
          </div>
          {!plano.ativo && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">
              Assine o plano para criar avaliações e usar a IA.
            </p>
          )}
          {pagoAtivo && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Avaliações este mês</span>
                <span className="font-semibold">{usadas} / {limite}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(100, (usadas / limite) * 100)}%` }} />
              </div>
              <p className="text-xs text-slate-500">Créditos extras disponíveis: <strong>{creditos}</strong></p>
              {limiteAtingido && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Limite mensal atingido. Compre um pacote de créditos abaixo.
                </p>
              )}
            </div>
          )}
        </div>

        {pagoAtivo && (
          <div className={`${ui.card} ${ui.cardPad} border border-amber-200 bg-amber-50/50`} id="comprar-creditos">
            <p className="text-sm font-semibold text-slate-900">Créditos extras</p>
            <p className="text-xs text-slate-600 mt-1">
              +{plano.credito_pacote_qtd} avaliações por R$ {creditoValorFmt} quando passar do limite mensal.
            </p>
            {plano.asaas_configurado && (
              <button
                type="button"
                onClick={() => gerarPix("/pagamentos/checkout-creditos")}
                disabled={gerandoPix}
                className={`${ui.btnSecondary} mt-3 px-4 py-2 text-sm disabled:opacity-50 cursor-pointer`}
              >
                {gerandoPix ? "Gerando PIX..." : `Comprar +${plano.credito_pacote_qtd} avaliações — R$ ${creditoValorFmt}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Coluna direita — pagamento */}
      <div className="lg:col-span-3" id="pagar-agora">
        <div className={`${ui.card} ${ui.cardPad} border-2 border-brand-200`}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-brand-600" />
            <p className={ui.sectionTitle}>Pagar assinatura</p>
          </div>
          <p className="text-xs text-slate-500 mb-4">O botão abaixo gera o PIX de R$ {valorFmt}. Após pagar, o plano libera sozinho.</p>

          {!plano.asaas_configurado ? (
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center">
              <p className="text-sm font-medium text-amber-900">Pagamentos em configuração</p>
              <p className="text-xs text-amber-700 mt-2">O administrador precisa configurar a chave Asaas (ASAAS_API_KEY) no servidor.</p>
            </div>
          ) : !checkout ? (
            <div className="text-center py-6 space-y-4">
              {!pagoAtivo ? (
                <>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Clique abaixo para gerar o QR Code PIX. Assim que o pagamento for confirmado, seu plano é liberado automaticamente.
                  </p>
                  <button
                    type="button"
                    onClick={() => gerarPix("/pagamentos/checkout")}
                    disabled={gerandoPix}
                    className={`${ui.btnPrimary} w-full sm:w-auto px-10 py-4 text-base font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20`}
                  >
                    {gerandoPix ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Gerando PIX...</>
                    ) : (
                      <><CreditCard className="h-5 w-5" /> Pagar R$ {valorFmt} com PIX</>
                    )}
                  </button>
                </>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6">
                  <Check className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-emerald-900">Plano ativo — tudo liberado!</p>
                  <p className="text-xs text-emerald-700 mt-1">Obrigado por assinar o Receivly Pro.</p>
                  <button
                    type="button"
                    onClick={() => { onPlanoAtualizado?.(); }}
                    className={`${ui.btnSecondary} mt-4 px-4 py-2 text-sm cursor-pointer`}
                  >
                    Atualizar status
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-center">
                <p className="text-sm font-semibold text-slate-900 mb-1">Pague com PIX</p>
                <p className="text-xs text-slate-500 mb-4">Escaneie o QR Code ou copie o código abaixo</p>
                {checkout.pix_qr_base64 ? (
                  <img
                    src={`data:image/png;base64,${checkout.pix_qr_base64}`}
                    alt="QR Code PIX"
                    className="mx-auto h-52 w-52 rounded-lg border border-white shadow-sm bg-white p-2"
                  />
                ) : (
                  <div className="h-52 flex items-center justify-center text-slate-400 text-sm">QR Code indisponível</div>
                )}
                <p className="text-2xl font-bold text-slate-900 mt-4">R$ {checkout.valor?.toFixed(2).replace(".", ",")}</p>
              </div>

              {checkout.pix_copia_cola && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Pix copia e cola</p>
                  <div className="flex gap-2">
                    <input readOnly value={checkout.pix_copia_cola} className={`${ui.input} text-xs flex-1 font-mono`} />
                    <button
                      type="button"
                      onClick={copiarPix}
                      className={`${ui.btnSecondary} px-3 shrink-0 cursor-pointer flex items-center gap-1`}
                    >
                      {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      {copiado ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}

              {checkout.invoice_url && (
                <a
                  href={checkout.invoice_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-sm text-brand-600 hover:underline"
                >
                  Abrir fatura completa no Asaas →
                </a>
              )}

              <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 text-xs text-brand-800">
                Após pagar, aguarde alguns segundos e clique em <strong>“Já paguei — verificar”</strong>. A confirmação também chega automaticamente via webhook.
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { onPlanoAtualizado?.(); setCheckout(null); }}
                  className={`${ui.btnPrimary} px-4 py-2 text-sm cursor-pointer`}
                >
                  Já paguei — verificar
                </button>
                <button
                  type="button"
                  onClick={() => gerarPix(checkout.tipo === "creditos" ? "/pagamentos/checkout-creditos" : "/pagamentos/checkout")}
                  disabled={gerandoPix}
                  className={`${ui.btnSecondary} px-4 py-2 text-sm disabled:opacity-50 cursor-pointer`}
                >
                  Gerar novo PIX
                </button>
              </div>
            </div>
          )}

          {erro && <p className="text-xs text-red-600 mt-3">{erro}</p>}
        </div>
      </div>
    </div>
  );
}

export function AssinaturaScreen({ token }) {
  const { plano, carregando, recarregar } = usePlano(token);
  const precisaPagar = plano && !plano.eh_admin && !(plano.status === "ativo" && plano.ativo);

  return (
    <div className={`${ui.contentWrap} max-w-5xl`}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ui.sectionKicker}>Conta</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Assinatura</h2>
          <p className={ui.sectionDesc}>Plano mensal R$ 249,00 · pagamento via PIX na seção abaixo.</p>
        </div>
        {precisaPagar && plano?.asaas_configurado && (
          <a href="#pagar-agora" className={`${ui.btnPrimary} px-6 py-3 text-sm shrink-0 cursor-pointer inline-flex items-center gap-2`}>
            <CreditCard className="h-4 w-4" /> Ir para pagamento
          </a>
        )}
      </div>
      <PlanoAssinaturaPanel token={token} plano={plano} carregando={carregando} onPlanoAtualizado={recarregar} />
    </div>
  );
}

export function BannerAssinatura({ plano, onAssinar }) {
  if (!plano || plano.eh_admin || plano.status === "admin") return null;
  const pagoAtivo = plano.status === "ativo" && plano.ativo;
  const usadas = plano.avaliacoes_usadas_mes ?? 0;
  const limite = plano.avaliacoes_limite_mes ?? 25;
  const creditos = plano.creditos_avaliacao ?? 0;
  const limiteAtingido = pagoAtivo && usadas >= limite && creditos === 0;

  if (pagoAtivo && !limiteAtingido) return null;

  if (!pagoAtivo) {
    return (
      <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Plano inativo</p>
          <p className="text-xs text-slate-600 mt-0.5">Assine o Receivly Pro por R$ {plano.valor_mensal?.toFixed(2).replace(".", ",")}/mês via PIX.</p>
        </div>
        <button type="button" onClick={onAssinar} className={`${ui.btnPrimary} px-4 py-2 text-sm shrink-0 cursor-pointer`}>
          Assinar agora
        </button>
      </div>
    );
  }

  return (
    <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Limite mensal de avaliações atingido</p>
        <p className="text-xs text-slate-600 mt-0.5">
          Você usou {usadas}/{limite} avaliações. Compre +{plano.credito_pacote_qtd} créditos por R$ {plano.credito_pacote_valor?.toFixed(2).replace(".", ",")}.
        </p>
      </div>
      <button type="button" onClick={onAssinar} className={`${ui.btnPrimary} px-4 py-2 text-sm shrink-0 cursor-pointer`}>
        Comprar créditos
      </button>
    </div>
  );
}
