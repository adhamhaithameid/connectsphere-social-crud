import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StubPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function StubPage({ title, description, icon }: StubPageProps) {
  const navigate = useNavigate();

  return (
    <>
      <header className="x-main-header">
        <button type="button" className="x-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>{title}</h1>
      </header>
      <div className="x-empty-page">
        {icon}
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </>
  );
}
