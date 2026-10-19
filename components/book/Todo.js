/** Visible only in development, so a missing business fact is obvious there and invisible in production. */
export default function Todo({ show, children }) {
  if (!show) return null;
  return <span className="todo-marker">TODO: {children}</span>;
}
