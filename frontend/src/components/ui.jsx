export function Button({ variant = 'primary', className = '', children, ...props }) {
  return <button className={`button button-${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export function Card({ className = '', children, ...props }) {
  return <section className={`surface-card ${className}`.trim()} {...props}>{children}</section>;
}

export function Input({ label, id, className = '', ...props }) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <div className="field"><label htmlFor={inputId}>{label}</label><input id={inputId} className={`input ${className}`.trim()} {...props} /></div>;
}

export function TextArea({ label, id, className = '', ...props }) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <div className="field"><label htmlFor={inputId}>{label}</label><textarea id={inputId} className={`input textarea ${className}`.trim()} {...props} /></div>;
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Alert({ tone = 'info', children, ...props }) {
  return <div className={`alert alert-${tone}`} {...props}>{children}</div>;
}

export function Spinner() {
  return <span className="spinner" aria-label="Memuat" />;
}

export function EmptyState({ title, description }) {
  return <div className="empty-state"><h2>{title}</h2><p>{description}</p></div>;
}
