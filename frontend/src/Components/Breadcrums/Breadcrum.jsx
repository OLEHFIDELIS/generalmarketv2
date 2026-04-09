import React from "react";
import "./Breadcrum.css";
import arrow_icon from "../Assets/breadcrum_arrow.png";

const Breadcrum = ({ product }) => {
  return (
    <div className="breadcrum">
      Home <img src={arrow_icon} alt="" /> 
      Shop <img src={arrow_icon} alt="" /> 
      {product?.category} <img src={arrow_icon} alt="" /> 
      {product?.title}
    </div>
  );
};

export default Breadcrum;