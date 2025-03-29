import React from "react";
import Header from "./Header";
import Prompt from "./Prompt";
import Sites from "./Sites";
import Footer from "./Footer";

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#1A202C] text-white flex flex-col">
      
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 p-4">
        <Prompt />
        <Sites />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Dashboard;
