"""Testes do gerador de anúncios (módulo independente)."""

import unittest
from unittest.mock import MagicMock

from app import schemas
from app.anuncios_validacao import validar_pre_geracao, dados_imovel_de_anuncio
from app import ia_anuncios
from app.ia_anuncios import normalizar_hashtag, sugerir_hashtags_localmente


def _imovel_mock(**kwargs):
    m = MagicMock()
    m.tipo = kwargs.get("tipo", "Apartamento")
    m.finalidade = kwargs.get("finalidade", "venda")
    m.bairro = kwargs.get("bairro", "Savassi")
    m.cidade = kwargs.get("cidade", "Belo Horizonte")
    m.preco = kwargs.get("preco", "R$ 780.000")
    m.preco_numero = kwargs.get("preco_numero", 780000.0)
    m.area_imovel = kwargs.get("area_imovel", 70.0)
    m.quartos = kwargs.get("quartos", 2)
    m.suites = kwargs.get("suites", None)
    m.caracteristicas = kwargs.get("caracteristicas", "Sacada")
    m.descricao = kwargs.get("descricao", "Apartamento bem localizado")
    m.titulo_anuncio = kwargs.get("titulo_anuncio", "Seu novo lar")
    m.foto_fachada_caminho = kwargs.get("foto_fachada_caminho", "imoveis_anuncio/1/1/f.jpg")
    return m


class TestAnunciosValidacao(unittest.TestCase):
    def test_obrigatorios_ausentes(self):
        m = _imovel_mock(bairro="", cidade="", preco="", preco_numero=None)
        r = validar_pre_geracao(m)
        self.assertFalse(r.pode_gerar_textos)

    def test_sem_fachada_bloqueia_só_artes(self):
        m = _imovel_mock(foto_fachada_caminho=None)
        r = validar_pre_geracao(m, gerar_artes=True)
        self.assertTrue(r.pode_gerar_textos)
        self.assertFalse(r.pode_gerar_artes)

    def test_dados_imovel(self):
        d = dados_imovel_de_anuncio(_imovel_mock())
        self.assertEqual(d["tipo_imovel"], "Apartamento")


class TestIaAnuncios(unittest.TestCase):
    def test_fallback_local(self):
        config = schemas.AnuncioGeracaoConfig(canais=["portal", "whatsapp"])
        dados = dados_imovel_de_anuncio(_imovel_mock())
        dados["preco"] = "R$ 500.000"
        resp = ia_anuncios.gerar_textos_localmente(config, dados)
        self.assertGreaterEqual(len(resp.materiais), 2)

    def test_tres_abordagens(self):
        config = schemas.AnuncioGeracaoConfig(canais=["portal", "instagram", "whatsapp"])
        dados = dados_imovel_de_anuncio(_imovel_mock())
        dados["preco"] = "R$ 500.000"
        resp = ia_anuncios.gerar_textos_localmente(config, dados)
        for canal in ("portal", "instagram", "whatsapp"):
            vars_c = [m for m in resp.materiais if m.canal == canal]
            self.assertEqual(len(vars_c), 3, canal)
            self.assertEqual({m.variante for m in vars_c}, {"A", "B", "C"})

    def test_normalizar_hashtag(self):
        self.assertEqual(normalizar_hashtag("Jardim Leblon"), "#jardimleblon")
        self.assertEqual(normalizar_hashtag("#Imoveis"), "#imoveis")

    def test_sugerir_hashtags_local(self):
        dados = dados_imovel_de_anuncio(_imovel_mock())
        resp = sugerir_hashtags_localmente(dados, "instagram")
        self.assertGreaterEqual(len(resp.categorias), 3)
        tags = [t.tag for c in resp.categorias for t in c.tags]
        self.assertTrue(any("savassi" in t for t in tags))
        self.assertTrue(all(t.startswith("#") for t in tags))

    def test_hashtags_selecionadas_no_material(self):
        config = schemas.AnuncioGeracaoConfig(
            canais=["instagram"],
            hashtags_selecionadas=["#teste", "#savassi"],
        )
        dados = dados_imovel_de_anuncio(_imovel_mock())
        dados["preco"] = "R$ 500.000"
        resp = ia_anuncios.gerar_textos_localmente(config, dados)
        ig = next(m for m in resp.materiais if m.canal == "instagram")
        self.assertIn("#teste", ig.hashtags or "")
        self.assertIn("#teste", ig.corpo)


if __name__ == "__main__":
    unittest.main()
