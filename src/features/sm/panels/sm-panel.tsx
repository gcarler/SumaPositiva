"use client";

import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import { SMPanelOperativo } from "../components/sm-panel-operativo";

export function SMPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props?: { soloLectura?: boolean };
}) {
  const { closeTop } = usePanels();

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Administración" }, { label: "SM Core" }]}
      kicker="Núcleo Transaccional"
      title="SM Core — Subnúcleo Transaccional"
      subtitle="Supervisión de outbox, adaptadores multicanal y auditoría forense sin PII"
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <SMPanelOperativo soloLectura={props?.soloLectura} />
      </div>
    </PanelShell>
  );
}
