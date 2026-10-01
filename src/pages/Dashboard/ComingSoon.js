import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { FaBullhorn, FaLock } from "react-icons/fa";
import { Empty, PageHead } from "../../components/dash/ui";

export function Promotions() {
  const { dash } = useOutletContext() || {};
  return (
    <>
      <PageHead title="Promotions" sub="Highlight your ads so more buyers see them" />
      <Empty icon={<FaBullhorn />} title="Promotions are coming soon" sub={`Featured placement needs a payment provider (e.g. Paystack) to be connected first.${dash?.counts?.active ? ` You have ${dash.counts.active} active ad${dash.counts.active > 1 ? "s" : ""} ready to promote.` : ""}`}>
        <Link className="dx-btn dx-btn-ghost" to="/dashboard/items">Go to my ads</Link>
      </Empty>
    </>
  );
}

export function Escrow() {
  return (
    <>
      <PageHead title="Escrow" sub="Protected payments between buyer and seller" />
      <Empty icon={<FaLock />} title="Escrow is coming soon" sub="Holding buyers' money safely needs a licensed payment partner and a dispute process, so it isn't switched on yet. Until then, always inspect items and pay in person.">
        <Link className="dx-btn dx-btn-ghost" to="/dashboard">Back to dashboard</Link>
      </Empty>
    </>
  );
}
