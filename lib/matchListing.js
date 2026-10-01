// Mirrors the client-side filtering in AllListings.js so saved searches behave the same way.
const norm = (s) => String(s || "").toLowerCase();
const flat = (s) => norm(s).replace(/[-\s]/g, "");

function matchesQuery(p, q = {}) {
  const term = norm(q.q);
  if (term) {
    const hay = [p.title, p.description, p.category, p.city, p.region].map(norm);
    if (!hay.some((h) => h.includes(term))) return false;
  }
  if (q.categories?.length && !q.categories.some((c) => norm(c) === norm(p.category))) return false;
  if (q.regions?.length && !q.regions.some((r) => flat(p.region).includes(flat(r)))) return false;
  if (q.conditions?.length && !q.conditions.some((c) => norm(c) === norm(p.condition))) return false;
  if (q.transactions?.length && !q.transactions.some((t) => norm(t) === norm(p.transaction))) return false;
  if (q.minPrice != null && q.minPrice !== "" && Number(p.price) < Number(q.minPrice)) return false;
  if (q.maxPrice != null && q.maxPrice !== "" && Number(p.price) > Number(q.maxPrice)) return false;
  return true;
}

module.exports = { matchesQuery };
