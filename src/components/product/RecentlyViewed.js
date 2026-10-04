import React, { useEffect, useState } from "react";
import Item from "../Item";

const KEY = "gm-recent";
const MAX = 12;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

// Remember a listing the visitor opened (newest first, de-duplicated)
export function rememberViewed(p) {
  if (!p?._id) return;
  try {
    const entry = { _id: p._id, id: p.id, title: p.title, image: p.images?.[0] || "", price: p.price, priceType: p.priceType, place: p.city || p.region || "" };
    localStorage.setItem(KEY, JSON.stringify([entry, ...read().filter((x) => x._id !== p._id)].slice(0, MAX)));
  } catch { /* storage blocked / full */ }
}

export default function RecentlyViewed({ currentId }) {
  const [items, setItems] = useState([]);
  useEffect(() => { setItems(read().filter((x) => x._id !== currentId)); }, [currentId]);
  if (!items.length) return null;
  return (
    <section className="pv-below-block">
      <h2>Recently viewed</h2>
      <div className="pv-recent">
        {items.map((x) => <Item key={x._id} _id={x._id} id={x.id} name={x.title} images={x.image ? [x.image] : []} new_price={x.price} priceType={x.priceType} address={x.place} />)}
      </div>
    </section>
  );
}
