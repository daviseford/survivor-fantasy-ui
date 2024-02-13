import { NavLink } from "react-router-dom";

export const Logout = () => {
  return (
    <main>
      <section>
        <div>
          <div>
            <h1> Yer logged out, 'arry </h1>
            <p>
              Want to log back in? <NavLink to="/login">Click here</NavLink>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
