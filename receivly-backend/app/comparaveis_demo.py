"""Comparáveis fictícios para demonstração — zero chamadas à IA."""

from __future__ import annotations

import hashlib
import math

from app import schemas
from app.config import settings
from app.pesquisa_mercado import PesquisaMeta

_MAX_DEMO = 10
_FATORES_AREA = [0.88, 0.96, 1.04, 0.91, 1.12, 0.93, 1.01, 0.89, 1.08, 0.95]
_VARIACOES_M2 = [0.92, 1.0, 1.08, 0.97, 1.05, 0.94, 1.03, 0.99, 1.06, 0.96]
_IDADES = [8, 15, 22, 12, 18, 25, 10, 20, 14, 17]
_CONSERVACAO = [88, 75, 82, 90, 70, 85, 78, 92, 73, 80]

# Centros aproximados para demo quando o imóvel ainda não tem coordenadas
_CENTROS_BAIRRO: dict[str, tuple[float, float]] = {
    "buritis": (-19.9385, -43.9682),
    "estoril": (-19.9420, -43.9610),
    "savassi": (-19.9320, -43.9375),
    "funcionários": (-19.9355, -43.9290),
    "pampulha": (-19.8510, -43.9710),
    "bandeirantes": (-19.8450, -43.9780),
    "centro": (-19.9167, -43.9340),
    "belvedere": (-19.9740, -43.9380),
    "lourdes": (-19.9280, -43.9420),
}
_CENTRO_PADRAO_BH = (-19.9220, -43.9450)


def _seed(criterios: schemas.PesquisaComparaveisRequest) -> int:
    chave = f"{criterios.bairro}|{criterios.cidade}|{criterios.area_imovel}|{criterios.tipo}"
    return int(hashlib.md5(chave.encode()).hexdigest()[:8], 16)


def _ruas_por_bairro(bairro: str) -> list[str]:
    b = (bairro or "").lower()
    if "savassi" in b or "funcionários" in b:
        return [
            "Rua Antônio de Albuquerque", "Rua Sergipe", "Alameda Ezequiel Dias",
            "Rua Pernambuco", "Rua Matias Cardoso", "Rua Santa Catarina",
            "Rua Rio de Janeiro", "Alameda Barão Homem de Melo", "Rua Paraíba", "Rua Alagoas",
        ]
    if "pampulha" in b or "bandeirantes" in b:
        return [
            "Av. Otacílio Negrão de Lima", "Rua Bernardo Guimarães", "Rua dos Inconfidentes",
            "Av. Abílio Machado", "Rua Marquês de Sabará", "Rua Coronel Teófilo",
            "Rua Professor Moraes", "Av. Fleming", "Rua Itapecerica", "Rua Araguari",
        ]
    if "buritis" in b or "estoril" in b:
        return [
            "Rua Cláudio Manoel", "Rua Desembargador do Vale", "Rua José Cândido da Silveira",
            "Rua Monte Alverne", "Rua Horizonte Azul", "Rua das Acácias",
            "Rua Professor Pedro Aleixo", "Rua Marquês de Paraná", "Rua Rio Grande do Norte", "Rua Maranhão",
        ]
    if "centro" in b:
        return [
            "Rua da Bahia", "Av. Afonso Pena", "Rua Espírito Santo",
            "Rua dos Carijós", "Rua Rio de Janeiro", "Av. Amazonas",
            "Rua Curitiba", "Rua Goiás", "Rua Pará", "Rua Santa Rita",
        ]
    return [
        "Rua das Acácias", "Rua Monte Alverne", "Rua Horizonte Azul",
        "Rua dos Ipês", "Rua Vista Verde", "Rua Bela Vista",
        "Rua São Paulo", "Rua Minas Gerais", "Rua Paraná", "Rua Goiás",
    ]


def _centro_referencia(
    bairro: str,
    lat_ref: float | None,
    lng_ref: float | None,
) -> tuple[float, float]:
    if lat_ref is not None and lng_ref is not None:
        return lat_ref, lng_ref
    b = (bairro or "").lower()
    for chave, coords in _CENTROS_BAIRRO.items():
        if chave in b:
            return coords
    return _CENTRO_PADRAO_BH


