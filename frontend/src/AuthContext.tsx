import { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (val: boolean) => void;
  profileImageUrl: string | null;
  setProfileImageUrl: (url: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  profileImageUrl: null,
  setProfileImageUrl: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("loggedIn") && localStorage.getItem("email"))
  );

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(
    localStorage.getItem("profileImageUrl")
  );

  useEffect(() => {
    fetch("http://localhost:8080/api/auth/me", {
      credentials: "include",
    })
      .then(res => {
        if (!res.ok) {
          localStorage.clear();
          setIsLoggedIn(false);
          setProfileImageUrl(null);
        } else {
          return res.json();
        }
      })
      .then(data => {
        if (data?.profileImageUrl) {
          setProfileImageUrl(data.profileImageUrl);
          localStorage.setItem("profileImageUrl", data.profileImageUrl);
        }
      })
      .catch(() => {
        localStorage.clear();
        setIsLoggedIn(false);
        setProfileImageUrl(null);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, profileImageUrl, setProfileImageUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}