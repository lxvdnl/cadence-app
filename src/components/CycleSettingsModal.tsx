import { useState } from "react";
import type { CycleSettings } from "../types";
import { t } from "../i18n";

interface Props {
  cycleNo: number;
  dayNow: number;
  settings: CycleSettings;
  onClose: () => void;
  onEndCycle: () => void;
  onSave: (defaultDays: number, thisCycleDays: number) => Promise<void>;
}

export function CycleSettingsModal({
  cycleNo,
  dayNow,
  settings,
  onClose,
  onEndCycle,
  onSave,
}: Props) {
  const effectiveDays = settings.currentCycleDays ?? settings.cycleDays;
  const [defaultDays, setDefaultDays] = useState(settings.cycleDays);
  const [thisCycleDays, setThisCycleDays] = useState(effectiveDays);

  const changed =
    defaultDays !== settings.cycleDays ||
    thisCycleDays !== effectiveDays;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("cycle.number", { n: String(cycleNo) })}</h2>
        <p className="desc-sprint-name">
          {t("cycle.day", { d: String(dayNow), n: String(effectiveDays) })}
        </p>

        <div className="ci-setting-row">
          <span className="ci-setting-label">{t("cycle.cycleDaysLabel")}</span>
          <div className="cycle-days-ctrl">
            <div className="ci-counter">
              <button
                className="ci-btn"
                disabled={defaultDays <= 1}
                onClick={() => setDefaultDays((v) => Math.max(1, v - 1))}
              >
                −
              </button>
              <span className="ci-count">{defaultDays}</span>
              <button className="ci-btn" onClick={() => setDefaultDays((v) => v + 1)}>
                +
              </button>
            </div>
            <span className="cycle-days-suffix">{t("cycle.days")}</span>
          </div>
        </div>

        <div className="ci-setting-row ci-setting-last">
          <span className="ci-setting-label">{t("cycle.thisCycleDaysLabel")}</span>
          <div className="cycle-days-ctrl">
            <div className="ci-counter">
              <button
                className="ci-btn"
                disabled={thisCycleDays <= 1}
                onClick={() => setThisCycleDays((v) => Math.max(1, v - 1))}
              >
                −
              </button>
              <span className="ci-count">{thisCycleDays}</span>
              <button className="ci-btn" onClick={() => setThisCycleDays((v) => v + 1)}>
                +
              </button>
            </div>
            <span className="cycle-days-suffix">{t("cycle.days")}</span>
          </div>
        </div>

        <button className="btn-end-cycle-full" onClick={onEndCycle}>
          {t("cycle.end")}
        </button>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          {changed && (
            <button className="btn-primary" onClick={() => onSave(defaultDays, thisCycleDays)}>
              {t("common.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
