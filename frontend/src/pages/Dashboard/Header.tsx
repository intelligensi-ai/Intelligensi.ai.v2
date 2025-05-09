import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../components/Config/firebaseConfig";

// ✅ Interface for user data
interface UserData {
  display_name: string;
  email: string;
  is_active: boolean;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const fetchUserProfile = async () => {
    if (!auth.currentUser?.email) return;

    setLoading(true);
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
        setLoading(false);
        return;
      }
      const response = await fetch(
        `${apiBaseUrl}/fetchuser?email=${auth.currentUser.email}`
      );
      const data = await response.json();
      if (data.success) {
        setUserData(data.data);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDrawer = () => {
    if (!isDrawerOpen) {
      fetchUserProfile();
    }
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <>
      {/* ✅ Header */}
      <header className="bg-[#2D3748] text-white py-4 px-8 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <img src="/logocutout.png" alt="Logo" className="h-12 w-12 mr-4" />
          <h1 className="text-2xl">Intelligensi.ai</h1>
        </div>

        <div className="flex items-center space-x-4">
       
          <div className="flex-1 flex justify-end items-center space-x-4">
          <button
            onClick={toggleDrawer}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center"
            aria-label="User profile"
          >
            {/* User Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
            Logout
          </button>
        </div>
        </div>
      </header>

      {/* ✅ Profile Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[#1E293B] shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold items-center text-center w-full">
              {userData?.display_name || "Guest"}
            </h2>
            <button
              onClick={toggleDrawer}
              className="p-1 rounded-full hover:bg-gray-700"
            >
             {/* <p>:-)</p> */}
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : userData ? (
            <div className="flex-1">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mb-4">
                          {/* Avatar Icon - will be replaced by uploaded image */}
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-12 w-12 text-teal-500" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={1.5} 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                            />
                          </svg>
                        </div>
                </div>
                <h3 className="text-lg font-semibold">
                  {userData.display_name}
                </h3>
                <p className="text-gray-400">{userData.email}</p>
                <span
                  className={`mt-2 px-3 py-1 rounded-full text-xs ${
                    userData.is_active
                      ? "bg-green-500/20 text-teal-500"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {userData.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p>Failed to load user data</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleDrawer}
        ></div>
      )}
    </>
  );
};

export default Header;
