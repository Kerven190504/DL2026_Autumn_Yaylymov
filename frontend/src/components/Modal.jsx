import { useLanguage } from "../i18n.jsx";

export default function Modal({ title, onClose, children }) {
  const { t } = useLanguage();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <h3 className="modal-card__title">{title}</h3>
          <button type="button" className="modal-card__close" onClick={onClose} aria-label={t("close")}>
            ×
          </button>
        </div>
        <div className="modal-card__body">{children}</div>
      </div>
    </div>
  );
}
