import { Link, useSearchParams } from "react-router-dom";
import "../styles/student.css";

function AlreadyVotedPage() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug");

  return (
    <div className="student-page">
      <div className="student-card">

        <h1 className="student-title">
          Tu as déjà voté
        </h1>

        <p className="student-text">
          Merci pour ton partage 🙂
        </p>

        <div className="student-action">
          {slug && (
            <Link to={`/vote/${slug}`} className="student-button">
              Réessayer
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

export default AlreadyVotedPage;