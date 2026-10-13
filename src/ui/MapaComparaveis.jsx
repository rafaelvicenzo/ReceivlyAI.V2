import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X } from "lucide-react";
import { ui } from "./theme.js";

const ESRI_SATELITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function iconPin(cor, label, size = 28) {
  const r = size / 2;
  const inner =
    label != null
      ? `<span style="font:700 11px/1 system-ui,sans-serif;color:#fff">${label}</span>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${cor};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [r, r],
  });
}

function MapaLeaflet({
  imovel,
  comparaveis,
  altura = 360,
  comparavelEditando = null,
  posicaoEditando = null,
  onPosicaoEditando = null,
  modoRelatorio = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const editMarkerRef = useRef(null);
  const fitKeyRef = useRef("");
  const onPosRef = useRef(onPosicaoEditando);
  const [mapaPronto, setMapaPronto] = useState(false);
  onPosRef.current = onPosicaoEditando;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || imovel?.latitude == null || imovel?.longitude == null) return;

    const map = L.map(el, {
      zoomControl: !modoRelatorio,
      attributionControl: !modoRelatorio,
      dragging: !modoRelatorio,
      scrollWheelZoom: !modoRelatorio,
      doubleClickZoom: !modoRelatorio,
      touchZoom: !modoRelatorio,
      boxZoom: !modoRelatorio,
      keyboard: !modoRelatorio,
    });

    L.tileLayer(ESRI_SATELITE, {
      maxZoom: 19,
      attribution: modoRelatorio ? "" : "Esri, Maxar, Earthstar Geographics",
    }).addTo(map);

    map.setView([imovel.latitude, imovel.longitude], 17);

    const layer = L.featureGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    setMapaPronto(true);

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);

    requestAnimationFrame(() => map.invalidateSize({ animate: false }));

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      editMarkerRef.current = null;
      fitKeyRef.current = "";
      setMapaPronto(false);
    };
  }, [imovel?.latitude, imovel?.longitude, modoRelatorio]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!mapaPronto || !map || !layer || imovel?.latitude == null || imovel?.longitude == null) return;

    layer.clearLayers();
    editMarkerRef.current = null;

    const coords = [[imovel.latitude, imovel.longitude]];

    L.marker([imovel.latitude, imovel.longitude], {
      icon: iconPin("#2550eb", null, 28),
      interactive: false,
      zIndexOffset: 500,
    }).addTo(layer);

    comparaveis.forEach((c, i) => {
      if (c.latitude == null || c.longitude == null) return;
      if (comparavelEditando?.id === c.id) return;

      L.marker([c.latitude, c.longitude], {
        icon: iconPin("#f59e0b", i + 1, 26),
        interactive: false,
      }).addTo(layer);
      coords.push([c.latitude, c.longitude]);
    });

    if (comparavelEditando && posicaoEditando) {
      const idx = comparaveis.findIndex((c) => c.id === comparavelEditando.id);
      const marker = L.marker([posicaoEditando.lat, posicaoEditando.lng], {
        icon: iconPin("#f59e0b", idx >= 0 ? idx + 1 : "?", 32),
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(layer);

      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        onPosRef.current?.({ lat: ll.lat, lng: ll.lng });
      });

      editMarkerRef.current = marker;
      coords.push([posicaoEditando.lat, posicaoEditando.lng]);
    }

    const fitKey = [
      imovel.latitude,
      imovel.longitude,
      comparavelEditando?.id ?? "view",
      ...comparaveis.map((c) => `${c.id}:${c.latitude}:${c.longitude}`),
    ].join("|");

    if (fitKey !== fitKeyRef.current) {
      fitKeyRef.current = fitKey;
      if (coords.length === 1) {
        map.setView(coords[0], 17);
      } else {
        map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 18 });
      }
    }

    requestAnimationFrame(() => map.invalidateSize({ animate: false }));
  }, [mapaPronto, imovel, comparaveis, comparavelEditando?.id]);

  useEffect(() => {
    const marker = editMarkerRef.current;
    if (!marker || !posicaoEditando) return;
    const ll = marker.getLatLng();
    if (
      Math.abs(ll.lat - posicaoEditando.lat) > 1e-8 ||
      Math.abs(ll.lng - posicaoEditando.lng) > 1e-8
    ) {
      marker.setLatLng([posicaoEditando.lat, posicaoEditando.lng]);
    }
  }, [posicaoEditando?.lat, posicaoEditando?.lng]);

  return (
    <div
      ref={containerRef}
      className={`rounded-lg overflow-hidden border-2 border-black relative z-0 isolate ${modoRelatorio ? "mapa-relatorio" : ""}`}
      style={{ height: altura, width: "100%", minHeight: altura }}
    />
  );
}

export function MapaCroquiComparaveis({ imovel, comparaveis, altura = 360, modoRelatorio = false }) {
  const amostras = comparaveis.filter((c) => c.latitude != null && c.longitude != null);
  const semCoords = comparaveis.filter((c) => c.latitude == null || c.longitude == null);

  if (!imovel?.latitude || !imovel?.longitude) {
    return (
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-500">
        Informe o endereço do imóvel na etapa 1 (com CEP) para carregar o mapa satélite.
      </div>
    );
  }

  if (amostras.length === 0) {
    return (
      <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-lg p-6 text-center text-sm text-amber-800">
        {semCoords.length > 0
          ? `${semCoords.length} comparável(is) sem coordenadas. Clique no ícone de mapa ao lado de cada linha ou use «Localizar amostras no mapa».`
          : "Nenhuma amostra no mapa."}
      </div>
    );
  }

  return (
    <div className="space-y-2 relative z-0">
      {!modoRelatorio && semCoords.length > 0 && (
        <p className="text-[11px] text-amber-700">
          {semCoords.length} comparável(is) sem coordenadas: {semCoords.map((c) => c.endereco).join("; ")}
        </p>
      )}
      <MapaLeaflet
        imovel={imovel}
        comparaveis={comparaveis}
        altura={altura}
        modoRelatorio={modoRelatorio}
      />
    </div>
  );
}

export function ModalAjustePosicaoMapa({
  comparavel,
  indice,
  imovel,
  comparaveis,
  onClose,
  onSalvar,
  salvando,
}) {
  const [pos, setPos] = useState({
    lat: comparavel.latitude ?? imovel.latitude,
    lng: comparavel.longitude ?? imovel.longitude,
  });
  const passo = 0.00005;

  function nudge(dx, dy) {
    setPos((p) => ({
      lat: p.lat + dy * passo,
      lng: p.lng + dx * passo,
    }));
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 pr-3">
            <p className="text-sm font-semibold text-slate-900">Ajustar posição no mapa</p>
            <p className="text-xs text-slate-500 truncate">{comparavel.endereco}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 shrink-0 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <MapaLeaflet
          imovel={imovel}
          comparaveis={comparaveis}
          altura={340}
          comparavelEditando={comparavel}
          posicaoEditando={pos}
          onPosicaoEditando={setPos}
        />

        <p className="text-[11px] text-slate-500 mt-3 mb-2">
          Arraste o marcador {indice} ou use as setas. O ponto azul é o imóvel avaliado.
        </p>
        <div className="flex items-center justify-center gap-1 mb-4">
          <button type="button" onClick={() => nudge(0, 1)} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Norte">↑</button>
          <button type="button" onClick={() => nudge(-1, 0)} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Oeste">←</button>
          <button type="button" onClick={() => nudge(1, 0)} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Leste">→</button>
          <button type="button" onClick={() => nudge(0, -1)} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Sul">↓</button>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className={ui.btnSecondary + " px-4 py-2 text-sm cursor-pointer"}>
            Cancelar
          </button>
          <button
            disabled={salvando}
            onClick={() => onSalvar(pos.lat, pos.lng)}
            className={ui.btnPrimary + " px-4 py-2 text-sm disabled:opacity-50 cursor-pointer"}
          >
            {salvando ? "Salvando..." : "Salvar posição"}
          </button>
        </div>
      </div>
    </div>
  );
}
