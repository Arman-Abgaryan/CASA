import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "./axiosConfig";

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

    if (!isLoggedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
        });
        if (cancelled) return;

        if (res.status === 401) {
          // Definitive: the server says this session is not valid.
          localStorage.clear();
          setIsLoggedIn(false);
          setProfileImageUrl(null);
          return;
        }

        if (!res.ok) {
          console.warn(`/api/auth/me returned ${res.status}; keeping local auth state.`);
          return;
        }

        const data = await res.json();
        if (!cancelled && data?.profileImageUrl) {
          setProfileImageUrl(data.profileImageUrl);
          localStorage.setItem("profileImageUrl", data.profileImageUrl);
        }
      } catch (err) {

        console.warn("/api/auth/me failed; keeping local auth state.", err);
      }
    })();

    return () => {
      cancelled = true;
    };

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
