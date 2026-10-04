import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./Product.css";
import { api } from "../api";
import ProductDisplay from "../components/ProductDisplay";
import RelatedProduct from "../components/RelatedProduct";
import RecentlyViewed from "../components/product/RecentlyViewed";
import { Spinner } from "../components/dash/ui";

// /product/:productId  (numeric listing id or Mongo _id)
// Loads the listing straight from the API so sold listings, owner previews and deep links all work.
const Product = () => {
  const { productId } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    let live = true;
    setState({ loading: true, data: null, error: "" });
    api(`/listings/${encodeURIComponent(productId)}`)
      .then((data) => live && setState({ loading: false, data, error: "" }))
      .catch((e) => live && setState({ loading: false, data: null, error: e.status === 404 ? "notfound" : e.message }));
    return () => { live = false; };
  }, [productId]);

  if (state.loading) return <div style={{ minHeight: "60vh" }}><Spinner /></div>;

  if (!state.data) {
    return (
      <div className="pv-missing">
        <div className="pv-missing-emoji">🔍</div>
        <h1>{state.error === "notfound" ? "This listing isn't available" : "We couldn't load this listing"}</h1>
        <p>{state.error === "notfound" ? "It may have expired, been removed, or the link is wrong." : state.error}</p>
        <Link to="/all" className="pv-btn primary">Browse listings</Link>
      </div>
    );
  }

  const p = state.data.listing;
  return (
    <div>
      <ProductDisplay key={p._id} data={state.data} />
      <div className="pv-below">
        <section className="pv-below-block">
          <h2>Related items</h2>
          <RelatedProduct productId={p._id} />
        </section>
        <RecentlyViewed currentId={p._id} />
      </div>
    </div>
  );
};

export default Product;
