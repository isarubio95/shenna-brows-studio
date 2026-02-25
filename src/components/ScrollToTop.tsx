import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Al cambiar de ruta, lleva el scroll al inicio de la página de golpe (sin animación).
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
