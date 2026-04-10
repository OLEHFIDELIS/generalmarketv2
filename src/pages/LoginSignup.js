import React, { useState } from "react";
import "./LoginSignup.css";

const LoginSignup = ()=> {

    const [state, setState] = useState("Login");
    const [formData, setFormData] = useState({
        name: "",
        password:"",
        email:""
    });
    const changeHandler = (e)=>{
        setFormData({...formData,[e.target.name]: e.target.value});
    }

    const login = async()=> {
        console.log("Login Executed", formData);
        let responseData;
        await fetch("/api/login",{
            method:"POST",
            headers: {
                Accept: "application/form-data",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        }).then((response)=> response.json()).then((data)=>responseData = data)
        if(responseData.success){
            localStorage.setItem("auth-token", responseData.token);
            window.location.replace("/")
        }else{
            alert(responseData.errors)
            window.location.replace("/")
        }

    };

    const signup = async()=> {
        console.log("Sign Up Executed", formData);
        let responseData;
        await fetch("/api/signup",{
            method:"POST",
            headers: {
                Accept: "application/form-data",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        }).then((response)=> response.json()).then((data)=>responseData = data)
        if(responseData.success){
            localStorage.setItem("auth-token", responseData.token);
            window.location.replace("/")
        }else{
            alert(responseData.errors)
            window.location.replace("/")
        }
    };

    return(
        <div className="loginsignup">
            <div className="loginsignup-container">
                <h1>{state}</h1>
                <div className="loginsignup-fields">
                    {state === "Sign Up"? <input type="text" name="name" value={formData.name} onChange={changeHandler} id="name" placeholder="Your Name" />:<></>}
                    <input type="email" name="email" value={formData.email} onChange={changeHandler} id="email" placeholder="Email Address" />
                    <input type="password" name="password" value={formData.password} onChange={changeHandler}  placeholder="Password" />
                </div>
                <button onClick={()=> {state === "Login"?login():signup()}}>Continue</button>
                {state === "Sign Up"? <p className="loginsignup-login">Already have an account? <span onClick={()=>{setState("Login")}}>Login</span></p>: 
                <p className="loginsignup-login">Create an account? <span onClick={()=>{setState("Sign Up")}}>Click here</span></p>
                }

                <div className="loginsignup-agree">
                    <input type="checkbox" name="" id="" />
                    <p>By continuing, i agree to the terms of use & privacy.</p>
                </div>
            </div>
        </div>
    )
}

export default LoginSignup;