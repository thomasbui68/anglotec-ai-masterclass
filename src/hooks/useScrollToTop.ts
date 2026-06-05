import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * ScrollToTop — scrolls window to top on every route change.
 * Prevents the next page from loading scrolled halfway down.
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}
