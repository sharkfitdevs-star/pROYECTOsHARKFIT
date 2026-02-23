import { useAuth } from "../../context/AuthContext";

function Account() {
  const { user } = useAuth();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Mi cuenta</h1>
      {user && user.email && (
        <p>Email: <strong>{user.email}</strong></p>
      )}
    </div>
  );
}

export default Account;