def _coordenada_demo(base_lat: float, base_lng: float, seed: int, indice: int) -> tuple[float, float]:
    """Desloca ~300 m a 1,2 km do ponto de referência (determinístico por seed)."""
    angulo = math.radians((seed + indice * 73) % 360)
    dist_km = 0.35 + ((seed + indice * 41) % 85) / 100.0
    dlat = (dist_km / 111.0) * math.cos(angulo)
    dlng = (dist_km / (111.0 * max(0.2, math.cos(math.radians(base_lat))))) * math.sin(angulo)
    return round(base_lat + dlat, 6), round(base_lng + dlng, 6)


def pesquisar_comparaveis_demo(
    criterios: schemas.PesquisaComparaveisRequest,
    *,
    lat_ref: float | None = None,
    lng_ref: float | None = None,
) -> tuple[list[schemas.PesquisaResultadoItem], PesquisaMeta]:
    """Gera até `quantidade` comparáveis plausíveis perto do imóvel avaliado."""
    limite = min(settings.fair_use_max_comparables_per_search, _MAX_DEMO)
    qtd = max(1, min(criterios.quantidade or limite, limite))
    area_ref = float(criterios.area_imovel or 75)
    bairro = criterios.bairro or "Centro"
    cidade = criterios.cidade or "Belo Horizonte"
    estado = criterios.estado or "MG"
    quartos = int(criterios.quartos or 2)
    vagas = int(criterios.vagas or 1)
    tipo = criterios.tipo or "Apartamento"
    seed = _seed(criterios)
    ruas = _ruas_por_bairro(bairro)
    base_lat, base_lng = _centro_referencia(bairro, lat_ref, lng_ref)

    # R$/m² fictício coerente com perfil do bairro
    base_m2 = 6500 + (seed % 2500)
    variacoes = [_VARIACOES_M2[i % len(_VARIACOES_M2)] for i in range(qtd)]
    areas = [round(area_ref * _FATORES_AREA[i % len(_FATORES_AREA)], 1) for i in range(qtd)]
    portais = ["Viva Real", "QuintoAndar", "Zap Imóveis", "OLX", "Imovelweb"]
    padroes = ["normal", "normal", "alto", "normal", "simples"]

    resultados: list[schemas.PesquisaResultadoItem] = []
    for i in range(qtd):
        area = areas[i]
        valor_m2 = base_m2 * variacoes[i]
        valor = round(area * valor_m2, -3)
        numero = 100 + ((seed + i * 17) % 900)
        rua = ruas[i % len(ruas)]
        portal = portais[i % len(portais)]
        slug = f"{tipo.lower().replace(' ', '-')}-{bairro.lower().replace(' ', '-')}-{numero}"
        lat, lng = _coordenada_demo(base_lat, base_lng, seed, i)

        resultados.append(
            schemas.PesquisaResultadoItem(
                endereco=f"{rua}, {numero}",
                bairro=bairro,
                cidade=cidade,
                area=area,
                quartos=quartos + (i % 2) - (1 if i == 2 and quartos > 1 else 0),
                vagas=max(0, vagas + (i - 1)),
                valor=float(valor),
                fonte=portal,
                link=f"https://www.vivareal.com.br/imovel/demo-{slug}",
                descricao_anuncio=(
                    f"{tipo} à venda no {bairro}, {cidade}/{estado}. "
                    f"{area:.0f} m², {quartos} quartos, {vagas} vaga(s). "
                    f"Imóvel bem conservado, pronto para morar. "
                    f"Condomínio com portaria. Próximo a comércio e transporte. "
                    f"Anúncio fictício para demonstração Receivly."
                ),
                padrao_construtivo=padroes[i % len(padroes)],
                idade_anos=float(_IDADES[i % len(_IDADES)]),
                estado_conservacao=float(_CONSERVACAO[i % len(_CONSERVACAO)]),
                testada_m=None,
                latitude=lat,
                longitude=lng,
                gerado_por_ia=False,
            )
        )

    return resultados, PesquisaMeta(
        provedor="demo",
        modelo=None,
        duracao_ms=120,
        erro="Dados fictícios para apresentação — nenhuma busca web foi feita.",
    )
