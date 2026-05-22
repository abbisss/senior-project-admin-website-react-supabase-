import { createContext, useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../supabase-client";

// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext();

// Cache helpers (full dbUser) 
const cacheKey = "daherni_admin_cache";

function getCachedUser() {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.authId && parsed?.dbUser?.role) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to read cached user from localStorage:", e);
  }
  return null;
}

function setCachedUser(authId, dbUser) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ authId, dbUser }));
  } catch (e) {
    console.error("Failed to write cached user to localStorage:", e);
  }
}

function clearCachedUser() {
  try {
    localStorage.removeItem(cacheKey);
  } catch (e) {
    console.error("Failed to clear cached user from localStorage:", e);
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); 

  const fetchingRef = useRef(false);
  const lastAuthIdRef = useRef(null);

  const fetchDbUser = useCallback(async (authUser) => {
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (!error && data) {
      setDbUser(data);
      const admin = data.role === "admin";
      setIsAdmin(admin);
      setCachedUser(authUser.id, data);
      return { dbUser: data, isAdmin: admin };
    } else {
      setDbUser(null);
      setIsAdmin(false);
      clearCachedUser();
      return { dbUser: null, isAdmin: false };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const handleSession = async (session) => {
      const authUser = session?.user || null;

      if (!authUser) {
        if (!cancelled) {
          setUser(null);
          setDbUser(null);
          setIsAdmin(false);
          setLoading(false);
          lastAuthIdRef.current = null;
          clearCachedUser();
        }
        return;
      }
      if (lastAuthIdRef.current === authUser.id) {
        fetchDbUser(authUser);
        return;
      }

      if (fetchingRef.current && lastAuthIdRef.current === authUser.id) {
        return; 
      }

      fetchingRef.current = true;
      lastAuthIdRef.current = authUser.id;

      if (!cancelled) {
        setUser(authUser);
        setLoading(true);
      }

      await fetchDbUser(authUser);

      if (!cancelled) {
        setLoading(false);
      }

      fetchingRef.current = false;
    };

    const init = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      const cached = getCachedUser();

      if (
        cached &&
        cached.authId === initialSession?.user?.id
      ) {
        setUser(initialSession.user);
        setDbUser(cached.dbUser); 
        setIsAdmin(cached.dbUser.role === "admin");
        setLoading(false);
        lastAuthIdRef.current = initialSession.user.id;

        fetchDbUser(initialSession.user);
      } else {
        await handleSession(initialSession);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchDbUser]);

  return (
    <UserContext.Provider
      value={{ user, dbUser, isAdmin, loading, setDbUser }}
    >
      {children}
    </UserContext.Provider>
  );
}