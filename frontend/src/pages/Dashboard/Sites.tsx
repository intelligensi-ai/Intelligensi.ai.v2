import React, { useState, useEffect } from "react";
import axios from "axios";

interface Site {
  id: number;
  name: string;
  url: string;
  status: string;
}

const Sites: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const { data } = await axios.get("/api/sites"); // Replace with your API
        setSites(data);
      } catch (error) {
        console.error("Failed to fetch sites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  if (loading) {
    return <div>Loading sites...</div>;
  }

  return (
    <div className="bg-[#2D3748] p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Connected Sites</h2>
      {sites.length > 0 ? (
        <ul>
          {sites.map((site) => (
            <li key={site.id} className="p-4 border-b border-gray-700">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{site.name}</h3>
                  <p className="text-gray-400">{site.url}</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    site.status === "active"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {site.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No sites connected yet.</p>
      )}
    </div>
  );
};

export default Sites;
