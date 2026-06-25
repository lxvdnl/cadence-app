import { useState } from "react";
import type { CycleSettings } from "../types";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

interface Props {
  cycleNo: number;
  dayNow: number;
  settings: CycleSettings;
  onClose: () => void;
  onSave: (defaultDays: number, thisCycleDays: number) => Promise<void>;
}

export function CycleSettingsModal({
  cycleNo,
  dayNow,
  settings,
  onClose,
  onSave,
}: Props) {
  const effectiveDays = settings.currentCycleDays ?? settings.cycleDays;
  const [days, setDays] = useState(effectiveDays);
  const [applyOnlyThis, setApplyOnlyThis] = useState(settings.currentCycleDays != null);

  const handleSave = () => {
    if (applyOnlyThis) {
      onSave(settings.cycleDays, days);
    } else {
      onSave(days, days);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <h2>{t("cycle.number", { n: String(cycleNo) })}</h2>
        <p className="cycle-settings-day">{t("cycle.day", { d: String(dayNow), n: String(effectiveDays) })}</p>

        <div className="cycle-length-field">
          <div className="cycle-length-field-row">
            <span className="ci-setting-label">{t("cycle.cycleDaysLabel")}</span>
            <div className="cycle-days-ctrl">
              <div className="ci-counter">
                <button className="ci-btn" disabled={days <= 1} onClick={() => setDays((v) => Math.max(1, v - 1))}>−</button>
                <span className="ci-count">{days}</span>
                <button className="ci-btn" onClick={() => setDays((v) => v + 1)}>+</button>
              </div>
              <span className="cycle-days-suffix">{t("cycle.days")}</span>
            </div>
          </div>
          <label className="cycle-only-this-label">
            <span className={`cycle-checkbox${applyOnlyThis ? " checked" : ""}`} onClick={() => setApplyOnlyThis((v) => !v)}>
              {applyOnlyThis && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <polyline points="2,5 4.5,7.5 8,2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span onClick={() => setApplyOnlyThis((v) => !v)}>Apply only to current cycle</span>
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn-primary" onClick={handleSave}>{t("common.save")}</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
