const tipoLabel = {
  NO_CONFORMIDAD: "No Conformidad",
  OPORTUNIDAD_MEJORA: "Oportunidad de Mejora",
  QUEJA_CLIENTE: "Queja de Cliente",
};

const estadoLabel = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  CERRADO: "Cerrado",
};

const estadoAccionLabel = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  SOLICITUD_CIERRE: "Solicitud de cierre",
  CERRADA: "Cerrada",
};

const tipoAccionLabel = {
  INMEDIATA: "Inmediata",
  CORRECTIVA: "Correctiva",
  VERIFICACION_EFICACIA: "Verificacion de Eficacia",
};

function normalizeText(value) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return normalizeText(value);
  return parsed.toLocaleString("es-AR");
}

function safeHtml(value) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br />");
}

function keyValueRow(key, value) {
  return `<tr><th>${safeHtml(key)}</th><td>${safeHtml(value)}</td></tr>`;
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function keyValueRowIfPresent(key, value) {
  if (!hasValue(value)) return "";
  return keyValueRow(key, value);
}

function buildHtml({ hallazgo, porques, solicitudes, historial }) {
  const responsables = Array.isArray(hallazgo?.responsables)
    ? hallazgo.responsables.map((r) => `${r.nombre || ""} ${r.apellido || ""}`.trim()).filter(Boolean).join(", ")
    : "-";

  const accionesHtml = Array.isArray(hallazgo?.acciones) && hallazgo.acciones.length
    ? hallazgo.acciones
      .map((accion, idx) => `
        <article class="card">
          <h4>${safeHtml(tipoAccionLabel[accion?.tipo] || accion?.tipo || `Accion ${idx + 1}`)}</h4>
          <table>
            ${keyValueRow("Estado", estadoAccionLabel[accion?.estado] || accion?.estado)}
            ${keyValueRow("Descripcion", accion?.descripcion)}
            ${keyValueRow("Fecha inicio", formatDate(accion?.fecha_inicio))}
            ${keyValueRow("Fecha fin", formatDate(accion?.fecha_fin))}
          </table>
        </article>
      `)
      .join("")
    : `<p class="muted">No hay acciones registradas.</p>`;

  const porquesHtml = Array.isArray(porques) && porques.length
    ? porques
      .map((p, idx) => `
        <article class="card">
          <h4>Porque ${idx + 1}</h4>
          <table>
            ${keyValueRow("Causa", p?.texto_causa)}
          </table>
        </article>
      `)
      .join("")
    : `<p class="muted">No hay porques registrados.</p>`;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Informe Hallazgo #${safeHtml(hallazgo?.id)}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.45; }
          h1 { margin: 0 0 8px; font-size: 20px; }
          h2 { margin: 22px 0 8px; font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          h4 { margin: 0 0 7px; font-size: 13px; color: #1e3a8a; }
          .meta { color: #334155; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          th, td { text-align: left; vertical-align: top; border: 1px solid #e2e8f0; padding: 6px; }
          th { width: 28%; background: #f8fafc; }
          .card { margin-bottom: 10px; page-break-inside: avoid; }
          .muted { color: #64748b; }
          .note { margin-top: 14px; font-style: italic; color: #475569; }
        </style>
      </head>
      <body>
        <h1>Informe Integral Hallazgo #${safeHtml(hallazgo?.id)}</h1>
        <div class="meta">Generado: ${safeHtml(new Date().toLocaleString("es-AR"))}</div>

        <h2>1. Datos generales del hallazgo</h2>
        <table>
          ${keyValueRow("ID", hallazgo?.id)}
          ${keyValueRow("Tipo", tipoLabel[hallazgo?.tipo] || hallazgo?.tipo)}
          ${keyValueRow("Estado", estadoLabel[hallazgo?.estado] || hallazgo?.estado)}
          ${keyValueRowIfPresent("Fecha de creacion", hallazgo?.fecha_creacion ? formatDate(hallazgo?.fecha_creacion) : "")}
          ${keyValueRow("Descripcion", hallazgo?.descripcion)}
          ${keyValueRow("Ubicacion", hallazgo?.ubicacion)}
          ${keyValueRowIfPresent("Sector", hallazgo?.sector?.nombre)}
          ${keyValueRowIfPresent("Subseccion", hallazgo?.subseccion?.nombre)}
          ${keyValueRowIfPresent("Tipo catalogo", hallazgo?.tipo_catalogo?.nombre)}
          ${keyValueRowIfPresent("Responsables", responsables)}
          ${keyValueRowIfPresent("Cliente asociado", hallazgo?.cliente_asociado ? `${hallazgo?.cliente_asociado?.nombre || ""} ${hallazgo?.cliente_asociado?.apellido || ""}`.trim() : "")}
          ${keyValueRowIfPresent("Empresa externa", hallazgo?.contacto_externo?.nombre_empresa)}
          ${keyValueRowIfPresent("Telefono externo", hallazgo?.contacto_externo?.telefono)}
          ${keyValueRowIfPresent("Email externo", hallazgo?.contacto_externo?.email)}
        </table>

        <h2>2. Acciones del hallazgo</h2>
        ${accionesHtml}

        <h2>3. Analisis de 5 porques</h2>
        ${porquesHtml}

        <p class="note">Nota: Este informe excluye archivos adjuntos y todo contenido de archivos.</p>
      </body>
    </html>
  `;
}

export function exportHallazgoCompletoPdf({ hallazgo, porques = [], solicitudes = [], historial = [] }) {
  const html = buildHtml({ hallazgo, porques, solicitudes, historial });

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const cleanup = () => {
    window.setTimeout(() => {
      if (frame.parentNode) {
        frame.parentNode.removeChild(frame);
      }
    }, 300);
  };

  frame.onload = () => {
    const frameWindow = frame.contentWindow;
    if (!frameWindow) {
      cleanup();
      throw new Error("No se pudo inicializar el visor para imprimir el PDF.");
    }

    frameWindow.onafterprint = cleanup;
    frameWindow.focus();
    frameWindow.print();
  };

  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc) {
    cleanup();
    throw new Error("No se pudo generar el documento para exportar PDF.");
  }

  doc.open();
  doc.write(html);
  doc.close();
}
