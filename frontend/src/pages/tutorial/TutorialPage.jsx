import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./TutorialPage.css";

const employeeSteps = [
  {
    title: "Crear un hallazgo",
    description:
      "Desde Hallazgos selecciona Crear Hallazgo, completa sector, subseccion, detalle del problema y adjunta evidencia.",
    actionLabel: "Ir a Crear Hallazgo",
    actionTo: "/hallazgos/crear",
  },
  {
    title: "Revisar el listado y estado",
    description:
      "En Hallazgos podes filtrar por estado, tipo y sector para hacer seguimiento de avances y pendientes.",
    actionLabel: "Ver Hallazgos",
    actionTo: "/hallazgos",
  },
  {
    title: "Entrar al chat del hallazgo",
    description:
      "Abre el detalle de un hallazgo y entra al chat para coordinar acciones, enviar mensajes y adjuntar archivos.",
  },
  {
    title: "Consultar notificaciones",
    description:
      "Usa Notificaciones para ver asignaciones, urgencias y cambios que requieren tu atencion.",
    actionLabel: "Abrir Notificaciones",
    actionTo: "/notificaciones",
  },
];

export default function TutorialPage() {
  const { user } = useAuth();

  return (
    <main className="tutorial-page">
      <header className="tutorial-page__header">
        <p className="tutorial-page__eyebrow">Centro de ayuda</p>
        <h1>Tutorial de funcionalidades</h1>
        <p className="tutorial-page__lead">
          Esta guia explica como usar las funciones principales del sistema para empleados.
          Si sos {user?.tipo || "USUARIO"}, puedes seguir estos pasos para trabajar mas rapido.
        </p>
      </header>

      <section className="tutorial-page__grid" aria-label="Pasos del tutorial para empleados">
        {employeeSteps.map((step, index) => (
          <article key={step.title} className="tutorial-card">
            <div className="tutorial-card__index">{index + 1}</div>
            <div className="tutorial-card__content">
              <h2>{step.title}</h2>
              <p>{step.description}</p>
              {step.actionTo && step.actionLabel && (
                <Link className="tutorial-card__link" to={step.actionTo}>
                  {step.actionLabel}
                </Link>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="tutorial-page__tips" aria-label="Consejos de uso">
        <h3>Consejos rapidos</h3>
        <ul>
          <li>Completa los campos obligatorios para evitar rechazos.</li>
          <li>Usa el chat del hallazgo para dejar trazabilidad de decisiones.</li>
          <li>Revisa notificaciones al inicio y cierre de tu jornada.</li>
        </ul>
      </section>
    </main>
  );
}
