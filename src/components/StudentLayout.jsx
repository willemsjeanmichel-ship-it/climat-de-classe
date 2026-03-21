import "../../styles/student.css";

function StudentLayout({ children }) {
  return (
    <div className="student-page">
      <div className="student-card">
        {children}
      </div>
    </div>
  );
}

export default StudentLayout;