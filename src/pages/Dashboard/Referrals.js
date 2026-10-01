import React, { useEffect, useState } from "react";
import { FaCopy, FaGift, FaWhatsapp } from "react-icons/fa";
import { api, dateShort } from "../../api";
import { Alert, Empty, PageHead, Spinner } from "../../components/dash/ui";

export default function Referrals() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { api("/me/referrals").then(setD).catch((e) => { setErr(e.message); setD({ referred: [] }); }); }, []);
  if (!d) return <Spinner />;

  const link = d.code ? `${window.location.origin}/#/login?ref=${d.code}` : "";
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copy your link:", link); } };

  return (
    <>
      <PageHead title="My referrals" sub="Invite friends to buy and sell on GeneralMarket" />
      <Alert>{err}</Alert>
      {d.code && (
        <div className="dx-panel">
          <h3>Your invite link</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="dx-input" readOnly value={link} style={{ flex: 1, minWidth: 220 }} onFocus={(e) => e.target.select()} />
            <button className="dx-btn dx-btn-primary" onClick={copy}><FaCopy /> {copied ? "Copied!" : "Copy"}</button>
            <a className="dx-btn dx-btn-ghost" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent("Buy and sell on GeneralMarket: " + link)}`}><FaWhatsapp /> Share</a>
          </div>
          <p className="dx-hint" style={{ marginTop: 10 }}>Code: <strong>{d.code}</strong> · {d.total} friend{d.total === 1 ? "" : "s"} joined with your link</p>
        </div>
      )}
      {d.referred.length === 0 ? <Empty icon={<FaGift />} title="No referrals yet" sub="Share your link — people who sign up with it will be listed here." /> : (
        <div className="dx-rows">{d.referred.map((r, i) => (
          <div className="dx-row" key={i}><div className="dx-row-main"><div className="dx-row-title">{r.name}</div><div className="dx-row-meta">Joined {dateShort(r.joinedAt)}</div></div></div>
        ))}</div>
      )}
    </>
  );
}
