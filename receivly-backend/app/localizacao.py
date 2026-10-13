"""
Consulta de CEP (ViaCEP), geocodificação (Nominatim/OSM) e URL de mapa satélite (Esri).
"""

import math
import re
import urllib.parse

import httpx

from app import schemas

VIACEP_URL = "https://viacep.com.br/ws/{cep}/json/"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
ESRI_EXPORT_URL = (
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export"
)
USER_AGENT = "ReceivlyAI/1.0 (avaliacao-imobiliaria; contato@receivly.ai)"


def _limpar_cep(cep: str) -> str:
    return re.sub(r"\D", "", cep or "")


def _montar_endereco_completo(
    endereco: str | None,
    numero: str | None,
    bairro: str | None,
    cidade: str | None,
    estado: str | None,
    cep: str | None,
) -> str:
    partes = []
    if endereco:
        partes.append(endereco.strip())
        if numero:
            partes[-1] += f", {numero.strip()}"
    if bairro:
        partes.append(bairro.strip())
    if cidade and estado:
        partes.append(f"{cidade.strip()}, {estado.strip()}")
    elif cidade:
        partes.append(cidade.strip())
    if cep:
        partes.append(_limpar_cep(cep))
    partes.append("Brasil")
    return ", ".join(p for p in partes if p)


def distancia_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distância em km (Haversine)."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlng / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def url_mapa_satelite(lat: float, lng: float, largura: int = 800, altura: int = 480, zoom_graus: float = 0.004) -> str:
    """Gera URL de imagem satélite de alta resolução via Esri World Imagery."""
    metade = zoom_graus / 2
    bbox = f"{lng - metade},{lat - metade},{lng + metade},{lat + metade}"
    params = urllib.parse.urlencode(
        {
            "bbox": bbox,
            "bboxSR": "4326",
            "imageSR": "4326",
            "size": f"{largura},{altura}",
            "format": "jpg",
            "f": "image",
        }
    )
    return f"{ESRI_EXPORT_URL}?{params}"


async def consultar_cep(cep: str) -> schemas.CepConsultaResponse:
    cep_limpo = _limpar_cep(cep)
    if len(cep_limpo) != 8:
        raise ValueError("CEP deve conter 8 dígitos.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(VIACEP_URL.format(cep=cep_limpo))
        resp.raise_for_status()
        dados = resp.json()

    if dados.get("erro"):
        raise ValueError("CEP não encontrado.")

    endereco = dados.get("logradouro") or ""
    bairro = dados.get("bairro") or ""
    cidade = dados.get("localidade") or ""
    estado = dados.get("uf") or ""
    cep_formatado = f"{cep_limpo[:5]}-{cep_limpo[5:]}"

    geo = await geocodificar(endereco=endereco, bairro=bairro, cidade=cidade, estado=estado, cep=cep_formatado)

    return schemas.CepConsultaResponse(
        cep=cep_formatado,
        endereco=endereco,
        bairro=bairro,
        cidade=cidade,
        estado=estado,
        complemento=dados.get("complemento") or None,
        latitude=geo.latitude,
        longitude=geo.longitude,
        mapa_satelite_url=geo.mapa_satelite_url,
    )


async def geocodificar(
    endereco: str | None = None,
    numero: str | None = None,
    bairro: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    cep: str | None = None,
) -> schemas.GeocodificacaoResponse:
    query = _montar_endereco_completo(endereco, numero, bairro, cidade, estado, cep)

    async with httpx.AsyncClient(timeout=12.0, headers={"User-Agent": USER_AGENT}) as client:
        resp = await client.get(
            NOMINATIM_URL,
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "br"},
        )
        resp.raise_for_status()
        resultados = resp.json()

    if not resultados:
        return schemas.GeocodificacaoResponse(endereco_formatado=query)

    item = resultados[0]
    lat = float(item["lat"])
    lng = float(item["lon"])

    return schemas.GeocodificacaoResponse(
        latitude=lat,
        longitude=lng,
        endereco_formatado=item.get("display_name"),
        mapa_satelite_url=url_mapa_satelite(lat, lng),
    )
