import { Link } from "react-router-dom";
export function NotFoundPage() {
  return <section className="card"><h1>Page not found</h1><p className="muted">This page doesn't exist.</p><Link className="button" to="/">Back home</Link></section>;
}
