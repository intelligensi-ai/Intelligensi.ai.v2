// src/components/AppHeader.tsx
interface AppHeaderProps {
    title?: string;
  }
  
  export const AppHeader: React.FC<AppHeaderProps> = ({ title = "Dashboard" }) => (
    <header className="bg-[#2D3748] p-4 shadow-md">
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  );