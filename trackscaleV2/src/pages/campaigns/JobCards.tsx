import { useAds } from "../../campaigns/adsStore";
import { jobPhases } from "../../campaigns/plan";
import { Equalizer, Progress } from "../../components/Modal";

const STATUS_LABEL = { running: "Executando", paused: "Pausado", done: "Concluído", cancelled: "Cancelado" };

export function JobCards() {
  const { state, dispatch } = useAds();
  if (state.jobs.length === 0) return null;

  return (
    <div className="jobs">
      {state.jobs.slice(0, 3).map((job) => {
        const phases = jobPhases(job.steps);
        const current = job.steps.find((s) => s.status === "pending");
        return (
          <div key={job.id} className={`card job ${job.status === "running" ? "job--running" : ""}`}>
            <div className="row row--between">
              <span className="row">
                {job.status === "running" && <Equalizer />}
                <strong>{job.input.campaignName}</strong>
                <span className={`badge badge--${job.status}`}>{STATUS_LABEL[job.status]}</span>
              </span>
              <span className="row">
                {job.status === "running" && (
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "setJobStatus", jobId: job.id, status: "paused" })}>Pausar</button>
                )}
                {job.status === "paused" && (
                  <button className="btn btn--sm" onClick={() => dispatch({ type: "setJobStatus", jobId: job.id, status: "running" })}>Retomar</button>
                )}
                {(job.status === "running" || job.status === "paused") && (
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "setJobStatus", jobId: job.id, status: "cancelled" })}>Cancelar</button>
                )}
                {(job.status === "done" || job.status === "cancelled") && (
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "dismissJob", jobId: job.id })}>Ok</button>
                )}
              </span>
            </div>
            {phases.map((p) => (
              <div key={p.label} className="phase">
                <span className="phase__label">{p.label}</span>
                <Progress value={p.value} total={p.total} />
                <span className="muted">{p.value}/{p.total}</span>
              </div>
            ))}
            {job.status === "running" && current && (
              <p className="muted">{current.label}… · roda em segundo plano, você pode recarregar a página.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
