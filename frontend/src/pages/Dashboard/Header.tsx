import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../components/Config/firebaseConfig";

const Header: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-[#2D3748] text-white py-4 px-8 flex justify-between items-center shadow-md">
      <div className="flex items-center">
        <img src="/logocutout.png" alt="Logo" className="h-12 w-12 mr-4" />
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="flex items-center">
        <span className="mr-4">Welcome, John!</span>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
