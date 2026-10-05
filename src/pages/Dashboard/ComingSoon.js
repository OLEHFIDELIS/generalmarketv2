import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { FaBullhorn } from "react-icons/fa";
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
